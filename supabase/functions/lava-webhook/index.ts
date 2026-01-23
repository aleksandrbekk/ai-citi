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

    // Lava.top отправляет данные в разных форматах
    // Проверяем статус платежа
    const status = body.status || body.eventType
    if (status !== 'success' && status !== 'payment.success') {
      console.log('Payment not successful, status:', status)
      return new Response(
        JSON.stringify({ ok: true, message: 'Ignored non-success status' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Извлекаем telegram_id из clientUtm.utm_content
    const clientUtm = body.clientUtm || {}
    const telegramIdStr = clientUtm.utm_content || clientUtm.utmContent

    console.log('clientUtm:', clientUtm)
    console.log('telegram_id from utm_content:', telegramIdStr)

    if (!telegramIdStr) {
      console.error('No telegram_id in utm_content')
      return new Response(
        JSON.stringify({ ok: false, error: 'No telegram_id in utm_content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramId = parseInt(telegramIdStr, 10)
    if (isNaN(telegramId)) {
      console.error('Invalid telegram_id:', telegramIdStr)
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid telegram_id' }),
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
      p_metadata: { source: 'lava.top', contractId: body.contractId }
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
