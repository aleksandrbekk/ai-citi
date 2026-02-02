import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lava.top API для отмены подписки
const LAVA_API_URL = 'https://gate.lava.top/api/v2/subscription'
const LAVA_API_KEY = Deno.env.get('LAVA_API_KEY') || ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId } = await req.json()

    console.log('=== Cancel Subscription Request ===')
    console.log('telegramId:', telegramId)

    if (!telegramId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'telegramId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Получаем активную подписку пользователя
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('telegram_id', telegramId)
      .eq('status', 'active')
      .single()

    if (subError || !subscription) {
      console.error('No active subscription found:', subError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Активная подписка не найдена' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Found subscription:', subscription)

    // Отменяем подписку в Lava.top через API
    if (subscription.lava_contract_id && LAVA_API_KEY) {
      try {
        const cancelResponse = await fetch(`${LAVA_API_URL}/${subscription.lava_contract_id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': LAVA_API_KEY
          }
        })

        const cancelResult = await cancelResponse.json()
        console.log('Lava.top cancel response:', cancelResult)

        if (!cancelResponse.ok) {
          console.error('Lava.top cancel error:', cancelResult)
          // Продолжаем отмену в нашей системе даже если Lava вернула ошибку
        }
      } catch (lavaError) {
        console.error('Lava.top API error:', lavaError)
        // Продолжаем отмену в нашей системе
      }
    }

    // Отменяем подписку в нашей БД
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    if (updateError) {
      console.error('Error updating subscription:', updateError)
      return new Response(
        JSON.stringify({ ok: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Обновляем premium_clients
    await supabase
      .from('premium_clients')
      .update({ plan: 'FREE' })
      .eq('telegram_id', telegramId)

    console.log('Subscription cancelled successfully')

    return new Response(
      JSON.stringify({
        ok: true,
        message: 'Подписка отменена. Доступ сохранится до конца оплаченного периода.',
        expires_at: subscription.expires_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cancel subscription error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
