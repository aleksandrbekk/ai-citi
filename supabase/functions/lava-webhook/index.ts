import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Multi-currency supported packages configuration
const PACKAGES: Record<string, { coins: number; prices: { RUB: number; USD: number; EUR: number } }> = {
  light: {
    coins: 30,
    prices: { RUB: 290, USD: 3, EUR: 3 }
  },
  starter: {
    coins: 100,
    prices: { RUB: 890, USD: 9, EUR: 9 }
  },
  standard: {
    coins: 300,
    prices: { RUB: 2490, USD: 25, EUR: 24 }
  },
  pro: {
    coins: 500,
    prices: { RUB: 3990, USD: 40, EUR: 38 }
  },
  business: {
    coins: 1000,
    prices: { RUB: 7500, USD: 75, EUR: 70 }
  },
}

// Subscriptions — количество нейронов должно соответствовать UI в Shop.tsx!
const SUBSCRIPTIONS: Record<string, { neurons: number; prices: { RUB: number; USD: number; EUR: number } }> = {
  pro: {
    neurons: 150,  // PRO: +150 нейронов/мес
    prices: { RUB: 2900, USD: 29, EUR: 27 }
  },
  business: {
    neurons: 600,  // ELITE/Business: +600 нейронов/мес
    prices: { RUB: 9900, USD: 99, EUR: 95 }
  },
  // Legacy support for logic mapping
  elite: {
    neurons: 600,  // ELITE: +600 нейронов/мес
    prices: { RUB: 9900, USD: 99, EUR: 95 }
  }
}

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const ADMIN_CHAT_IDS = [190202791, 643763835]

// Отправка уведомления рефереру через Telegram бот
async function sendUserNotification(chatId: number, text: string) {
  if (!BOT_TOKEN) return
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
  } catch (e) {
    console.error('Failed to send user notification:', e)
  }
}

