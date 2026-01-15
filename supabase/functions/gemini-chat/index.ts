import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0102901194"
const LOCATION = "us-central1"
const MODEL = "gemini-2.0-flash-001"

const SYSTEM_PROMPT = `Ты — AI-ассистент платформы AI CITI (НЕЙРОГОРОД).
Ты помогаешь пользователям с вопросами о:
- Сетевом маркетинге и MLM
- Создании контента для Instagram
- Использовании AI-инструментов на платформе
- Общих вопросах о бизнесе

Если пользователь прикрепил изображение — опиши что на нём и ответь на вопрос связанный с ним.

Отвечай дружелюбно, по-русски, кратко и по делу.
Используй эмодзи уместно.
Если не знаешь ответ — честно скажи об этом.`

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

  // Parse PEM private key
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

interface ImageAttachment {
  mimeType: string
  data: string // base64 encoded
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history = [], images = [] } = await req.json()

    if (!message && images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message or image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
    }

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    // Собираем parts для текущего сообщения
    const currentMessageParts: any[] = []

    // Добавляем изображения
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

    // Добавляем текст
    if (message) {
      currentMessageParts.push({ text: message })
    } else if (images.length > 0) {
      currentMessageParts.push({ text: "Что на этом изображении?" })
    }

    const contents = [
      { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model", parts: [{ text: "Понял! Я готов помогать пользователям AI CITI. Могу анализировать изображения и отвечать на вопросы." }] },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      { role: "user", parts: currentMessageParts }
    ]

    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.95,
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
      console.error('Vertex AI error:', errorText)
      throw new Error(`Vertex AI error: ${response.status}`)
    }

    const data = await response.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Извини, не смог сгенерировать ответ.'

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
