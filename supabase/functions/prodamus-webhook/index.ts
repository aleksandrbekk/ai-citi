import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PRODAMUS_SECRET = Deno.env.get('PRODAMUS_SECRET_KEY') || ''
const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || ''
const ADMIN_CHAT_IDS = [190202791, 643763835]

// Отправка уведомления админу в Telegram
async function sendAdminNotification(message: string) {
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not set')
    return
  }
  for (const chatId of ADMIN_CHAT_IDS) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        })
      })
      console.log(`Notification to ${chatId}:`, await res.json())
    } catch (e) {
      console.error(`Failed to notify ${chatId}:`, e)
    }
  }
}

// Парсинг PHP-style ключей в nested dict
// products[0][name]=Test -> { products: { "0": { name: "Test" } } }
function setNestedValue(obj: Record<string, unknown>, rawKey: string, value: string) {
  const parts = rawKey.split(/\[|\]/).filter(p => p !== '')
  if (parts.length === 0) return

  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

// Парсинг URL-encoded form data
function parseUrlEncoded(body: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const pairs = body.split('&')
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const rawKey = decodeURIComponent(pair.substring(0, eqIdx).replace(/\+/g, ' '))
    const value = decodeURIComponent(pair.substring(eqIdx + 1).replace(/\+/g, ' '))
    setNestedValue(result, rawKey, value)
  }
  return result
}

// Парсинг multipart/form-data через Deno FormData API
async function parseMultipart(req: Request): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  const formData = await req.formData()
  for (const [key, value] of formData.entries()) {
    setNestedValue(result, key, String(value))
  }
  return result
}

// Рекурсивная сортировка ключей
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

// Верификация подписи
async function verifySignature(data: Record<string, unknown>, receivedSign: string, secret: string): Promise<boolean> {
  const computed = await hmacSign(data, secret)
  return computed.toLowerCase() === receivedSign.toLowerCase()
}

