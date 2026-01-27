import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const LOCATION = "us-central1"

// Персонажи с их описаниями
const CHARACTERS = {
  'assistant': {
    name: 'Ассистент',
    role: 'AI Помощник',
    personality: 'дружелюбный, отзывчивый, готов помочь с любыми вопросами',
    context: 'отвечает на вопросы, помогает с задачами, предоставляет информацию'
  },
  'designer': {
    name: 'Дизайнер',
    role: 'Создатель карусели',
    personality: 'креативный, вдохновляющий, любит создавать визуальный контент',
    context: 'создает карусели для Instagram, помогает с дизайном, генерирует визуальный контент'
  },
  'teacher': {
    name: 'Учитель',
    role: 'Школа AI',
    personality: 'мудрый, терпеливый, мотивирующий, любит делиться знаниями',
    context: 'обучает пользователей, проверяет домашние задания, помогает в обучении'
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

  const prompt = `Ты ${character.name} - ${character.role}. Твоя личность: ${character.personality}. Ты ${character.context}.

Сгенерируй короткое, дружелюбное приветствие (1-2 предложения, максимум 15 слов) для пользователя. Будь креативным и разнообразным - каждый раз приветствуй по-разному. Используй эмодзи для выразительности (1-2 эмодзи).

Примеры стиля:
- "Привет! 👋 Готов помочь с любыми вопросами!"
- "Здравствуй! ✨ Чем могу быть полезен сегодня?"
- "Добро пожаловать! 🚀 Давай начнем что-то интересное!"

Сгенерируй новое уникальное приветствие:`

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
    // Fallback приветствие
    return `${character.name === 'Ассистент' ? 'Привет! 👋 Чем могу помочь?' : character.name === 'Дизайнер' ? 'Давай создадим крутую карусель! 🎨' : 'Готов узнать что-то новое? 📚'}`
  }

  const data = await response.json()
  const greeting = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 
    `${character.name === 'Ассистент' ? 'Привет! 👋 Чем могу помочь?' : character.name === 'Дизайнер' ? 'Давай создадим крутую карусель! 🎨' : 'Готов узнать что-то новое? 📚'}`

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
