import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Lava.top отправляет:
    // eventType: "payment.success" | "payment.failed" | "subscription.recurring.payment.success" | etc
    // status: "completed" | "failed" | "new" | "in-progress" | etc
    const eventType = body.eventType || ''
    const status = body.status || ''

    console.log('eventType:', eventType, 'status:', status)

    // Успешная оплата: eventType содержит "success" ИЛИ status = "completed"
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

    // Ищем telegram_id в разных местах
    let telegramIdStr = null

    // Вариант 1: clientUtm.utm_content
    if (body.clientUtm?.utm_content) {
      telegramIdStr = body.clientUtm.utm_content
    }
    // Вариант 2: clientUtm.utmContent
    else if (body.clientUtm?.utmContent) {
      telegramIdStr = body.clientUtm.utmContent
    }
    // Вариант 3: utm_content напрямую в body
    else if (body.utm_content) {
      telegramIdStr = body.utm_content
    }
    // Вариант 4: в buyer объекте
    else if (body.buyer?.utm_content) {
      telegramIdStr = body.buyer.utm_content
    }
    // Вариант 5: в metadata
    else if (body.metadata?.utm_content) {
      telegramIdStr = body.metadata.utm_content
    }
    // Вариант 6: в custom_fields
    else if (body.custom_fields?.utm_content) {
      telegramIdStr = body.custom_fields.utm_content
    }
    // Вариант 7: telegram_id напрямую
    else if (body.telegram_id) {
      telegramIdStr = body.telegram_id
    }

    console.log('Found telegram_id:', telegramIdStr)

    if (!telegramIdStr) {
      console.error('No telegram_id found in payload')
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'No telegram_id found',
          received_payload: body
        }),
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

    // Сумма монет (по умолчанию 100)
    const coinsAmount = 100
    const contractId = body.contractId || body.id || null

    // Создание Supabase клиента
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Защита от дубликатов через INSERT с уникальным ключом
    if (contractId) {
      const { error: insertError } = await supabase
        .from('processed_lava_payments')
        .insert({ contract_id: contractId, telegram_id: telegramId })

      if (insertError) {
        // Если ошибка дубликата — платёж уже обработан
        if (insertError.code === '23505') {
          console.log('Duplicate webhook blocked by unique constraint:', contractId)
          return new Response(
            JSON.stringify({ ok: true, message: 'Already processed', contractId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        console.error('Error inserting processed payment:', insertError)
      }
    }

    // Начисляем монеты покупателю
    const { data: addResult, error: addError } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: coinsAmount,
      p_type: 'purchase',
      p_description: `Покупка ${coinsAmount} монет через Lava.top`,
      p_metadata: { source: 'lava.top', contractId: contractId || 'unknown' }
    })

    if (addError) {
      console.error('Error adding coins:', addError)
      return new Response(
        JSON.stringify({ ok: false, error: addError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Coins added successfully:', addResult)

    // Начисляем реферальный бонус через функцию (она обновляет и статистику)
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
        telegram_id: telegramId,
        coins_added: coinsAmount
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
