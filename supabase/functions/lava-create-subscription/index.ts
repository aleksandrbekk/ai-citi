import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Lava.top API
const LAVA_API_URL = 'https://gate.lava.top/api/v3/invoice'
const LAVA_API_KEY = Deno.env.get('LAVA_API_KEY') || ''

// Offer ID для подписок (создаются в Lava.top с periodicity: MONTHLY)
const SUBSCRIPTION_OFFER_IDS: Record<string, string> = {
  pro: Deno.env.get('LAVA_OFFER_SUB_PRO') || '',
  elite: Deno.env.get('LAVA_OFFER_SUB_BUSINESS') || '', // Используем тот же offer
  business: Deno.env.get('LAVA_OFFER_SUB_BUSINESS') || '', // Для обратной совместимости
}

// Конфигурация подписок (PRO и ELITE)
// Цены для разных валют
const SUBSCRIPTIONS: Record<string, { neurons: number; name: string; prices: { RUB: number; USD: number; EUR: number } }> = {
  pro: {
    neurons: 150,
    name: 'PRO',
    prices: { RUB: 2900, USD: 29, EUR: 27 }
  },
  elite: {
    neurons: 600,
    name: 'ELITE',
    prices: { RUB: 9900, USD: 99, EUR: 95 }
  },
  business: {
    neurons: 600,
    name: 'ELITE',
    prices: { RUB: 9900, USD: 99, EUR: 95 }
  },
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId, email, planId, currency = 'RUB' } = await req.json()

    console.log('=== Creating Lava.top Subscription Invoice ===')
    console.log('telegramId:', telegramId)
    console.log('planId:', planId)
    console.log('currency:', currency)

    if (!telegramId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'telegramId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!planId || planId === 'free') {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid plan. Choose pro or elite' }),
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

    // Получаем конфигурацию подписки
    const sub = SUBSCRIPTIONS[planId]
    if (!sub) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid planId: ${planId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate currency
    const safeCurrency = (['RUB', 'USD', 'EUR'].includes(currency) ? currency : 'RUB') as 'RUB' | 'USD' | 'EUR'
    const amount = sub.prices[safeCurrency]

    // Получаем offer ID для подписки
    const offerId = SUBSCRIPTION_OFFER_IDS[planId]
    if (!offerId) {
      console.error('No subscription offer ID configured for plan:', planId)
      return new Response(
        JSON.stringify({ ok: false, error: `Subscription ${planId.toUpperCase()} not configured. Contact support.` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаём инвойс для рекуррентного платежа
    const invoiceData = {
      email: email || 'noreply@ai-citi.app',
      offerId: offerId,
      currency: safeCurrency,
      sum: amount,
      periodicity: 'MONTHLY', // КЛЮЧЕВОЕ: рекуррентный платёж
      buyerLanguage: 'RU',
      successUrl: 'https://aiciti.pro/subscription-success',
      clientUtm: {
        utm_content: String(telegramId),
        utm_campaign: `sub_${planId}`, // Prefix sub_ для различения в webhook
        utm_term: String(sub.neurons), // Передаём количество нейронов
        utm_medium: String(amount) // Передаём сумму
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
        invoiceId: result.id || result.contractId,
        subscription: {
          plan: planId,
          name: sub.name,
          amount: amount,
          currency: safeCurrency,
          neuronsPerMonth: sub.neurons
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Subscription invoice creation error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
