import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LAVA_API_URL = 'https://gate.lava.top/api/v3/invoice'
const LAVA_API_KEY = Deno.env.get('LAVA_API_KEY') || ''

const OFFER_IDS: Record<string, string> = {
  light: Deno.env.get('LAVA_OFFER_COINS_LIGHT') || '',
  starter: Deno.env.get('LAVA_OFFER_COINS_STARTER') || '',
  standard: Deno.env.get('LAVA_OFFER_COINS_STANDARD') || '',
  pro: Deno.env.get('LAVA_OFFER_COINS_PRO') || '',
  business: Deno.env.get('LAVA_OFFER_COINS_BUSINESS') || '',
}

const FALLBACK_OFFER_ID = Deno.env.get('LAVA_OFFER_ID') || ''

// Multi-currency pricing configuration
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId, email, currency = 'RUB', packageId = 'starter' } = await req.json()

    console.log('=== Creating Lava.top Invoice ===')
    console.log('telegramId:', telegramId)
    console.log('packageId:', packageId)
    console.log('currency:', currency)

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

    const pkg = PACKAGES[packageId]
    if (!pkg) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid packageId: ${packageId}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate currency
    const safeCurrency = (['RUB', 'USD', 'EUR'].includes(currency) ? currency : 'RUB') as 'RUB' | 'USD' | 'EUR'
    const amount = pkg.prices[safeCurrency]

    let offerId = OFFER_IDS[packageId]
    if (!offerId) {
      console.log(`No specific offer for ${packageId}, using fallback`)
      offerId = FALLBACK_OFFER_ID
    }

    if (!offerId) {
      console.error('No offer ID configured for package:', packageId)
      return new Response(
        JSON.stringify({ ok: false, error: 'Product not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const invoiceData = {
      email: email || 'noreply@ai-citi.app',
      offerId: offerId,
      currency: safeCurrency,
      sum: amount, // Explicitly pass the calculated amount
      periodicity: 'ONE_TIME',
      buyerLanguage: 'RU',
      successUrl: 'https://aiciti.pro/payment-success',
      clientUtm: {
        utm_content: String(telegramId),
        utm_campaign: packageId
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

    return new Response(
      JSON.stringify({
        ok: true,
        paymentUrl: result.paymentUrl || result.url || result.link,
        invoiceId: result.id || result.contractId,
        package: {
          id: packageId,
          coins: pkg.coins,
          price: amount,
          currency: safeCurrency
        }
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
