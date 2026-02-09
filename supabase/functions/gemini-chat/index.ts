import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const LOCATION = "us-central1"

// Дефолты
const DEFAULTS = {
  premiumModel: "gemini-2.5-pro",
  freeModel: "gemini-2.5-flash",
  fallbackModel: "gemini-2.5-flash",
  temperature: 0.8,
  maxTokens: 8192,
  maxRetries: 2,
  maxHistory: 20,
  systemPrompt: "Ты полезный AI-ассистент.",
  limitBasic: 10,
  limitPro: 50,
  limitVip: 100,
  limitElite: 300
}

interface ChatSettings {
  system_prompt: string
  premium_model: string
  free_model: string
  fallback_model: string
  temperature: number
  max_tokens: number
  max_retries: number
  max_history: number
  history_enabled: boolean
  limit_basic: number
  limit_pro: number
  limit_vip: number
  limit_elite: number
  rag_enabled: boolean
  rag_engine_id: string | null
}

// Supabase клиент
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, supabaseKey)
}

// Получение настроек чата из БД
async function getChatSettings(): Promise<ChatSettings> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('chat_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) throw error

    return {
      system_prompt: data.system_prompt || DEFAULTS.systemPrompt,
      premium_model: data.premium_model || DEFAULTS.premiumModel,
      free_model: data.free_model || DEFAULTS.freeModel,
      fallback_model: data.fallback_model || DEFAULTS.fallbackModel,
      temperature: data.temperature ?? DEFAULTS.temperature,
      max_tokens: data.max_tokens || DEFAULTS.maxTokens,
      max_retries: data.max_retries || DEFAULTS.maxRetries,
      max_history: data.max_history || DEFAULTS.maxHistory,
      history_enabled: data.history_enabled ?? true,
      limit_basic: data.limit_basic || DEFAULTS.limitBasic,
      limit_pro: data.limit_pro || DEFAULTS.limitPro,
      limit_vip: data.limit_vip || DEFAULTS.limitVip,
      limit_elite: data.limit_elite || DEFAULTS.limitElite,
      rag_enabled: data.rag_enabled ?? false,
      rag_engine_id: data.rag_engine_id || null
    }
  } catch (e) {
    console.warn('Failed to get chat settings:', e)
    return {
      system_prompt: DEFAULTS.systemPrompt,
      premium_model: DEFAULTS.premiumModel,
      free_model: DEFAULTS.freeModel,
      fallback_model: DEFAULTS.fallbackModel,
      temperature: DEFAULTS.temperature,
      max_tokens: DEFAULTS.maxTokens,
      max_retries: DEFAULTS.maxRetries,
      max_history: DEFAULTS.maxHistory,
      history_enabled: true,
      limit_basic: DEFAULTS.limitBasic,
      limit_pro: DEFAULTS.limitPro,
      limit_vip: DEFAULTS.limitVip,
      limit_elite: DEFAULTS.limitElite,
      rag_enabled: false,
      rag_engine_id: null
    }
  }
}

