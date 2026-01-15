import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleAuth } from "https://deno.land/x/google_auth@v0.2.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROJECT_ID = "gen-lang-client-0824207691"
const LOCATION = "us-central1"
const MODEL = "gemini-2.0-flash-001"

// Системный промпт для ассистента
const SYSTEM_PROMPT = `Ты — AI-ассистент платформы AI CITI (НЕЙРОГОРОД).
Ты помогаешь пользователям с вопросами о:
- Сетевом маркетинге и MLM
- Создании контента для Instagram
- Использовании AI-инструментов на платформе
- Общих вопросах о бизнесе

Отвечай дружелюбно, по-русски, кратко и по делу.
Используй эмодзи уместно.
Если не знаешь ответ — честно скажи об этом.`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, history = [] } = await req.json()

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем credentials из переменных окружения
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
    }

    const credentials = JSON.parse(credentialsJson)

    // Создаём JWT для авторизации
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const token = await auth.getAccessToken()

    // Формируем историю сообщений
    const contents = [
      {
        role: "user",
        parts: [{ text: SYSTEM_PROMPT }]
      },
      {
        role: "model",
        parts: [{ text: "Понял! Я готов помогать пользователям AI CITI." }]
      },
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      })),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ]

    // Вызываем Vertex AI API
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
