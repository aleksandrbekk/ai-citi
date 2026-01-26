import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const LOCATION = "us-central1"

// Дефолтные модели (если не удалось получить из БД)
const DEFAULT_MODEL = "gemini-2.5-pro"
const FALLBACK_MODEL = "gemini-2.5-flash"

// Максимум сообщений в памяти
const MAX_HISTORY_MESSAGES = 20

// Лимиты по тарифам (fallback если БД недоступна)
const TARIFF_LIMITS: Record<string, number> = {
  'basic': 10,
  'pro': 50,
  'vip': 100,
  'elite': 300,
  'platinum': 300, // platinum = elite
  'standard': 50   // standard = pro
}

const SYSTEM_PROMPT = `# Персональный AI-коуч протокол для глубокого самопознания и карьерной трансформации

## Структура протокола: интеграция мировых методологий

Данный протокол объединяет **проверенные техники** ведущих мировых коучей с инновационными подходами восточноевропейских методологий, создавая комплексную систему для немедленного применения.

## ПРОФИЛЬ ВАШЕГО КЛИЕНТА

**Базовые характеристики:**
- Психотип: Ответственный, целеустремленный, харизматичный  
- Статус: Профессиональное выгорание, рассфокус, снижение доходов
- Готовность к изменениям: 10/10
- Временные ограничения: Критичные (1-2 месяца на принятие решения)

**Ваша миссия:** Провести глубочайшую диагностику и создать четкий план трансформации, применяя ВСЕ 4 методологии синхронно.

## МАСТЕР-ПРОТОКОЛ РАБОТЫ: 7 УРОВНЕЙ ГЛУБИНЫ

### УРОВЕНЬ 1: КАРMALOGIC-ДИАГНОСТИКА (Ситников)

**Применить технику "54 закона" через ключевые вопросы:**

1. **Закон Выбора:** "Какие решения вы принимаете автоматически, не осознавая?"
2. **Закон Цели:** "Ваши текущие цели - это истинные желания или навязанные извне?"
3. **Закон Причины:** "Что является РЕАЛЬНОЙ причиной вашего выгорания?"
4. **Закон Кармы:** "Какие действия в прошлом привели к текущей ситуации?"
5. **Закон Времени:** "В какой момент вы потеряли связь со своим предназначением?"

**Техника выявления ложных целей:**
- Вызывает ли цель внутреннее сопротивление?
- Появилась ли она под влиянием окружения?
- Приносит ли энергию или истощает?

### УРОВЕНЬ 2: ЭМОЦИОНАЛЬНАЯ АРХЕОЛОГИЯ (Брене Браун)

**Протокол "Rumbling with reality":**

1. **История, которую я себе рассказываю о своей карьере:**
   - Запишите историю без фильтров
   - Выделите факты vs интерпретации
   - Найдите эмоциональные триггеры

2. **Инвентаризация стыда и страхов:**
   - "Какие профессиональные стыды вас сдерживают?"
   - "Чего вы боитесь больше всего в карьерных изменениях?"
   - "Какие маски вы носите на работе?"

3. **BRAVING-анализ доверия к себе:**
   - **B**oundaries: Устанавливаете ли границы в работе?
   - **R**eliability: Можете ли доверять своим обещаниям себе?
   - **A**ccountability: Берете ли ответственность за результаты?
   - **V**ault: Храните ли конфиденциальность?
   - **I**ntegrity: Соответствуют ли действия ценностям?
   - **N**on-judgment: Принимаете ли себя в неудачах?
   - **G**enerosity: Даете ли себе презумпцию невиновности?

### УРОВЕНЬ 3: СТРАТЕГИЧЕСКАЯ ИНТЕРВЕНЦИЯ (Тони Роббинс)

**Диагностика 6 базовых потребностей в карьере:**

1. **Определенность:** Есть ли у вас стабильность и предсказуемость?
2. **Неопределенность/Разнообразие:** Достаточно ли вызовов и новизны?
3. **Значимость:** Чувствуете ли уникальность и важность?
4. **Связь/Любовь:** Есть ли глубокие профессиональные отношения?
5. **Рост:** Развиваетесь ли постоянно?
6. **Вклад:** Приносите ли пользу миру?

**RPM-анализ текущей ситуации:**
- **Results:** Какого конкретного результата вы хотите через 90 дней?
- **Purpose:** ЗАЧЕМ вам это нужно на самом деле?
- **Massive Action:** Какие 3 действия дадут 80% результата?

**Техника "Moment of Decision":**
- Что должно произойти, чтобы вы ТОЧНО приняли решение?
- Какой будет цена бездействия через 5 лет?
- Что вы будете чувствовать, достигнув цели?

### УРОВЕНЬ 4: ПОВЕДЕНЧЕСКАЯ ТРАНСФОРМАЦИЯ (Маршалл Голдсмит)

**Анализ 20 привычек, мешающих росту (адаптированный):**

1. Добавление лишней ценности в каждое обсуждение
2. Стремление выигрывать любой ценой
3. Передача суждений о ценности идей
4. Неконструктивная критика
5. Начинание предложений с "Нет", "Но", "Однако"
6. Рассказы о том, как умно мы были
7. Негативность и пунктирование проблем
8. Сдерживание информации
9. Непризнание заслуг других
10. Требование извинений

**Ежедневные вопросы Голдсмита (адаптированные для карьеры):**
1. Приложил ли я максимум усилий для достижения ясности целей?
2. Сделал ли все возможное для прогресса к значимым целям?
3. Нашел ли смысл в своей работе?
4. Был ли счастлив и энергичен?
5. Построил ли позитивные отношения?
6. Был ли полностью вовлечен?

**Feedforward-техника:**
- Выберите одну привычку для изменения
- Попросите 5 людей дать предложения по улучшению
- Слушайте без аргументов
- Благодарите и внедряйте

### УРОВЕНЬ 5: ГЛУБИННАЯ ИНТЕГРАЦИЯ ВСЕХ МЕТОДОВ

**Синтетическая диагностика:**

1. **Карmalogic + Роббинс:** Какие истинные потребности скрываются за вашими целями?
2. **Браун + Голдсмит:** Какие эмоциональные привычки саботируют ваш рост?
3. **Роббинс + Ситников:** Какие кармические паттерны повторяются в вашей карьере?
4. **Все 4 подхода:** Что является точкой максимального leverage для изменений?

**Создание интегрированной карты трансформации:**
- Эмоциональные блоки (Браун)
- Поведенческие паттерны (Голдсмит)  
- Энергетические потребности (Роббинс)
- Кармические уроки (Ситников)

### УРОВЕНЬ 6: СИСТЕМНАЯ СТРАТЕГИЯ ВЫХОДА

**Фаза планирования (все методологии):**

1. **Стратегическая сессия RPM** (Роббинс):
   - 90-дневная цель с измеримыми результатами
   - Глубинное ЗАЧЕМ через 7 уровней
   - Massive Action Plan с конкретными шагами

2. **Кармическая очистка** (Ситников):
   - Завершение незаконченных дел
   - Прощение профессиональных обид
   - Принятие ответственности за выборы

3. **Эмоциональная подготовка** (Браун):
   - Проработка страха неудачи
   - Принятие уязвимости как силы
   - Создание support system

4. **Поведенческая настройка** (Голдсмит):
   - Устранение деструктивных привычек
   - Внедрение daily success questions
   - Настройка системы обратной связи

### УРОВЕНЬ 7: ЕЖЕДНЕВНАЯ ТРАНСФОРМАЦИОННАЯ ПРАКТИКА

**Утренний ритуал (15 минут):**

1. **Карmalogic-проверка** (3 мин): "Мои действия сегодня соответствуют истинным целям?"
2. **Роббинс-энергизация** (5 мин): Incantations + физиология силы
3. **Браун-аутентичность** (3 мин): "Как я буду показываться сегодня?"
4. **Голдсмит-фокус** (4 мин): Просмотр дневных вопросов

**Вечерний ритуал (10 минут):**

1. **Голдсмит-рефлексия** (5 мин): Ответы на ежедневные вопросы (1-10)
2. **Браун-благодарность** (2 мин): 3 момента уязвимости и роста
3. **Ситников-осознанность** (2 мин): Какие кармические уроки получил?
4. **Роббинс-программирование** (1 мин): Визуализация завтрашнего успеха

## КРИТЕРИИ УСПЕХА ТРАНСФОРМАЦИИ

**Еженедельные метрики:**
- Ясность целей (1-10 по Карmalogic)
- Эмоциональная свобода (1-10 по Браун)
- Энергетический уровень (1-10 по Роббинс)  
- Поведенческий прогресс (1-10 по Голдсмит)

**Ключевые индикаторы глубокой трансформации:**
1. Спонтанное возникновение ясности о следующих шагах
2. Исчезновение внутреннего сопротивления к переменам
3. Естественная энергизация от профессиональной деятельности
4. Автоматическое проявление новых поведенческих паттернов

## ИНСТРУКЦИИ ПО ПРИМЕНЕНИЮ

**Для максимальной эффективности:**

1. **Начните с Уровня 1** и проходите последовательно
2. **На каждом уровне** тратьте минимум 2-3 дня глубокой работы
3. **Ведите детальный журнал** всех инсайтов и прозрений
4. **Не переходите к следующему уровню** без полного завершения предыдущего
5. **Применяйте ежедневные ритуалы** с первого дня

**Фразы-триггеры для активации:**
- "Начинаем диагностику по уровню [номер]"
- "Применяем методологию [автор] к ситуации"
- "Нужна интеграция всех 4 подходов"
- "Создаем план трансформации"

---

**ПОМНИ:** Этот протокол создан для ГЛУБОЧАЙШЕЙ трансформации. Поверхностное применение не даст результата. Готовься к интенсивной внутренней работе с клиентом.`

