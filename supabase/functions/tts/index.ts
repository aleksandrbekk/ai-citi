import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Создание JWT токена (копия из gemini-chat)
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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text } = await req.json()

        if (!text || text.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Text is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Лимит — 5000 символов
        const trimmedText = text.slice(0, 5000)

        // Получаем GCP credentials
        const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
        if (!credentialsJson) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT not configured')
        }
        const credentials = JSON.parse(credentialsJson)

        // Получаем access token
        const token = await getAccessToken(credentials)

        // Google Cloud TTS API
        const ttsResponse = await fetch(
            'https://texttospeech.googleapis.com/v1/text:synthesize',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: { text: trimmedText },
                    voice: {
                        languageCode: 'ru-RU',
                        name: 'ru-RU-Wavenet-D', // Мужской голос — спокойный, уверенный
                        ssmlGender: 'MALE',
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: 0.95, // Чуть медленнее — спокойный коуч
                        pitch: -1.0, // Чуть ниже — уверенный тон
                        volumeGainDb: 0,
                    },
                }),
            }
        )

        if (!ttsResponse.ok) {
            const error = await ttsResponse.text()
            console.error('TTS API error:', error)
            throw new Error(`TTS API error: ${ttsResponse.status}`)
        }

        const ttsData = await ttsResponse.json()

        // Возвращаем base64 аудио
        return new Response(
            JSON.stringify({
                audioContent: ttsData.audioContent,
                characters: trimmedText.length,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('TTS Error:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'TTS failed' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