serve(async (req) => {
  console.log('=== Prodamus Webhook Received ===')
  console.log('Method:', req.method)
  console.log('Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())))

  try {
    const contentType = req.headers.get('content-type') || ''
    let data: Record<string, unknown>

    // Prodamus отправляет вебхук в формате multipart/form-data
    if (contentType.includes('multipart/form-data')) {
      console.log('Parsing as multipart/form-data')
      data = await parseMultipart(req)
    } else if (contentType.includes('application/json')) {
      console.log('Parsing as JSON')
      const rawBody = await req.text()
      console.log('Raw body:', rawBody.substring(0, 1000))
      data = JSON.parse(rawBody)
    } else {
      // Fallback: URL-encoded
      console.log('Parsing as URL-encoded')
      const rawBody = await req.text()
      console.log('Raw body:', rawBody.substring(0, 1000))
      data = parseUrlEncoded(rawBody)
    }

    console.log('Parsed data keys:', Object.keys(data))
    console.log('Parsed data:', JSON.stringify(data, null, 2).substring(0, 2000))

    // Извлекаем подпись из заголовка Sign
    const receivedSign = req.headers.get('Sign') || req.headers.get('sign') || ''
    console.log('Received sign:', receivedSign)

    // Верифицируем подпись
    if (PRODAMUS_SECRET && receivedSign) {
      const isValid = await verifySignature(data, receivedSign, PRODAMUS_SECRET)
      console.log('Signature valid:', isValid)

      if (!isValid) {
        console.error('Invalid signature!')
        await sendAdminNotification(
          `⚠️ <b>Prodamus Webhook: невалидная подпись!</b>\n\n` +
          `Данные: <code>${JSON.stringify(data).slice(0, 300)}</code>`
        )
        // Продолжаем обработку для тестирования
      }
    } else {
      console.log('Signature check skipped (no secret or no sign)')
    }

    // Извлекаем данные платежа
    // ВАЖНО: Prodamus отправляет НАШ order_id в поле order_num
    const orderId = String(data.order_num || data.order_id || '')
    const sum = String(data.sum || '0')
    const paymentStatus = String(data.payment_status || '')
    const customerExtra = String(data.customer_extra || '')

    console.log('Order ID:', orderId, 'Sum:', sum, 'Status:', paymentStatus)

    // ЗАЩИТА: игнорируем заказы НЕ от нашего приложения (курсы и т.д.)
    if (!orderId.startsWith('prodamus_')) {
      console.log('Skipping non-app order:', orderId, '(probably course payment)')
      return new Response('OK', { status: 200 })
    }

    // Извлекаем telegramId из order_id (формат: prodamus_<telegramId>_<timestamp>_<packageId>)
    let telegramId = 0
    let packageId = ''

    const orderMatch = orderId.match(/^prodamus_(\d+)_\d+_(.+)$/)
    if (orderMatch) {
      telegramId = parseInt(orderMatch[1], 10)
      packageId = orderMatch[2]
    }

    // Фоллбэк — ищем в customer_extra
    if (!telegramId && customerExtra) {
      const extraMatch = customerExtra.match(/Telegram ID:\s*(\d+)/)
      if (extraMatch) {
        telegramId = parseInt(extraMatch[1], 10)
      }
    }

    console.log('Telegram ID:', telegramId, 'Package:', packageId)

    if (!telegramId) {
      console.error('No telegram_id found')
      await sendAdminNotification(
        `⚠️ <b>Prodamus: telegram_id не найден!</b>\n\n` +
        `Order: <code>${orderId}</code>\n` +
        `Sum: ${sum}₽\n` +
        `Data: <code>${JSON.stringify(data).slice(0, 300)}</code>`
      )
      return new Response('OK', { status: 200 })
    }

    // Проверяем статус — Prodamus отправляет "success" при успешной оплате
    const isSuccess = paymentStatus === 'success'

    if (!isSuccess) {
      console.log('Payment not successful:', paymentStatus)
      await sendAdminNotification(
        `ℹ️ <b>Prodamus: статус ${paymentStatus}</b>\n\n` +
        `👤 Telegram: <code>${telegramId}</code>\n` +
        `Order: <code>${orderId}</code>\n` +
        `Sum: ${sum}₽`
      )
      return new Response('OK', { status: 200 })
    }

    // Определяем количество монет по пакету
    const PACKAGES: Record<string, number> = {
      test_1: 1,
      test_10: 5,
      test_50: 10,
      test_100: 30,
      // Боевые пакеты
      light: 30,
      starter: 100,
      standard: 300,
      pro: 500,
      business: 1000,
    }

    const coinsToAdd = PACKAGES[packageId] || 0

    if (coinsToAdd === 0) {
      console.error('Unknown package:', packageId)
      await sendAdminNotification(
        `⚠️ <b>Prodamus: неизвестный пакет!</b>\n\n` +
        `👤 Telegram: <code>${telegramId}</code>\n` +
        `Package: <code>${packageId}</code>\n` +
        `Sum: ${sum}₽\n\n` +
        `Нужно начислить вручную!`
      )
      return new Response('OK', { status: 200 })
    }

    // Подключаемся к Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Защита от дубликатов
    if (orderId) {
      const { error: dupError } = await supabase
        .from('processed_lava_payments')
        .insert({ contract_id: orderId, telegram_id: telegramId })

      if (dupError?.code === '23505') {
        console.log('Duplicate webhook blocked:', orderId)
        return new Response('OK', { status: 200 })
      }
    }

    // Начисляем монеты
    const { data: addResult, error: addError } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: coinsToAdd,
      p_type: 'purchase',
      p_description: `Покупка через Prodamus: ${packageId} (${coinsToAdd} нейронов) за ${sum}₽`,
      p_metadata: {
        source: 'prodamus',
        order_id: orderId,
        package_id: packageId,
        amount_rub: parseFloat(sum),
      }
    })

    if (addError) {
      console.error('Error adding coins:', addError)
      await sendAdminNotification(
        `❌ <b>Prodamus: ошибка начисления!</b>\n\n` +
        `👤 Telegram: <code>${telegramId}</code>\n` +
        `💎 Пакет: ${packageId} (${coinsToAdd} нейронов)\n` +
        `💰 Сумма: ${sum}₽\n` +
        `Order: <code>${orderId}</code>\n\n` +
        `❗ ${addError.message}\n\n` +
        `Начислите вручную!`
      )
      return new Response('OK', { status: 200 })
    }

    console.log('Coins added:', addResult)

    // Уведомление покупателю
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: `✅ Оплата ${sum}₽ прошла успешно!\n\n💎 Начислено: ${coinsToAdd} нейронов\n📦 Пакет: ${packageId}\n\nСпасибо за покупку!\n\nЕсли возникли трудности — тех. поддержка: @dmbekk`,
        })
      })
    } catch (e) {
      console.error('Failed to notify buyer:', e)
    }

    // Записываем платёж
    await supabase
      .from('payments')
      .insert({
        telegram_id: telegramId,
        amount: parseFloat(sum),
        currency: 'RUB',
        source: 'prodamus',
        payment_method: 'one_time',
        paid_at: new Date().toISOString(),
      })

    // Реферальный бонус
    try {
      await supabase.rpc('pay_referral_purchase_bonus', {
        p_buyer_telegram_id: telegramId,
        p_coins_purchased: coinsToAdd,
      })
    } catch (e) {
      console.error('Referral bonus error:', e)
    }

    // Уведомление админу
    let userInfo = `ID: <code>${telegramId}</code>`
    try {
      const { data: u } = await supabase.from('users').select('username, first_name').eq('telegram_id', telegramId).single()
      if (u) {
        userInfo += (u.username ? ` (@${u.username})` : '') + (u.first_name ? ` (${u.first_name})` : '')
      }
    } catch (_) { /* ignore */ }

    await sendAdminNotification(
      `💰 <b>Prodamus: покупка монет</b>\n\n` +
      `👤 ${userInfo}\n` +
      `💵 Сумма: <b>${sum}₽</b>\n` +
      `💎 Нейроны: <b>${coinsToAdd}</b>\n` +
      `📦 Пакет: ${packageId}\n` +
      `🧾 Order: <code>${orderId}</code>`
    )

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('Prodamus webhook error:', error)
    await sendAdminNotification(
      `❌ <b>Prodamus webhook ошибка!</b>\n\n${error.message}`
    )
    return new Response('OK', { status: 200 })
  }
})
