import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Конфигурация пакетов монет (должна совпадать с lava-create-invoice)
const PACKAGES: Record<string, { coins: number; price: number }> = {
  light: { coins: 30, price: 290 },
  starter: { coins: 100, price: 890 },
  standard: { coins: 300, price: 2490 },
  pro: { coins: 500, price: 3990 },
  business: { coins: 1000, price: 7500 },
}

// Конфигурация подписок (только PRO и BUSINESS)
const SUBSCRIPTIONS: Record<string, { neurons: number; amount: number }> = {
  pro: { neurons: 500, amount: 2900 },
  business: { neurons: 2000, amount: 9900 },
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

      // Обновляем expires_at в premium_clients
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 30)
      await supabase
        .from('premium_clients')
        .update({ expires_at: newExpiresAt.toISOString() })
        .eq('telegram_id', telegramId)

      // Добавляем платёж
      const subAmount = extendResult?.amount_rub || 499
      await supabase
        .from('payments')
        .insert({
          telegram_id: telegramId,
          amount: subAmount,
          currency: 'RUB',
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
      const planId = campaign.replace('sub_', '')
      const subConfig = SUBSCRIPTIONS[planId]

      if (!subConfig) {
        console.error('Unknown subscription plan:', planId)
        return new Response(
          JSON.stringify({ ok: false, error: `Unknown plan: ${planId}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Создаём подписку через функцию в БД
      const { data: createResult, error: createError } = await supabase.rpc('create_subscription', {
        p_telegram_id: telegramId,
        p_plan: planId,
        p_contract_id: contractId,
        p_amount_rub: subConfig.amount,
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

      // Добавляем платёж
      await supabase
        .from('payments')
        .insert({
          telegram_id: telegramId,
          amount: subConfig.amount,
          currency: 'RUB',
          source: 'lava.top',
          payment_method: 'subscription',
          paid_at: new Date().toISOString()
        })

      // Реферальный бонус
      await supabase.rpc('pay_referral_purchase_bonus', {
        p_buyer_telegram_id: telegramId,
        p_coins_purchased: subConfig.neurons
      })

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
    const pkgConfig = PACKAGES[packageId]
    const coinsAmount = pkgConfig?.coins || 100

    console.log('Package:', packageId, 'Coins:', coinsAmount)

    // Начисляем монеты
    const { data: addResult, error: addError } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: coinsAmount,
      p_type: 'purchase',
      p_description: `Покупка пакета ${packageId.toUpperCase()} (${coinsAmount} нейронов)`,
      p_metadata: { source: 'lava.top', contractId: contractId || 'unknown', packageId }
    })

    if (addError) {
      console.error('Error adding coins:', addError)
      return new Response(
        JSON.stringify({ ok: false, error: addError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Coins added successfully:', addResult)

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