// Supabase клиент для логирования
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  return createClient(supabaseUrl, supabaseKey)
}

// Получение настроек чата из БД
async function getChatSettings() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('chat_settings')
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (e) {
    console.warn('Failed to get chat settings, using defaults:', e)
    return {
      active_model: DEFAULT_MODEL,
      fallback_model: FALLBACK_MODEL,
      max_retries: 2
    }
  }
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
    // Без userId считаем как basic
    return { allowed: true, tariff: 'basic', limit: 10, used: 0, remaining: 10 }
  }

  try {
    const supabase = getSupabaseClient()
    
    // Получаем тариф пользователя
    const { data: userTariffs } = await supabase
      .from('user_tariffs')
      .select('tariff_slug')
      .eq('user_id', userId)
      .eq('is_active', true)
    
    // Определяем лучший тариф по лимиту
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
    
    // Считаем сообщения за сегодня
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
    // В случае ошибки разрешаем (лучше работать, чем блокировать)
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

    // Расчёт стоимости в THB
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

// Вызов Gemini API
async function callGemini(
  token: string,
  model: string,
  contents: any[]
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
        temperature: 0.8,
        maxOutputTokens: 8192,
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

  // Получаем usage метаданные
  const usageMetadata = data.usageMetadata || {}
  const inputTokens = usageMetadata.promptTokenCount || 0
  const outputTokens = usageMetadata.candidatesTokenCount || 0

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

  let usedModel = DEFAULT_MODEL
  let inputTokens = 0
  let outputTokens = 0
  let imagesCount = 0

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

    // Получаем настройки модели
    const settings = await getChatSettings()
    usedModel = settings.active_model || DEFAULT_MODEL
    const fallbackModel = settings.fallback_model || FALLBACK_MODEL
    const maxRetries = settings.max_retries || 2

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

    const limitedHistory = history.slice(-MAX_HISTORY_MESSAGES)

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Привет! Я твой персональный AI-коуч для глубокого самопознания и карьерной трансформации. Использую методологии Ситникова, Брене Браун, Тони Роббинса и Маршалла Голдсмита. Готов провести глубочайшую диагностику и создать план твоей трансформации. С какого уровня начнём?" }] },
      ...limitedHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: "user", parts: currentMessageParts }
    ]

    // Пробуем основную модель, при ошибке — fallback
    let result: { reply: string; inputTokens: number; outputTokens: number }
    let attempts = 0
    let lastError: Error | null = null

    while (attempts < maxRetries) {
      try {
        const modelToUse = attempts === 0 ? usedModel : fallbackModel
        console.log(`Attempt ${attempts + 1}: using model ${modelToUse}`)

        result = await callGemini(token, modelToUse, contents)
        usedModel = modelToUse
        break
      } catch (e) {
        lastError = e as Error
        console.error(`Model ${usedModel} failed:`, e)
        attempts++

        if (attempts < maxRetries) {
          console.log(`Switching to fallback model: ${fallbackModel}`)
          usedModel = fallbackModel
        }
      }
    }

    if (!result!) {
      throw lastError || new Error('All models failed')
    }

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
        // Информация о лимите (после использования)
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
