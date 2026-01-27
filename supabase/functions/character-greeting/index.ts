import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const LOCATION = "us-central1"

// Персонажи с их описаниями и специфичными промптами
const CHARACTERS = {
  'assistant': {
    name: 'Ассистент',
    role: 'AI Помощник',
    personality: 'дружелюбный, умный, всегда готов помочь',
    topics: [
      'нейросети и ИИ',
      'бизнес-идеи',
      'продуктивность',
      'автоматизация рутины',
      'полезные лайфхаки',
      'ответы на сложные вопросы'
    ],
    callToAction: 'Нажми на меня и задай любой вопрос!'
  },
  'designer': {
    name: 'Дизайнер',
    role: 'Создатель карусели',
    personality: 'креативный, стильный, знает тренды Instagram',
    topics: [
      'карусели для Instagram',
      'продающий контент',
      'визуальный сторителлинг',
      'дизайн без дизайнера',
      'вовлекающие посты',
      'контент для блога'
    ],
    callToAction: 'Нажми — создадим карусель за 2 минуты!'
  },
  'coach': {
    name: 'Коуч',
    role: 'ИИ КОУЧ',
    personality: 'мудрый, духовный, глубокий, понимающий',
    topics: [
      '6 Сутр жизни',
      'карма и судьба',
      'предназначение',
      'отношения и партнёрство',
      'деньги и изобилие',
      'духовный рост'
    ],
    callToAction: 'Нажми — найдём ответ в мудрости Сутр!'
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

// Вызов Gemini API для генерации приветствия
async function generateGreeting(
  token: string,
  characterId: string
): Promise<string> {
  const character = CHARACTERS[characterId as keyof typeof CHARACTERS]
  if (!character) {
    return 'Привет! Чем могу помочь?'
  }

  const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/gemini-2.5-flash:generateContent`

  // Выбираем случайную тему для этого приветствия
  const randomTopic = character.topics[Math.floor(Math.random() * character.topics.length)]

  const prompt = `Ты ${character.name} - ${character.role} в мобильном приложении AI CITI.
Твоя личность: ${character.personality}.

Сейчас ты на главном экране приложения. Пользователь видит тебя и может нажать, чтобы перейти к твоим функциям.

Сгенерируй короткую, живую фразу (10-18 слов) которая:
1. Упоминает одну из твоих тем: "${randomTopic}"
2. Мотивирует нажать на тебя
3. Звучит дружелюбно и по-человечески
4. Содержит 1-2 подходящих эмодзи

Призыв к действию (используй в конце или начале): "${character.callToAction}"

ВАЖНО: 
- НЕ начинай с "Привет" или "Здравствуй" - будь оригинальнее
- Будь конкретным — упоминай реальную пользу
- Пиши как живой персонаж, а не робот

Примеры хороших фраз:
- "Хочешь узнать, как ИИ может сэкономить 3 часа в день? 🚀 Нажми!"
- "Есть идея для карусели? 🎨 Сделаем за пару минут!"
- "Готов прокачать навыки ИИ? 📚 Новый урок ждёт!"

Сгенерируй ОДНУ фразу:`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 100,
        topP: 0.95,
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
    console.error(`Gemini error: ${response.status} - ${errorText}`)
    // Fallback приветствия по ролям
    const fallbacks: Record<string, string[]> = {
      'assistant': [
        'Есть вопрос? 🤔 Нажми — найдём ответ вместе!',
        'ИИ может многое! 🚀 Спроси меня о чём угодно',
        'Нужна помощь с задачей? 💡 Я готов!'
      ],
      'designer': [
        'Карусель за 2 минуты? 🎨 Легко! Нажми',
        'Контент для Instagram? ✨ Сделаем красиво!',
        'Идея для поста? 🎯 Создадим вместе!'
      ],
      'coach': [
        'Есть вопрос о жизни? 🧘 Найдём ответ в Сутрах!',
        'Мудрость 6 Сутр ждёт тебя! ✨ Нажми',
        'Узнай своё предназначение! 🌟 Спроси меня'
      ]
    }
    const charFallbacks = fallbacks[characterId] || fallbacks['assistant']
    return charFallbacks[Math.floor(Math.random() * charFallbacks.length)]
  }

  const data = await response.json()
  let greeting = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  
  // Если ответ пустой или слишком длинный, используем fallback
  if (!greeting || greeting.length > 100) {
    const fallbacks: Record<string, string[]> = {
      'assistant': [
        'Есть вопрос? 🤔 Нажми — найдём ответ вместе!',
        'ИИ может многое! 🚀 Спроси меня о чём угодно'
      ],
      'designer': [
        'Карусель за 2 минуты? 🎨 Легко! Нажми',
        'Контент для Instagram? ✨ Сделаем красиво!'
      ],
      'coach': [
        'Есть вопрос о жизни? 🧘 Найдём ответ в Сутрах!',
        'Мудрость 6 Сутр ждёт тебя! ✨ Нажми'
      ]
    }
    const charFallbacks = fallbacks[characterId] || fallbacks['assistant']
    greeting = charFallbacks[Math.floor(Math.random() * charFallbacks.length)]
  }

  return greeting
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { characterId } = await req.json()

    if (!characterId || !CHARACTERS[characterId as keyof typeof CHARACTERS]) {
      return new Response(
        JSON.stringify({ error: 'Invalid characterId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
    }

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    const greeting = await generateGreeting(token, characterId)

    return new Response(
      JSON.stringify({ greeting }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error generating greeting:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate greeting' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
