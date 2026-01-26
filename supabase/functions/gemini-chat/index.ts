import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const PROJECT_NUMBER = "448437714382"
const LOCATION = "us-central1"
const AGENT_ENGINE_ID = "7339491903567560704"

// Максимум сообщений в памяти
const MAX_HISTORY_MESSAGES = 20

// Лимиты по тарифам (fallback если БД недоступна)
const TARIFF_LIMITS: Record<string, number> = {
  'basic': 10,
  'pro': 50,
  'vip': 100,
  'elite': 300,
  'platinum': 300,
  'standard': 50
}

// Supabase клиент для логирования
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, supabaseKey)
}

// Проверка лимита запросов
async function checkUserLimit(userId: string | undefined): Promise<{
  allowed: boolean
  tariff: string
  limit: number
  used: number
  remaining: number
}> {
  if (!userId) {
    return { allowed: true, tariff: 'basic', limit: 10, used: 0, remaining: 10 }
  }

  try {
    const supabase = getSupabaseClient()
    
    const { data: userTariffs } = await supabase
      .from('user_tariffs')
      .select('tariff_slug')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    let bestTariff = 'basic'
    let limit = TARIFF_LIMITS['basic']
    
    if (userTariffs && userTariffs.length > 0) {
      for (const t of userTariffs) {
        const tariffLimit = TARIFF_LIMITS[t.tariff_slug] || 10
        if (tariffLimit > limit) {
          limit = tariffLimit
          bestTariff = t.tariff_slug
        }
      }
    }
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count } = await supabase
      .from('chat_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('success', true)
      .gte('created_at', today.toISOString())
    
    const used = count || 0
    const remaining = Math.max(0, limit - used)
    
    return {
      allowed: used < limit,
      tariff: bestTariff,
      limit,
      used,
      remaining
    }
  } catch (e) {
    console.error('Error checking limit:', e)
    return { allowed: true, tariff: 'basic', limit: 10, used: 0, remaining: 10 }
  }
}

// Логирование использования
async function logUsage(params: {
  userId?: string
  inputTokens: number
  outputTokens: number
  imagesCount: number
  model: string
  success: boolean
  errorMessage?: string
}) {
  try {
    const supabase = getSupabaseClient()

    const costThb =
      (params.inputTokens * 0.000043) +
      (params.outputTokens * 0.000345) +
      (params.imagesCount * 0.054)

    await supabase.from('chat_usage').insert({
      user_id: params.userId || null,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      images_count: params.imagesCount,
      model: params.model,
      cost_thb: costThb,
      success: params.success,
      error_message: params.errorMessage
    })
  } catch (e) {
    console.error('Failed to log usage:', e)
  }
}

// Создание JWT токена для Service Account
async function createJWT(credentials: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }

  const encoder = new TextEncoder()
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)))
  const payloadB64 = base64url(encoder.encode(JSON.stringify(payload)))
  const signInput = `${headerB64}.${payloadB64}`

  const pemKey = credentials.private_key
  const pemContent = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "")

  const binaryKey = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signInput)
  )

  const signatureB64 = base64url(new Uint8Array(signature))
  return `${signInput}.${signatureB64}`
}

// Получение access token
async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials)

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token error: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Кэш сессий Agent Engine (в памяти Edge Function)
const sessionCache = new Map<string, string>()

