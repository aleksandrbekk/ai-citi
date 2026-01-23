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

    // Принимаем разные статусы успешной оплаты
    const status = body.status || body.eventType || body.event || body.type || ''
    const successStatuses = ['success', 'payment.success', 'completed', 'paid', 'succeeded', 'approved']

    const isSuccess = successStatuses.some(s =>
      status.toLowerCase().includes(s) ||
      body.paid === true ||
      body.success === true
    )

    if (!isSuccess) {
      console.log('Payment status:', status, '- checking if success...')
      // Если статус не распознан, но есть данные - попробуем обработать
      if (!body.clientUtm && !body.utm_content && !body.buyer?.utm_content) {
        console.log('No UTM data and unknown status, ignoring')
        return new Response(
          JSON.stringify({ ok: true, message: 'Ignored', received: body }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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

    // Создание Supabase клиента
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Начисляем монеты покупателю
    const { data: addResult, error: addError } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: coinsAmount,
      p_type: 'purchase',
      p_description: `Покупка ${coinsAmount} монет через Lava.top`,
      p_metadata: { source: 'lava.top', contractId: body.contractId || body.id || 'unknown' }
    })

    if (addError) {
      console.error('Error adding coins:', addError)
      return new Response(
        JSON.stringify({ ok: false, error: addError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Coins added successfully:', addResult)

    // Проверяем реферера и начисляем 20% бонус
    const { data: referrer } = await supabase
      .from('referrals')
      .select('referrer_telegram_id')
      .eq('referred_telegram_id', telegramId)
      .single()

    if (referrer?.referrer_telegram_id) {
      const referrerBonus = Math.floor(coinsAmount * 0.2) // 20%

      console.log('Found referrer:', referrer.referrer_telegram_id, 'bonus:', referrerBonus)

      const { data: bonusResult, error: bonusError } = await supabase.rpc('add_coins', {
        p_telegram_id: referrer.referrer_telegram_id,
        p_amount: referrerBonus,
        p_type: 'referral_bonus',
        p_description: `Бонус 20% от покупки партнёра (${coinsAmount} монет)`,
        p_metadata: {
          source: 'referral_purchase_bonus',
          partner_telegram_id: telegramId,
          purchase_amount: coinsAmount
        }
      })

      if (bonusError) {
        console.error('Error adding referrer bonus:', bonusError)
      } else {
        console.log('Referrer bonus added:', bonusResult)
      }
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
