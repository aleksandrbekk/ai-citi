import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRODAMUS_SECRET = Deno.env.get('PRODAMUS_SECRET_KEY') || ''
const PRODAMUS_URL = Deno.env.get('PRODAMUS_PAYFORM_URL') || 'https://lagermlm.payform.ru'

// Тестовые пакеты для Prodamus (только рубли)
const TEST_PACKAGES: Record<string, { coins: number; price: number; name: string }> = {
  test_1: { coins: 1, price: 1, name: 'Тест 1₽ — 1 нейрон' },
  test_10: { coins: 5, price: 10, name: 'Тест 10₽ — 5 нейронов' },
  test_100: { coins: 30, price: 100, name: 'Тест 100₽ — 30 нейронов' },
}

// Рекурсивная сортировка ключей объекта
function sortObj(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObj)
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortObj((obj as Record<string, unknown>)[key])
    }
    return sorted
  }
  return String(obj)
}

// HMAC-SHA256 подпись (алгоритм Prodamus)
async function hmacSign(data: Record<string, unknown>, secret: string): Promise<string> {
  const sorted = sortObj(data)
  const json = JSON.stringify(sorted)

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(json))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId, packageId = 'test_10' } = await req.json()

    console.log('=== Creating Prodamus Invoice ===')
    console.log('telegramId:', telegramId, 'packageId:', packageId)

    if (!telegramId) {
      return new Response(
        JSON.stringify({ ok: false, error: 'telegramId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!PRODAMUS_SECRET) {
      console.error('PRODAMUS_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ ok: false, error: 'Prodamus not configured. Set PRODAMUS_SECRET_KEY.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const pkg = TEST_PACKAGES[packageId]
    if (!pkg) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid packageId: ${packageId}. Available: ${Object.keys(TEST_PACKAGES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderId = `prodamus_${telegramId}_${Date.now()}_${packageId}`
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/prodamus-webhook`

    // Данные для подписи
    const paymentData: Record<string, unknown> = {
      order_id: orderId,
      customer_extra: `Telegram ID: ${telegramId}`,
      products: [
        {
          name: pkg.name,
          price: String(pkg.price),
          quantity: '1',
          sku: packageId,
        }
      ],
      urlNotification: webhookUrl,
      urlSuccess: 'https://aiciti.pro/test-payment?success=1',
      urlReturn: 'https://aiciti.pro/test-payment',
    }

    // Подписываем
    const sign = await hmacSign(paymentData, PRODAMUS_SECRET)

    // Собираем URL с параметрами
    const baseUrl = PRODAMUS_URL.replace(/\/$/, '')
    const params = new URLSearchParams()
    params.set('order_id', orderId)
    params.set('customer_extra', `Telegram ID: ${telegramId}`)
    params.set('products[0][name]', pkg.name)
    params.set('products[0][price]', String(pkg.price))
    params.set('products[0][quantity]', '1')
    params.set('products[0][sku]', packageId)
    params.set('urlNotification', webhookUrl)
    params.set('urlSuccess', 'https://aiciti.pro/test-payment?success=1')
    params.set('urlReturn', 'https://aiciti.pro/test-payment')
    params.set('sign', sign)

    const paymentUrl = `${baseUrl}/?${params.toString()}`

    console.log('Prodamus payment URL created:', paymentUrl)
    console.log('Webhook URL:', webhookUrl)

    return new Response(
      JSON.stringify({
        ok: true,
        paymentUrl,
        orderId,
        package: { id: packageId, coins: pkg.coins, price: pkg.price, name: pkg.name }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Prodamus invoice error:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