// Создание сессии в Agent Engine
async function getOrCreateSession(token: string, odooUserId: string): Promise<string> {
  // Проверяем кэш
  const cached = sessionCache.get(odooUserId)
  if (cached) {
    return cached
  }

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}:query`

  // Создаём сессию через create_session
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      class_method: 'create_session',
      input: {
        user_id: odooUserId
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Create session error:', errorText)
    // Если не удалось создать сессию, используем user_id как session_id
    return odooUserId
  }

  const data = await response.json()
  const sessionId = data.output?.id || odooUserId

  // Кэшируем
  sessionCache.set(odooUserId, sessionId)

  return sessionId
}

// Вызов Agent Engine
async function callAgentEngine(
  token: string,
  userId: string,
  sessionId: string,
  message: string
): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_NUMBER}/locations/${LOCATION}/reasoningEngines/${AGENT_ENGINE_ID}:streamQuery`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      class_method: 'stream_query',
      input: {
        user_id: userId,
        session_id: sessionId,
        message: message
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Agent Engine error: ${response.status} - ${errorText}`)
  }

  // Парсим streaming response
  const text = await response.text()
  
  // Agent Engine возвращает JSON объекты разделённые переводами строк
  let reply = ''
  let inputTokens = 0
  let outputTokens = 0

  const lines = text.split('\n').filter(line => line.trim())
  
  for (const line of lines) {
    try {
      const chunk = JSON.parse(line)
      
      // Извлекаем текст из разных форматов ответа
      if (chunk.content?.parts?.[0]?.text) {
        reply = chunk.content.parts[0].text
      } else if (chunk.output?.content?.parts?.[0]?.text) {
        reply = chunk.output.content.parts[0].text
      } else if (typeof chunk.output === 'string') {
        reply = chunk.output
      }

      // Извлекаем usage
      const usage = chunk.usage_metadata || chunk.output?.usage_metadata
      if (usage) {
        inputTokens = usage.prompt_token_count || usage.promptTokenCount || 0
        outputTokens = usage.candidates_token_count || usage.candidatesTokenCount || 0
      }
    } catch {
      // Игнорируем не-JSON строки
    }
  }

  if (!reply) {
    throw new Error('No response from Agent Engine')
  }

  return { reply, inputTokens, outputTokens }
}

interface ImageAttachment {
  mimeType: string
  data: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let inputTokens = 0
  let outputTokens = 0
  let imagesCount = 0
  const usedModel = 'gemini-2.5-pro (Agent Engine)'

  try {
    const { message, history = [], images = [], userId } = await req.json()

    if (!message && images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем лимит запросов
    const limitInfo = await checkUserLimit(userId)
    
    if (!limitInfo.allowed) {
      return new Response(
        JSON.stringify({
          error: 'limit_exceeded',
          message: `Достигнут лимит запросов (${limitInfo.limit}/день). Обновите тариф для увеличения лимита.`,
          limit: limitInfo.limit,
          used: limitInfo.used,
          remaining: 0,
          tariff: limitInfo.tariff
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
    }

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    // Генерируем user_id для Agent Engine
    const agentUserId = userId || `anonymous_${Date.now()}`
    
    // Получаем или создаём сессию
    const sessionId = await getOrCreateSession(token, agentUserId)

    // Формируем сообщение
    let fullMessage = message || ''
    imagesCount = images?.length || 0

    // Если есть картинки, пока добавляем текст (Agent Engine не поддерживает inline images напрямую)
    if (images && images.length > 0 && !message) {
      fullMessage = "Пользователь отправил изображение. Пожалуйста, спроси что он хочет узнать."
    }

    // Вызываем Agent Engine
    const result = await callAgentEngine(token, agentUserId, sessionId, fullMessage)

    inputTokens = result.inputTokens
    outputTokens = result.outputTokens

    // Логируем успешный запрос
    await logUsage({
      userId,
      inputTokens,
      outputTokens,
      imagesCount,
      model: usedModel,
      success: true
    })

    return new Response(
      JSON.stringify({
        reply: result.reply,
        model: usedModel,
        usage: { inputTokens, outputTokens, imagesCount },
        limit: {
          tariff: limitInfo.tariff,
          daily: limitInfo.limit,
          used: limitInfo.used + 1,
          remaining: limitInfo.remaining - 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)

    // Логируем ошибку
    await logUsage({
      inputTokens,
      outputTokens,
      imagesCount,
      model: usedModel,
      success: false,
      errorMessage: error.message
    })

    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