async function sendAdminNotification(message: string) {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not set, cannot send admin notification')
    return
  }
  for (const chatId of ADMIN_CHAT_IDS) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })
      console.log(`Notification to ${chatId}:`, await res.json())
    } catch (e) {
      console.error(`Failed to notify ${chatId}:`, e)
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    console.log('=== Lava.top Webhook Received ===')
    console.log('Full payload:', JSON.stringify(body, null, 2))

    // Lava.top events:
    // - payment.success — разовый платёж
    // - subscription.created / subscription.success — первая оплата подписки
    // - subscription.recurring.payment.success — повторный платёж подписки
    // - subscription.cancelled — отмена подписки
    const eventType = body.eventType || body.event_type || ''
    const status = body.status || ''

    console.log('eventType:', eventType, 'status:', status)

    // Создание Supabase клиента
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Ищем telegram_id в разных местах
    let telegramIdStr = null
    if (body.clientUtm?.utm_content) {
      telegramIdStr = body.clientUtm.utm_content
    } else if (body.clientUtm?.utmContent) {
      telegramIdStr = body.clientUtm.utmContent
    } else if (body.utm_content) {
      telegramIdStr = body.utm_content
    } else if (body.buyer?.utm_content) {
      telegramIdStr = body.buyer.utm_content
    } else if (body.metadata?.utm_content) {
      telegramIdStr = body.metadata.utm_content
    } else if (body.custom_fields?.utm_content) {
      telegramIdStr = body.custom_fields.utm_content
    } else if (body.telegram_id) {
      telegramIdStr = body.telegram_id
    }

    console.log('Found telegram_id:', telegramIdStr)

    if (!telegramIdStr) {
      console.error('No telegram_id found in payload')
      // Уведомляем админа о проблеме
      await sendAdminNotification(
        `⚠️ <b>Webhook: telegram_id не найден!</b>\n\n` +
        `Payload: <code>${JSON.stringify(body).slice(0, 500)}</code>\n\n` +
        `Возможно клиент оплатил, но монеты не начислены!`
      )
      return new Response(
        JSON.stringify({ ok: false, error: 'No telegram_id found', received_payload: body }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramId = parseInt(String(telegramIdStr), 10)
    if (isNaN(telegramId)) {
      console.error('Invalid telegram_id:', telegramIdStr)
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid telegram_id', value: telegramIdStr }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contractId = body.contractId || body.id || null
    const campaign = body.clientUtm?.utm_campaign || body.clientUtm?.utmCampaign || ''

    // Extract actual payment details
    // Lava payload structures vary, check multiple paths for amount/currency
    const paidAmount = parseFloat(body.amount || body.sum || 0)
    const paidCurrency = body.currency || 'RUB' // Default fallback

    // Определяем тип события
    const isSubscriptionEvent = campaign.startsWith('sub_') ||
      eventType.includes('subscription')

    // =====================================
    // ОТМЕНА ПОДПИСКИ
    // =====================================
    if (eventType.includes('subscription.cancelled') || eventType.includes('subscription.cancel')) {
      console.log('Processing subscription cancellation')

      const { data: cancelResult, error: cancelError } = await supabase.rpc('cancel_subscription', {
        p_telegram_id: telegramId,
        p_contract_id: contractId
      })

      if (cancelError) {
        console.error('Error cancelling subscription:', cancelError)
      } else {
        console.log('Subscription cancelled:', cancelResult)
      }

      // Обновляем plan в premium_clients на FREE (подписка отменена, но доступ до expires_at)
      await supabase
        .from('premium_clients')
        .update({ plan: 'FREE' })
        .eq('telegram_id', telegramId)

      return new Response(
        JSON.stringify({ ok: true, action: 'subscription_cancelled', result: cancelResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем успешность платежа
    const isSuccess =
      eventType.includes('success') ||
      status === 'completed' ||
      body.paid === true

    if (!isSuccess) {
      console.log('Payment not successful, eventType:', eventType, 'status:', status)
      return new Response(
        JSON.stringify({ ok: true, message: 'Ignored non-success', eventType, status }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Защита от дубликатов
    if (contractId) {
      const { error: insertError } = await supabase
        .from('processed_lava_payments')
        .insert({ contract_id: contractId, telegram_id: telegramId })

      if (insertError?.code === '23505') {
        console.log('Duplicate webhook blocked:', contractId)
        return new Response(
          JSON.stringify({ ok: true, message: 'Already processed', contractId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Логируем другие ошибки (например, таблица не существует)
      if (insertError && insertError.code !== '23505') {
        console.error('Error inserting processed payment:', insertError)
        // Продолжаем выполнение, но логируем
      }
    }

    // =====================================
    // ПОВТОРНЫЙ ПЛАТЁЖ ПОДПИСКИ (recurring)
    // =====================================
    if (eventType.includes('subscription.recurring')) {
      console.log('Processing recurring subscription payment')

      const { data: extendResult, error: extendError } = await supabase.rpc('extend_subscription', {
        p_telegram_id: telegramId,
        p_contract_id: contractId
      })

      if (extendError) {
        console.error('Error extending subscription:', extendError)
        return new Response(
          JSON.stringify({ ok: false, error: extendError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Subscription extended:', extendResult)

      // Уведомление покупателю о продлении
      try {
        const neuronsAdded = extendResult?.neurons_added || 0
        await sendUserNotification(
          telegramId,
          `🔄 Подписка продлена!\n\n💎 Начислено: ${neuronsAdded} нейронов\n💰 Сумма: ${paidAmount} ${paidCurrency}\n\nСпасибо!\n\nЕсли возникли трудности — тех. поддержка: @dmbekk`
        )
      } catch (e) {
        console.error('Failed to notify buyer about renewal:', e)
      }

      // Обновляем expires_at в premium_clients
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 30)
      await supabase
        .from('premium_clients')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('telegram_id', telegramId)

      // Добавляем платёж
      await supabase
        .from('payments')
        .insert({
          telegram_id: telegramId,
          amount: paidAmount,
          currency: paidCurrency,
          source: 'lava.top',
          payment_method: 'subscription_recurring',
          paid_at: new Date().toISOString()
        })

      // Реферальный бонус за продление
      const neuronsAdded = extendResult?.neurons_added || 0
      if (neuronsAdded > 0) {
        await supabase.rpc('pay_referral_purchase_bonus', {
          p_buyer_telegram_id: telegramId,
          p_coins_purchased: neuronsAdded
        })
      }

      // Уведомление рефереру о продлении подписки партнёра
      try {
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_telegram_id')
          .eq('referred_telegram_id', telegramId)
          .single()

        if (referral?.referrer_telegram_id) {
          let buyerName = 'Ваш партнёр'
          try {
            const { data: buyerData } = await supabase.from('users').select('first_name, username').eq('telegram_id', telegramId).single()
            if (buyerData) buyerName = buyerData.first_name || buyerData.username || buyerName
          } catch (_) { /* ignore */ }

          await sendUserNotification(
            referral.referrer_telegram_id,
            `🔔 <b>${buyerName}</b> продлил подписку!\n\n` +
            `Вы получаете бонус с активности вашего партнёра.`
          )
          console.log('Referral renewal notification sent to:', referral.referrer_telegram_id)
        }
      } catch (e) {
        console.error('Failed to send referral renewal notification:', e)
      }

      // Уведомление админу
      const userLink = `ID: <code>${telegramId}</code>`
      const msg = `🔄 <b>Продление подписки</b>\n\n` +
        `👤 User: ${userLink}\n` +
        `💰 Сумма: <b>${paidAmount} ${paidCurrency}</b>\n` +
        `💎 Нейроны: <b>${extendResult?.neurons_added || 0}</b>\n` +
        `🧾 Contract: <code>${contractId}</code>`

      await sendAdminNotification(msg)

      return new Response(
        JSON.stringify({
          ok: true,
          action: 'subscription_extended',
          telegram_id: telegramId,
          result: extendResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================
    // ПЕРВАЯ ОПЛАТА ПОДПИСКИ
    // =====================================
    if (isSubscriptionEvent && (eventType.includes('subscription.created') ||
      eventType.includes('subscription.success') ||
      eventType.includes('payment.success'))) {

      console.log('Processing new subscription')

      // Извлекаем planId из campaign (формат: sub_starter, sub_pro, sub_business)
      const rawPlanId = campaign.replace('sub_', '')
      // Handle 'business' alias to 'elite' if needed, or unify
      const planId = rawPlanId === 'elite' ? 'business' : rawPlanId // Normalize aliases
      const subConfig = SUBSCRIPTIONS[planId] || SUBSCRIPTIONS[rawPlanId]

      if (!subConfig) {
        console.error('Unknown subscription plan:', planId)
        return new Response(
          JSON.stringify({ ok: false, error: `Unknown plan: ${planId}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Создаём подписку через функцию в БД
      // Note: create_subscription RPC might need amount passed, we prefer the paidAmount from webhook
      const { data: createResult, error: createError } = await supabase.rpc('create_subscription', {
        p_telegram_id: telegramId,
        p_plan: planId,
        p_contract_id: contractId,
        p_amount_rub: paidAmount, // Using paidAmount as the value (even if USD, passed as numeric)
        p_neurons_per_month: subConfig.neurons
      })

      if (createError) {
        console.error('Error creating subscription:', createError)
        return new Response(
          JSON.stringify({ ok: false, error: createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Subscription created:', createResult)

      // Уведомление покупателю о подписке
      try {
        await sendUserNotification(
          telegramId,
          `✅ Подписка оформлена!\n\n💎 Начислено: ${subConfig.neurons} нейронов\n📦 План: ${planId.toUpperCase()}\n💰 Сумма: ${paidAmount} ${paidCurrency}\n\nСпасибо за покупку!\n\nЕсли возникли трудности — тех. поддержка: @dmbekk`
        )
      } catch (e) {
        console.error('Failed to notify buyer about subscription:', e)
      }

      // Добавляем/обновляем в premium_clients для админки
      const planUpper = planId.toUpperCase()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      // Получаем данные пользователя
      const { data: userData } = await supabase
        .from('users')
        .select('username, first_name')
        .eq('telegram_id', telegramId)
        .single()

      // Upsert в premium_clients
      await supabase
        .from('premium_clients')
        .upsert({
          telegram_id: telegramId,
          plan: planUpper,
          expires_at: expiresAt.toISOString(),
          username: userData?.username || null,
          first_name: userData?.first_name || null,
          source: 'lava.top',
          payment_method: 'subscription'
        }, { onConflict: 'telegram_id' })

      // Добавляем платёж с правильной валютой
      await supabase
        .from('payments')
        .insert({
          telegram_id: telegramId,
          amount: paidAmount,
          currency: paidCurrency,
          source: 'lava.top',
          payment_method: 'subscription',
          paid_at: new Date().toISOString()
        })

      // Реферальный бонус
      await supabase.rpc('pay_referral_purchase_bonus', {
        p_buyer_telegram_id: telegramId,
        p_coins_purchased: subConfig.neurons
      })

      // Уведомление рефереру о подписке партнёра
      try {
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_telegram_id')
          .eq('referred_telegram_id', telegramId)
          .single()

        if (referral?.referrer_telegram_id) {
          const buyerName = userData?.first_name || userData?.username || 'Ваш партнёр'
          await sendUserNotification(
            referral.referrer_telegram_id,
            `🔔 <b>${buyerName}</b> оформил подписку <b>${planUpper}</b>!\n\n` +
            `Вы получаете бонус с активности вашего партнёра.`
          )
          console.log('Referral subscription notification sent to:', referral.referrer_telegram_id)
        }
      } catch (e) {
        console.error('Failed to send referral subscription notification:', e)
      }

      // Уведомление админу
      const userLink = `ID: <code>${telegramId}</code>` + (userData?.username ? ` (@${userData.username})` : '') + (userData?.first_name ? ` (${userData.first_name})` : '')
      const msg = `✅ <b>Новая подписка: ${planUpper}</b>\n\n` +
        `👤 User: ${userLink}\n` +
        `💰 Сумма: <b>${paidAmount} ${paidCurrency}</b>\n` +
        `💎 Нейроны: <b>${subConfig.neurons}</b>\n` +
        `🧾 Contract: <code>${contractId}</code>`

      await sendAdminNotification(msg)

      return new Response(
        JSON.stringify({
          ok: true,
          action: 'subscription_created',
          telegram_id: telegramId,
          plan: planId,
          neurons_added: subConfig.neurons,
          result: createResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================
    // РАЗОВАЯ ПОКУПКА МОНЕТ
    // =====================================
    console.log('Processing one-time coin purchase')

    // Определяем пакет из campaign
    const packageId = campaign || 'starter'
    // Fallback: if package not found, default to starter but warn
    const pkgConfig = PACKAGES[packageId] || PACKAGES['starter']
    const coinsAmount = pkgConfig?.coins || 100

    console.log('Package:', packageId, 'Coins:', coinsAmount)

    // Начисляем монеты
    const { data: addResult, error: addError } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: coinsAmount,
      p_type: 'purchase',
      p_description: `Покупка пакета ${packageId.toUpperCase()} (${coinsAmount} нейронов) за ${paidAmount} ${paidCurrency}`,
      p_metadata: { source: 'lava.top', contractId: contractId || 'unknown', packageId, currency: paidCurrency, amount: paidAmount }
    })

    if (addError) {
      console.error('Error adding coins:', addError)
      // Уведомляем админа о проблеме
      await sendAdminNotification(
        `❌ <b>Ошибка начисления монет!</b>\n\n` +
        `👤 Telegram ID: <code>${telegramId}</code>\n` +
        `💎 Пакет: ${packageId} (${coinsAmount} нейронов)\n` +
        `💰 Сумма: ${paidAmount} ${paidCurrency}\n` +
        `🧾 Contract: <code>${contractId || 'N/A'}</code>\n\n` +
        `❗ Ошибка: ${addError.message}\n\n` +
        `Нужно начислить вручную!`
      )
      return new Response(
        JSON.stringify({ ok: false, error: addError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем success в результате (add_coins может вернуть success: false, если юзер не найден)
    if (addResult && addResult.success === false) {
      console.error('add_coins returned success: false:', addResult)
      await sendAdminNotification(
        `❌ <b>add_coins: success=false!</b>\n\n` +
        `👤 Telegram ID: <code>${telegramId}</code>\n` +
        `💎 Пакет: ${packageId} (${coinsAmount} нейронов)\n` +
        `💰 Сумма: ${paidAmount} ${paidCurrency}\n` +
        `🧾 Contract: <code>${contractId || 'N/A'}</code>\n\n` +
        `❗ Причина: ${addResult.error || 'неизвестна'}\n\n` +
        `Нужно начислить вручную!`
      )
      return new Response(
        JSON.stringify({ ok: false, error: 'add_coins returned success: false', details: addResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Coins added successfully:', addResult)

    // Уведомление покупателю
    try {
      await sendUserNotification(
        telegramId,
        `✅ Оплата ${paidAmount} ${paidCurrency} прошла успешно!\n\n💎 Начислено: ${coinsAmount} нейронов\n📦 Пакет: ${packageId.toUpperCase()}\n\nСпасибо за покупку!\n\nЕсли возникли трудности — тех. поддержка: @dmbekk`
      )
    } catch (e) {
      console.error('Failed to notify buyer:', e)
    }

    // Записываем в payments для админки
    await supabase
      .from('payments')
      .insert({
        telegram_id: telegramId,
        amount: paidAmount,
        currency: paidCurrency,
        source: 'lava.top',
        payment_method: 'one_time',
        paid_at: new Date().toISOString()
      })

    // Реферальный бонус
    const { data: referralResult, error: referralError } = await supabase.rpc('pay_referral_purchase_bonus', {
      p_buyer_telegram_id: telegramId,
      p_coins_purchased: coinsAmount
    })

    if (referralError) {
      console.error('Error paying referral bonus:', referralError)
    } else {
      console.log('Referral bonus result:', referralResult)
    }

    // Уведомление админу
    const pkgName = packageId.toUpperCase()
    // Пытаемся получить username
    let userInfo = `ID: <code>${telegramId}</code>`
    try {
      const { data: u } = await supabase.from('users').select('username, first_name').eq('telegram_id', telegramId).single()
      if (u) {
        userInfo += (u.username ? ` (@${u.username})` : '') + (u.first_name ? ` (${u.first_name})` : '')
      }
    } catch (e) { }

    const msg = `💰 <b>Покупка монет: ${pkgName}</b>\n\n` +
      `👤 User: ${userInfo}\n` +
      `💵 Сумма: <b>${paidAmount} ${paidCurrency}</b>\n` +
      `💎 Нейроны: <b>${coinsAmount}</b>\n` +
      `🧾 Contract: <code>${contractId || 'one-time'}</code>`

    await sendAdminNotification(msg)

    return new Response(
      JSON.stringify({
        ok: true,
        action: 'coins_purchased',
        telegram_id: telegramId,
        coins_added: coinsAmount,
        package: packageId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
