import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lava.top API
const LAVA_API_URL = 'https://gate.lava.top/api/v3/invoice'
const LAVA_API_KEY = Deno.env.get('LAVA_API_KEY') || ''

// ID оффера для 100 монет (нужно получить из Lava.top)
const OFFER_ID = Deno.env.get('LAVA_OFFER_ID') || ''

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId, email, currency = 'RUB' } = await req.json()

    // Валидация валюты
    const validCurrencies = ['RUB', 'USD', 'EUR']
    const finalCurrency = validCurrencies.includes(currency) ? currency : 'RUB'

    console.log('=== Creating Lava.top Invoice ===')
    console.log('telegramId:', telegramId)
    console.log('currency:', finalCurrency)

    if (!telegramId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'telegramId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!LAVA_API_KEY) {
      console.error('LAVA_API_KEY not configured')
      return new Response(
        JSON.stringify({ ok: false, error: 'Payment system not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!OFFER_ID) {
      console.error('LAVA_OFFER_ID not configured')
      return new Response(
        JSON.stringify({ ok: false, error: 'Product not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаём инвойс через Lava.top API
    const invoiceData = {
      email: email || 'noreply@ai-citi.app', // Email обязателен, но можно использовать заглушку
      offerId: OFFER_ID,
      currency: finalCurrency,
      periodicity: 'ONE_TIME',
      buyerLanguage: 'RU',
      successUrl: 'https://aiciti.pro/payment-success', // Редирект после успешной оплаты
      clientUtm: {
        utm_content: String(telegramId) // Передаём telegram_id
      }
    }

    console.log('Sending to Lava.top:', JSON.stringify(invoiceData, null, 2))

    const response = await fetch(LAVA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': LAVA_API_KEY
      },
      body: JSON.stringify(invoiceData)
    })

    const result = await response.json()

    console.log('Lava.top response:', JSON.stringify(result, null, 2))

    if (!response.ok) {
      console.error('Lava.top API error:', result)
      return new Response(
        JSON.stringify({ ok: false, error: result.message || 'Payment API error', details: result }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Возвращаем URL для оплаты
    return new Response(
      JSON.stringify({
        ok: true,
        paymentUrl: result.paymentUrl || result.url || result.link,
        invoiceId: result.id || result.contractId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Invoice creation error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