// Проверка лимита и получение тарифа
async function checkUserLimit(userId: string | undefined, settings: ChatSettings): Promise<{
  allowed: boolean
  tariff: string
  limit: number
  used: number
  remaining: number
  isPremium: boolean
}> {
  if (!userId) {
    return { allowed: true, tariff: 'basic', limit: settings.limit_basic, used: 0, remaining: settings.limit_basic, isPremium: false }
  }

  try {
    const supabase = getSupabaseClient()

    // Маппинг тарифов на лимиты
    const tariffLimits: Record<string, number> = {
      'basic': settings.limit_basic,
      'free': settings.limit_basic,
      'pro': settings.limit_pro,
      'standard': settings.limit_pro,
      'vip': settings.limit_vip,
      'elite': settings.limit_elite,
      'platinum': settings.limit_elite
    }

    const premiumSlugs = ['pro', 'standard', 'vip', 'elite', 'platinum']

    let bestTariff = 'basic'
    let isPremium = false
    let limit = tariffLimits['basic']

    // 1. Проверяем user_subscriptions (Lava-подписки PRO/ELITE)
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('plan')
      .eq('telegram_id', userId)
      .eq('status', 'active')

    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const plan = (sub.plan || '').toLowerCase()
        const planLimit = tariffLimits[plan] || settings.limit_basic
        if (planLimit > limit) {
          limit = planLimit
          bestTariff = plan
        }
        if (premiumSlugs.includes(plan)) {
          isPremium = true
        }
      }
    }

    // 2. Проверяем user_tariffs (тарифы школы — для совместимости)
    const { data: userTariffs } = await supabase
      .from('user_tariffs')
      .select('tariff_slug')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (userTariffs && userTariffs.length > 0) {
      for (const t of userTariffs) {
        const tariffLimit = tariffLimits[t.tariff_slug] || settings.limit_basic
        if (tariffLimit > limit) {
          limit = tariffLimit
          bestTariff = t.tariff_slug
        }
        if (premiumSlugs.includes(t.tariff_slug)) {
          isPremium = true
        }
      }
    }

    console.log(`User ${userId}: bestTariff=${bestTariff}, isPremium=${isPremium}, limit=${limit}`)

    // Считаем использование за сегодня
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
      remaining,
      isPremium
    }
  } catch (e) {
    console.error('Error checking limit:', e)
    return { allowed: true, tariff: 'basic', limit: settings.limit_basic, used: 0, remaining: settings.limit_basic, isPremium: false }
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

// Создание JWT токена
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

// Вызов Gemini API
async function callGemini(
  token: string,
  model: string,
  contents: any[],
  temperature: number,
  maxTokens: number
): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${model}:generateContent`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ]
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Vertex AI error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Извини, не смог сгенерировать ответ.'

  const usageMetadata = data.usageMetadata || {}
  const inputTokens = usageMetadata.promptTokenCount || 0
  const outputTokens = usageMetadata.candidatesTokenCount || 0

  return { reply, inputTokens, outputTokens }
}

interface ImageAttachment {
  mimeType: string
  data: string
}

// RAG поиск через GenAI App Builder (Discovery Engine API)
async function searchRAG(
  token: string,
  query: string,
  engineId: string
): Promise<{ answer: string; sources: any[]; ragUsed: boolean }> {
  // Endpoint для поиска через Engine (Enterprise edition)
  // Формат: projects/{PROJECT_ID}/locations/global/collections/default_collection/engines/{ENGINE_ID}/servingConfigs/default_search
  const endpoint = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/engines/${engineId}/servingConfigs/default_search:search`

  console.log(`RAG search: query="${query}", engineId="${engineId}"`)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      pageSize: 5,
      contentSearchSpec: {
        snippetSpec: {
          maxSnippetCount: 3,
          referenceOnly: false,
        },
        summarySpec: {
          summaryResultCount: 3
        }
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`RAG search error: ${response.status} - ${errorText}`)
    throw new Error(`RAG search error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('RAG search response:', JSON.stringify(data).substring(0, 1000))

  // Извлекаем ТОЛЬКО сниппеты (без названий файлов — они не должны утекать к пользователю)
  const sources = (data.results || []).map((r: any) => ({
    title: '', // Намеренно скрываем названия документов
    uri: '',
    snippet: r.document?.derivedStructData?.snippets?.[0]?.snippet || ''
  }))

  // Формируем ответ — убираем все ссылки на источники [1], [2] и т.д.
  let answer = data.summary?.summaryText || ''

  // Очищаем от ссылок формата [1], [2, 3], (1), (источник) и т.д.
  answer = answer.replace(/\[\d+(?:,\s*\d+)*\]/g, '')
  answer = answer.replace(/\(\d+\)/g, '')
  answer = answer.replace(/📎\s*Источники:[\s\S]*/gi, '')
  answer = answer.replace(/Источник[иы]?\s*:[\s\S]*/gi, '')
  answer = answer.trim()

  if (!answer && sources.length > 0) {
    // Формируем контекст ТОЛЬКО из сниппетов (без заголовков)
    answer = sources.map((s: any) => s.snippet).filter(Boolean).join('\n\n')
  }

  if (!answer) {
    answer = 'Не нашел ответа в документах.'
  }

  return { answer, sources, ragUsed: true }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let usedModel = DEFAULTS.premiumModel
  let inputTokens = 0
  let outputTokens = 0
  let imagesCount = 0

  try {
    const { message, history = [], images = [], userId, useRAG = false, ragEngineId, systemPrompt } = await req.json()

    if (!message && images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем настройки
    const settings = await getChatSettings()

    // Проверяем лимит и определяем тариф
    const limitInfo = await checkUserLimit(userId, settings)

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

    // Выбираем модель в зависимости от тарифа
    const primaryModel = limitInfo.isPremium ? settings.premium_model : settings.free_model
    usedModel = primaryModel

    console.log(`User tariff: ${limitInfo.tariff}, isPremium: ${limitInfo.isPremium}, model: ${usedModel}`)

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
    }

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    // Собираем parts для текущего сообщения
    const currentMessageParts: any[] = []
    imagesCount = images?.length || 0

    if (images && images.length > 0) {
      for (const img of images as ImageAttachment[]) {
        currentMessageParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        })
      }
    }

    if (message) {
      currentMessageParts.push({ text: message })
    } else if (images.length > 0) {
      currentMessageParts.push({ text: "Что на этом изображении?" })
    }

    // История (если включена)
    const maxHistoryMessages = settings.history_enabled ? settings.max_history : 0
    const limitedHistory = history.slice(-maxHistoryMessages)

    // Используем кастомный промпт если передан, иначе из настроек
    const activeSystemPrompt = systemPrompt || settings.system_prompt

    // Собираем контент
    const contents = [
      { role: "user", parts: [{ text: activeSystemPrompt }] },
      { role: "model", parts: [{ text: "Понял, готов помочь!" }] },
      ...limitedHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: "user", parts: currentMessageParts }
    ]

    // RAG: решаем на бэкенде (не зависим от фронтенда)
    const ragEnabled = settings.rag_enabled && !!settings.rag_engine_id
    const ragEngineIdFinal = settings.rag_engine_id

    let ragResult: { answer: string; sources: any[]; ragUsed: boolean } | null = null
    let result: { reply: string; inputTokens: number; outputTokens: number }
    let ragDebugError: string | null = null

    if (ragEnabled && ragEngineIdFinal) {
      try {
        console.log('RAG enabled from settings, engineId:', ragEngineIdFinal)
        ragResult = await searchRAG(token, message, ragEngineIdFinal)
        console.log('RAG result:', { answer: ragResult.answer?.substring(0, 100), sourcesCount: ragResult.sources?.length || 0 })

        // Если RAG нашел ответ, используем его
        if (ragResult.answer && ragResult.answer !== 'Не нашел ответа в документах.') {
          // Формируем контекст из RAG (без упоминания источников)
          const ragContext = ragResult.sources.map(s => s.snippet).filter(Boolean).join('\n\n')

          // Если есть кастомный системный промпт — используем его стиль
          // Иначе — стандартный RAG ответ
          let enhancedPrompt: string

          if (systemPrompt) {
            // Режим коуча: используем знания как внутреннюю экспертизу
            enhancedPrompt = `${systemPrompt}

---
ТВОИ ВНУТРЕННИЕ ЗНАНИЯ (это твоя экспертиза, ты ЗНАЕШЬ это сам, как профессиональный коуч):
${ragContext || ragResult.answer}
---

КРИТИЧЕСКИ ВАЖНО:
- Ты НИКОГДА не упоминаешь источники, документы, файлы, базы данных
- Ты НИКОГДА не пишешь [1], [2] или ссылки на источники
- Ты НИКОГДА не говоришь "на основе документов" или "согласно данным"
- Ты говоришь как ЖИВОЙ КОУЧ от первого лица
- Ты ЗАДАЁШЬ ВОПРОСЫ клиенту, а не читаешь лекции
- Максимум 2-3 коротких абзаца

Сообщение клиента: ${message}`
          } else {
            // Стандартный RAG режим с источниками
            enhancedPrompt = `
Контекст из документов:
${ragResult.answer}

${ragResult.sources.length > 0 ? `Источники:\n${ragResult.sources.map((s, i) => `${i + 1}. ${s.title}: ${s.snippet}`).join('\n')}` : ''}

Вопрос пользователя: ${message}

Ответь на основе контекста выше. Если контекста недостаточно, дополни своими знаниями.
            `.trim()
          }

          // Собираем контент с историей для режима коуча
          let enhancedContents: any[]

          if (systemPrompt && limitedHistory.length > 0) {
            // Режим коуча с историей диалога
            enhancedContents = [
              { role: "user", parts: [{ text: enhancedPrompt.split('Сообщение клиента:')[0] }] },
              { role: "model", parts: [{ text: "Понял, готов помочь как коуч." }] },
              ...limitedHistory.map((msg: { role: string; content: string }) => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
              })),
              { role: "user", parts: [{ text: message }] }
            ]
          } else {
            enhancedContents = [
              { role: "user", parts: [{ text: enhancedPrompt }] }
            ]
          }

          try {
            result = await callGemini(
              token,
              usedModel,
              enhancedContents,
              settings.temperature,
              settings.max_tokens
            )
          } catch (modelError) {
            // Модель не найдена — пробуем fallback модель с тем же RAG-контекстом 
            console.warn(`RAG callGemini failed with ${usedModel}, trying fallback ${settings.fallback_model}:`, modelError)
            usedModel = settings.fallback_model
            result = await callGemini(
              token,
              usedModel,
              enhancedContents,
              settings.temperature,
              settings.max_tokens
            )
          }

          // Добавляем источники к ответу ТОЛЬКО если нет кастомного промпта
          if (!systemPrompt && ragResult.sources.length > 0) {
            result.reply += `\n\n📎 Источники:\n${ragResult.sources.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}`
          }
        } else {
          // RAG не нашел ответ, используем обычный Gemini
          console.log('RAG не нашел ответ, используем обычный Gemini')
          ragDebugError = 'RAG returned no results'
          ragResult = null
          throw new Error('RAG не нашел ответ')
        }
      } catch (ragError) {
        const errMsg = ragError instanceof Error ? ragError.message : String(ragError)
        console.error('RAG error, falling back to regular Gemini:', errMsg)
        ragDebugError = ragDebugError || errMsg
        ragResult = null
        // Продолжаем с обычным Gemini
      }
    }

    // Если RAG не использовался или не нашел ответ, используем обычный Gemini
    if (!ragResult || !ragResult.ragUsed) {
      let attempts = 0
      let lastError: Error | null = null

      while (attempts < settings.max_retries) {
        try {
          const modelToUse = attempts === 0 ? usedModel : settings.fallback_model
          console.log(`Attempt ${attempts + 1}: using model ${modelToUse}`)

          result = await callGemini(
            token,
            modelToUse,
            contents,
            settings.temperature,
            settings.max_tokens
          )
          usedModel = modelToUse
          break
        } catch (e) {
          lastError = e as Error
          console.error(`Model ${usedModel} failed:`, e)
          attempts++

          if (attempts < settings.max_retries) {
            console.log(`Switching to fallback model: ${settings.fallback_model}`)
            usedModel = settings.fallback_model
          }
        }
      }

      if (!result!) {
        throw lastError || new Error('All models failed')
      }
    }

    inputTokens = result.inputTokens
    outputTokens = result.outputTokens

    // Логируем
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
        rag: ragResult ? {
          used: true,
          sources: ragResult.sources,
          answer: ragResult.answer
        } : { used: false, error: ragDebugError },
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
