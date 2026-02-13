import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRODAMUS_SECRET = Deno.env.get('PRODAMUS_SECRET_KEY') || ''
const PRODAMUS_URL = Deno.env.get('PRODAMUS_PAYFORM_URL') || 'https://lagermlm.payform.ru'

const PACKAGES: Record<string, { coins: number; price: number; name: string }> = {
  test_50: { coins: 10, price: 50, name: 'Тест 50₽ — 10 нейронов' },
  light: { coins: 30, price: 290, name: 'Light — 30 нейронов' },
  starter: { coins: 100, price: 890, name: 'Starter — 100 нейронов' },
  standard: { coins: 300, price: 2490, name: 'Standard — 300 нейронов' },
  pro: { coins: 500, price: 3990, name: 'PRO — 500 нейронов' },
  business: { coins: 1000, price: 7500, name: 'Business — 1000 нейронов' },
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { telegramId, packageId = 'test_10', source = 'web' } = await req.json()

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

    const pkg = PACKAGES[packageId]
    if (!pkg) {
      return new Response(
        JSON.stringify({ ok: false, error: `Invalid packageId: ${packageId}. Available: ${Object.keys(PACKAGES).join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderId = `prodamus_${telegramId}_${Date.now()}_${packageId}`
    const baseUrl = PRODAMUS_URL.replace(/\/$/, '')

    // POST к Prodamus с do=link — получаем короткую ссылку на оплату
    const formData = new URLSearchParams()
    formData.set('do', 'link')
    formData.set('order_id', orderId)
    formData.set('customer_extra', `Telegram ID: ${telegramId}`)
    formData.set('products[0][name]', pkg.name)
    formData.set('products[0][price]', pkg.price.toFixed(2))
    formData.set('products[0][quantity]', '1')
    formData.set('products[0][sku]', packageId)
    formData.set('products[0][type]', 'service')
    // Доступы к материалам — чтобы Prodamus пробивал чеки по 54-ФЗ
    formData.set('paid_content', `Доступ к нейронам в AI CITI. Пакет: ${pkg.name}. Ссылка: https://t.me/Neirociti_bot`)
    // НЕ передаём urlNotification — без sys параметра он игнорируется.
    // Вместо этого URL уведомлений настроен глобально в Prodamus → Настройки уведомлений
    formData.set('callbackType', 'json')

    // Возврат: если из мини-апа — в мини-ап, если из веба — на сайт
    if (source === 'miniapp') {
      formData.set('urlSuccess', 'https://t.me/Neirociti_bot')
      formData.set('urlReturn', 'https://t.me/Neirociti_bot')
    } else {
      formData.set('urlSuccess', 'https://aiciti.pro/test-payment?success=1')
      formData.set('urlReturn', 'https://aiciti.pro/test-payment')
    }

    console.log('POST to Prodamus:', baseUrl)
    console.log('Form data:', formData.toString())

    const response = await fetch(`${baseUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    })

    const paymentUrl = (await response.text()).trim()

    console.log('Prodamus response:', paymentUrl)

    if (!paymentUrl.startsWith('http')) {
      console.error('Unexpected Prodamus response:', paymentUrl)
      return new Response(
        JSON.stringify({ ok: false, error: 'Prodamus не вернул ссылку', response: paymentUrl }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
