import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ============================================================
// CAROUSEL ENGINE — AI генерация каруселей без n8n
// ============================================================

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Vertex AI settings (для Gemini через Service Account)
const VERTEX_PROJECT_ID = "gen-lang-client-0102901194"
const VERTEX_LOCATION = "us-central1"

// ============================================================
// FETCH WITH TIMEOUT (фикс #1: все fetch с таймаутами)
// ============================================================

async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number = 60000
): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        return response
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms: ${url.substring(0, 80)}`)
        }
        throw err
    } finally {
        clearTimeout(timer)
    }
}

// ============================================================
// API KEY ROTATION (ротация ключей)
// ============================================================

interface ApiKeyEntry {
    key: string
    label?: string
    enabled?: boolean
}

function getRotatedKeys(
    keysJson: ApiKeyEntry[] | null | undefined,
    singleKey: string | null
): string[] {
    // Combine: primary single key first, then rotation keys
    const allKeys: string[] = []

    // Primary key always goes first
    if (singleKey) allKeys.push(singleKey)

    // Add enabled rotation keys (skip duplicates of primary)
    if (keysJson && Array.isArray(keysJson) && keysJson.length > 0) {
        const enabled = keysJson.filter(k => k.enabled !== false && k.key && k.key !== singleKey)
        if (enabled.length > 0) {
            // Round-robin: rotate based on current minute to spread load
            const offset = Math.floor(Date.now() / 60000) % enabled.length
            const rotated = [...enabled.slice(offset), ...enabled.slice(0, offset)]
            allKeys.push(...rotated.map(k => k.key))
        }
    }

    return allKeys
}

async function tryWithKeyRotation<T>(
    keys: string[],
    fn: (key: string, index: number) => Promise<T>,
    providerName: string
): Promise<T> {
    let lastError: Error | null = null
    for (let i = 0; i < keys.length; i++) {
        try {
            return await fn(keys[i], i)
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err)
            console.warn(`[Engine] Key ${i + 1}/${keys.length} for ${providerName} failed: ${errMsg}`)
            // Only retry on rate limit / auth errors
            if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('rate') ||
                errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('billing')) {
                lastError = err instanceof Error ? err : new Error(errMsg)
                continue
            }
            // Non-retryable error — throw immediately
            throw err
        }
    }
    throw lastError || new Error(`All ${keys.length} keys exhausted for ${providerName}`)
}

// ============================================================
// TYPES
// ============================================================

interface EngineConfig {
    text_provider: 'gemini' | 'openrouter'
    text_api_key: string
    text_model: string
    text_fallback_provider: string | null
    text_fallback_key: string | null
    text_fallback_model: string | null
    text_api_keys: ApiKeyEntry[] | null
    text_fallback_keys: ApiKeyEntry[] | null
    image_provider: 'openrouter' | 'gemini' | 'imagen' | 'ideogram'
    image_api_key: string
    image_model: string
    image_api_keys: ApiKeyEntry[] | null
    image_fallback_provider: string | null
    image_fallback_model: string | null
    image_fallback_key: string | null
    image_fallback_keys: ApiKeyEntry[] | null
    telegram_bot_token: string
    cloudinary_cloud: string
    cloudinary_preset: string
    max_retries: number
    use_search_grounding: boolean
}

interface SlideContent {
    slideNumber: number
    type: 'HOOK' | 'CONTENT' | 'CTA' | 'VIRAL'
    headline: string
    subheadline?: string
    body_text?: string
    transition?: string
    pose?: string
    emotion?: string
    human_mode: 'FACE' | 'NONE'
    overlay_text?: string[]
    content_layout?: string
    content_details?: string
    // Legacy fields (backward compat)
    content?: string
    visualTask?: string
    emoji?: string
}

interface CopywriterResponse {
    slides: SlideContent[]
    post_text: string
}

interface GenerationPayload {
    chatId: number
    topic: string
    userPhoto?: string | null
    cta?: string
    ctaType?: string
    gender?: string
    styleId: string
    styleConfig: Record<string, unknown>
    globalSystemPrompt?: string
    stylePrompt?: string
    vasiaCore?: Record<string, unknown>
    formatConfig?: Record<string, unknown>
    formatId?: string
    formatSystemPrompt?: string
    primaryColor?: string
    objectImage?: string
    objectPlacement?: string
}

// ============================================================
// SUPABASE CLIENT
// ============================================================

function getSupabaseClient() {
    const url = Deno.env.get('SUPABASE_URL')!
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    return createClient(url, key)
}

// ============================================================
// CONFIG: Чтение конфига из БД
// ============================================================

async function getEngineConfig(): Promise<EngineConfig> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('ai_engine_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()

    if (error || !data) {
        throw new Error(`Config not found: ${error?.message || 'no active config'}`)
    }

    return data as EngineConfig
}

// ============================================================
// LOGGING: Создание и обновление лога генерации
// ============================================================

async function createGenLog(userId: number, topic: string, styleId: string, config: EngineConfig): Promise<string> {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
        .from('ai_generation_logs')
        .insert({
            user_id: userId,
            topic,
            style_id: styleId,
            text_provider: config.text_provider,
            text_model: config.text_model,
            image_provider: config.image_provider,
            image_model: config.image_model,
            status: 'pending',
        })
        .select('id')
        .single()

    if (error) {
        console.error('[Engine] Failed to create log:', error)
        return '' // не критично
    }
    return data.id
}

async function updateGenLog(logId: string, updates: Record<string, unknown>) {
    if (!logId) return
    const supabase = getSupabaseClient()
    await supabase
        .from('ai_generation_logs')
        .update(updates)
        .eq('id', logId)
}

// ============================================================
// JWT AUTH для Vertex AI (Service Account)
// ============================================================

async function createJWT(credentials: { client_email: string; private_key: string }): Promise<string> {
    const header = { alg: "RS256", typ: "JWT" }
    const now = Math.floor(Date.now() / 1000)
    const payload = {
        iss: credentials.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    }

    const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)))
    const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)))
    const signInput = `${headerB64}.${payloadB64}`

    // Import private key
    const pemBody = credentials.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\n/g, "")

    const binaryDer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
        "pkcs8",
        binaryDer,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        key,
        new TextEncoder().encode(signInput)
    )

    const signatureB64 = base64url(new Uint8Array(signature))
    return `${signInput}.${signatureB64}`
}

async function getAccessToken(credentials: { client_email: string; private_key: string }): Promise<string> {
    const jwt = await createJWT(credentials)
    const response = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    }, 15000)

    if (!response.ok) {
        const error = await response.text()
        throw new Error(`Token error: ${error}`)
    }

    const data = await response.json()
    return data.access_token
}

// ============================================================
// TEXT PROVIDERS
// ============================================================

// --- Gemini (Vertex AI) ---
async function generateTextGemini(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    useGrounding: boolean
): Promise<string> {
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) throw new Error('GOOGLE_SERVICE_ACCOUNT not set')

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`

    const requestBody: Record<string, unknown> = {
        contents: [
            {
                role: 'user',
                parts: [{ text: userPrompt }]
            }
        ],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 8192,
            topP: 0.9,
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
    }

    // Google Search Grounding (Gemini 2.5+ uses google_search)
    if (useGrounding) {
        requestBody.tools = [
            {
                google_search: {}
            }
        ]
    }

    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    }, 90000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

// --- OpenRouter ---
async function generateTextOpenRouter(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    apiKey: string
): Promise<string> {
    const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://aiciti.pro',
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 8192,
        }),
    }, 90000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

// --- Unified text generation (с ротацией ключей + фикс fallback) ---
async function generateText(
    systemPrompt: string,
    userPrompt: string,
    config: EngineConfig
): Promise<{ text: string; keyIndex: number }> {
    // Primary provider with key rotation
    try {
        if (config.text_provider === 'gemini') {
            // Gemini uses service account, no API key rotation
            const text = await generateTextGemini(systemPrompt, userPrompt, config.text_model, config.use_search_grounding)
            return { text, keyIndex: 0 }
        } else {
            // OpenRouter — rotate API keys
            const keys = getRotatedKeys(config.text_api_keys, config.text_api_key)
            if (keys.length === 0) throw new Error('No text API keys configured')
            let resultText = ''
            let resultIdx = 0
            await tryWithKeyRotation(keys, async (key, idx) => {
                resultText = await generateTextOpenRouter(systemPrompt, userPrompt, config.text_model, key)
                resultIdx = idx
            }, 'text-openrouter')
            return { text: resultText, keyIndex: resultIdx }
        }
    } catch (err) {
        console.error(`[Engine] Primary text (${config.text_provider}) failed:`, err)

        // Fallback: use text_fallback_model (FIX: раньше использовалась text_model от основного провайдера)
        if (config.text_fallback_provider) {
            const fallbackModel = config.text_fallback_model || config.text_model
            console.log(`[Engine] Trying fallback: ${config.text_fallback_provider} / ${fallbackModel}`)

            if (config.text_fallback_provider === 'openrouter') {
                const fallbackKeys = getRotatedKeys(config.text_fallback_keys, config.text_fallback_key)
                if (fallbackKeys.length === 0) throw err
                let resultText = ''
                await tryWithKeyRotation(fallbackKeys, async (key) => {
                    resultText = await generateTextOpenRouter(systemPrompt, userPrompt, fallbackModel, key)
                }, 'text-fallback-openrouter')
                return { text: resultText, keyIndex: -1 }
            } else if (config.text_fallback_provider === 'gemini') {
                // FIX: use fallbackModel, not primary text_model
                const text = await generateTextGemini(systemPrompt, userPrompt, fallbackModel, config.use_search_grounding)
                return { text, keyIndex: -1 }
            }
        }

        throw err
    }
}

// ============================================================
// IMAGE PROVIDERS
// ============================================================

// --- Google Imagen (Vertex AI) ---
async function generateImageImagen(
    prompt: string,
    model: string
): Promise<Uint8Array> {
    const credentialsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')
    if (!credentialsJson) throw new Error('GOOGLE_SERVICE_ACCOUNT not set')

    const credentials = JSON.parse(credentialsJson)
    const token = await getAccessToken(credentials)

    // Используем model из конфига БД (imagen-4, imagen-3.0-generate-002 и т.д.)
    const modelId = model || 'imagen-3.0-generate-002'
    console.log(`[Engine] Using image model: ${modelId}`)
    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelId}:predict`

    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: "3:4",
                personGeneration: "allow_all",
                enhancePrompt: true,
                safetySetting: "block_only_high",
            }
        }),
    }, 120000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Imagen error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const base64Image = data.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image generated')

    // Decode base64 to Uint8Array
    const binaryStr = atob(base64Image)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i)
    }
    return bytes
}

// --- Ideogram ---
async function generateImageIdeogram(
    prompt: string,
    _model: string,
    apiKey: string
): Promise<Uint8Array> {
    const response = await fetchWithTimeout('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
            'Api-Key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image_request: {
                prompt,
                aspect_ratio: "ASPECT_3_4",
                model: "V_2",
                magic_prompt_option: "AUTO",
            }
        }),
    }, 120000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ideogram error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url
    if (!imageUrl) throw new Error('No image URL from Ideogram')

    // Download the image
    const imgResponse = await fetchWithTimeout(imageUrl, {}, 30000)
    const imgBuffer = await imgResponse.arrayBuffer()
    return new Uint8Array(imgBuffer)
}

// --- Fetch user photo and convert to base64 ---
async function fetchPhotoAsBase64(photoUrl: string): Promise<string | null> {
    try {
        // Optimize Cloudinary URL for faster loading
        let url = photoUrl
        if (url.includes('cloudinary.com')) {
            url = url.replace('/upload/', '/upload/f_jpg,q_auto,w_768/')
        }

        console.log(`[Engine] Fetching user photo: ${url.substring(0, 80)}...`)
        const response = await fetchWithTimeout(url, {}, 30000)
        if (!response.ok) {
            console.error(`[Engine] Photo fetch failed: ${response.status}`)
            return null
        }

        const buffer = await response.arrayBuffer()
        const bytes = new Uint8Array(buffer)

        // Convert to base64
        let binary = ''
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
        console.log(`[Engine] Photo fetched, base64 length: ${base64.length}`)
        return base64
    } catch (err) {
        console.error('[Engine] Failed to fetch user photo:', err)
        return null
    }
}

// --- Gemini Native Image Generation (Google AI Studio API) ---
async function generateImageGemini(
    prompt: string,
    model: string,
    apiKey: string,
    referenceImageBase64?: string | null
): Promise<Uint8Array> {
    if (!apiKey || apiKey === 'via_service_account') {
        throw new Error('Gemini image requires a Google AI Studio API key in image_api_key')
    }

    const modelId = model || 'gemini-3-pro-image-preview'
    console.log(`[Engine] Using Gemini image model: ${modelId} (AI Studio)${referenceImageBase64 ? ' + reference photo' : ''}`)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`

    // Build parts: reference image (if provided) + text prompt
    const parts: Record<string, unknown>[] = []

    if (referenceImageBase64) {
        parts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: referenceImageBase64,
            }
        })
    }

    parts.push({ text: prompt })

    const response = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts,
            }],
            generationConfig: {
                responseModalities: ['IMAGE', 'TEXT'],
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
            ],
        }),
    }, 120000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini Image error ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    // Gemini returns image in parts as inlineData
    const responseParts = data.candidates?.[0]?.content?.parts || []
    for (const part of responseParts) {
        if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
            const base64Image = part.inlineData.data
            const binaryStr = atob(base64Image)
            const bytes = new Uint8Array(binaryStr.length)
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i)
            }
            return bytes
        }
    }

    throw new Error('Gemini did not return an image in response')
}

// --- OpenRouter Image Generation (как в n8n) ---
async function generateImageOpenRouter(
    prompt: string,
    model: string,
    apiKey: string,
    referenceImageBase64?: string | null
): Promise<Uint8Array> {
    const modelId = model || 'google/gemini-3-pro-image-preview'
    console.log(`[Engine] Using OpenRouter image model: ${modelId}${referenceImageBase64 ? ' + reference photo' : ''}`)

    // Build messages: reference image (if provided) + text prompt
    const contentParts: Record<string, unknown>[] = []

    if (referenceImageBase64) {
        contentParts.push({
            type: 'image_url',
            image_url: {
                url: `data:image/jpeg;base64,${referenceImageBase64}`,
            }
        })
    }

    contentParts.push({ type: 'text', text: prompt })

    const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://aiciti.pro',
        },
        body: JSON.stringify({
            model: modelId,
            messages: [
                {
                    role: 'user',
                    content: contentParts,
                }
            ],
            modalities: ['image', 'text'],
        }),
    }, 120000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter Image error ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    let imageBase64: string | null = null

    try {
        const msg = data.choices?.[0]?.message

        // Attempt 1: OpenRouter images field — message.images[0].image_url.url
        if (msg?.images?.[0]?.image_url?.url) {
            const imageUrl = msg.images[0].image_url.url
            if (imageUrl.startsWith('data:image/')) {
                imageBase64 = imageUrl.replace(/^data:image\/\w+;base64,/, '')
            }
        }

        // Attempt 2: OpenRouter multipart content — message.content[] with image_url
        if (!imageBase64 && Array.isArray(msg?.content)) {
            for (const part of msg.content) {
                if (part.image_url?.url?.startsWith('data:image/')) {
                    imageBase64 = part.image_url.url.replace(/^data:image\/\w+;base64,/, '')
                    break
                }
            }
        }

        // Attempt 3: Native Gemini format — candidates[0].content.parts[].inlineData.data
        if (!imageBase64 && data.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    imageBase64 = part.inlineData.data
                    break
                }
            }
        }
    } catch (e) {
        console.error('[Engine] Error extracting image from response:', e)
    }

    if (imageBase64) {
        const binaryStr = atob(imageBase64)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i)
        }
        return bytes
    }

    // Log response structure for debugging
    const responseKeys = JSON.stringify({
        hasChoices: !!data.choices,
        messageKeys: data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : [],
        hasCandidates: !!data.candidates,
        contentType: typeof data.choices?.[0]?.message?.content,
    })
    throw new Error(`OpenRouter did not return an image. Response structure: ${responseKeys}`)
}

// --- Image generation by provider (с ротацией ключей) ---
async function generateImageWithProvider(
    prompt: string,
    provider: string,
    model: string,
    singleKey: string | null,
    keysJson: ApiKeyEntry[] | null | undefined,
    referenceImageBase64?: string | null
): Promise<Uint8Array> {
    if (provider === 'openrouter') {
        const keys = getRotatedKeys(keysJson, singleKey)
        if (keys.length === 0) throw new Error('No OpenRouter image API keys configured')
        let result: Uint8Array = new Uint8Array()
        await tryWithKeyRotation(keys, async (key) => {
            result = await generateImageOpenRouter(prompt, model, key, referenceImageBase64)
        }, 'image-openrouter')
        return result
    } else if (provider === 'gemini') {
        const keys = getRotatedKeys(keysJson, singleKey)
        if (keys.length === 0) throw new Error('No Gemini image API keys configured')
        let result: Uint8Array = new Uint8Array()
        await tryWithKeyRotation(keys, async (key) => {
            result = await generateImageGemini(prompt, model, key, referenceImageBase64)
        }, 'image-gemini')
        return result
    } else if (provider === 'imagen') {
        // Imagen uses service account (no API key rotation needed)
        return await generateImageImagen(prompt, model)
    } else {
        // ideogram
        const keys = getRotatedKeys(keysJson, singleKey)
        if (keys.length === 0) throw new Error('No Ideogram API keys configured')
        let result: Uint8Array = new Uint8Array()
        await tryWithKeyRotation(keys, async (key) => {
            result = await generateImageIdeogram(prompt, model, key)
        }, 'image-ideogram')
        return result
    }
}

// --- Unified image generation (с fallback на другой провайдер) ---
async function generateImage(
    prompt: string,
    config: EngineConfig,
    referenceImageBase64?: string | null
): Promise<Uint8Array> {
    // Primary provider
    try {
        return await generateImageWithProvider(
            prompt, config.image_provider, config.image_model,
            config.image_api_key, config.image_api_keys,
            referenceImageBase64
        )
    } catch (err) {
        console.error(`[Engine] Primary image (${config.image_provider}) failed:`, err)

        // Image fallback (NEW: раньше не было)
        if (config.image_fallback_provider) {
            console.log(`[Engine] Trying image fallback: ${config.image_fallback_provider}`)
            return await generateImageWithProvider(
                prompt, config.image_fallback_provider,
                config.image_fallback_model || config.image_model,
                config.image_fallback_key,
                config.image_fallback_keys,
                referenceImageBase64
            )
        }
        throw err
    }
}

// ============================================================
// CLOUDINARY UPLOAD
// ============================================================

async function uploadToCloudinary(
    imageBytes: Uint8Array,
    cloudName: string,
    uploadPreset: string,
    slideIndex: number
): Promise<string> {
    // Convert Uint8Array to base64
    let binary = ''
    for (let i = 0; i < imageBytes.length; i++) {
        binary += String.fromCharCode(imageBytes[i])
    }
    const base64 = btoa(binary)
    const dataUri = `data:image/png;base64,${base64}`

    const formData = new FormData()
    formData.append('file', dataUri)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'carousels')
    formData.append('public_id', `slide_${slideIndex}_${Date.now()}`)

    const response = await fetchWithTimeout(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    }, 60000)

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloudinary error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.secure_url
}

// ============================================================
// CLOUDINARY CLEANUP (auto-delete after 24h)
// ============================================================

async function sha1(message: string): Promise<string> {
    const data = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function extractPublicId(url: string): string | null {
    const match = url.match(/\/upload\/(?:v\d+\/|[^/]*\/)?(.+)\.\w+$/)
    return match ? match[1] : null
}

async function destroyCloudinaryImage(publicId: string, cloudName: string, apiKey: string, apiSecret: string): Promise<boolean> {
    try {
        const timestamp = Math.floor(Date.now() / 1000)
        const signature = await sha1(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)

        const formData = new URLSearchParams()
        formData.append('public_id', publicId)
        formData.append('api_key', apiKey)
        formData.append('timestamp', timestamp.toString())
        formData.append('signature', signature)

        const response = await fetchWithTimeout(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
            { method: 'POST', body: formData },
            15000
        )
        const result = await response.json()
        return result.result === 'ok' || result.result === 'not found'
    } catch (err) {
        console.error(`[Cloudinary] Failed to delete ${publicId}:`, err)
        return false
    }
}

async function cleanupOldCloudinaryImages(config: EngineConfig): Promise<number> {
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY')
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET')
    if (!apiKey || !apiSecret) {
        console.log('[Cloudinary] No API_KEY/SECRET — skipping cleanup')
        return 0
    }

    const supabase = getSupabaseClient()

    // Find logs older than 24h with images that haven't been cleaned
    const { data: oldLogs, error } = await supabase
        .from('ai_generation_logs')
        .select('id, image_urls')
        .eq('cloudinary_cleaned', false)
        .not('image_urls', 'is', null)
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(10) // Process max 10 per run to avoid timeouts

    if (error || !oldLogs || oldLogs.length === 0) return 0

    let totalDeleted = 0

    for (const log of oldLogs) {
        const urls: string[] = log.image_urls || []
        let allDeleted = true

        for (const url of urls) {
            const publicId = extractPublicId(url)
            if (!publicId) continue
            const ok = await destroyCloudinaryImage(publicId, config.cloudinary_cloud, apiKey, apiSecret)
            if (ok) totalDeleted++
            else allDeleted = false
        }

        // Mark as cleaned even if some failed (to avoid infinite retry)
        await supabase
            .from('ai_generation_logs')
            .update({ cloudinary_cleaned: true })
            .eq('id', log.id)

        if (!allDeleted) {
            console.warn(`[Cloudinary] Some images failed to delete for log ${log.id}`)
        }
    }

    return totalDeleted
}

// ============================================================
// TELEGRAM DELIVERY
// ============================================================

async function sendStatusToTelegram(chatId: number, text: string, botToken: string): Promise<void> {
    try {
        await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        }, 15000)
    } catch {
        // Не критично — статусное сообщение
    }
}

async function sendToTelegram(
    chatId: number,
    imageUrls: string[],
    topic: string,
    botToken: string,
    postText?: string
): Promise<void> {
    // Отправляем все картинки как media group (альбом)
    if (imageUrls.length > 0) {
        // Caption: use AI-generated post_text or fallback
        const caption = postText
            ? postText.substring(0, 1024)
            : `🎨 Карусель: ${topic}\n\n✅ Готово! ${imageUrls.length} слайдов`

        const media = imageUrls.map((url, i) => ({
            type: 'photo',
            media: url,
            ...(i === 0 ? { caption } : {}),
        }))

        const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                media,
            }),
        }, 15000)

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Engine] Telegram media group error:', errorText)

            // Fallback: отправляем по одной
            for (const url of imageUrls) {
                await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: url,
                    }),
                }, 15000)
            }
        }
    }
}

async function sendErrorToTelegram(chatId: number, error: string, botToken: string) {
    await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `❌ Ошибка генерации карусели:\n${error}\n\n💰 Монеты возвращены на баланс.\nПопробуйте ещё раз.`,
        }),
    }, 15000)
}

// ============================================================
// VASIA_CORE HELPERS (ported from carouselStyles.ts)
// ============================================================

type NicheType = 'business' | 'health' | 'relationships' | 'education' | 'creativity' | 'lifestyle' | 'parenting' | 'cooking' | 'default'
type ContentTone = 'problem_aware' | 'solution_focused' | 'celebratory' | 'educational'
type SlideType = 'HOOK' | 'CONTENT' | 'CTA' | 'VIRAL'

function detectNiche(topic: string, vasiaCore: Record<string, unknown>): NicheType {
    const lower = topic.toLowerCase()
    const detector = vasiaCore?.niche_detector as Record<string, { keywords: string[] }> | undefined
    if (!detector) return 'default'

    for (const [niche, config] of Object.entries(detector)) {
        if (config.keywords?.some((kw: string) => lower.includes(kw.toLowerCase()))) {
            return niche as NicheType
        }
    }
    return 'default'
}

function detectTone(headline: string): ContentTone {
    const lower = headline.toLowerCase()
    const problemWords = ['ошибк', 'проблем', 'почему не', 'как не', 'что делать', 'помощь', 'сложно', 'трудно']
    const celebWords = ['достиг', 'успех', 'победа', 'результат', 'сделал', 'получил', 'наконец']
    const eduWords = ['урок', 'совет', 'факт', 'знай', 'запомни', 'важно', 'правило']
    const solWords = ['как ', 'способ', 'метод', 'секрет', 'шаг', 'план', 'система']

    if (problemWords.some(w => lower.includes(w))) return 'problem_aware'
    if (celebWords.some(w => lower.includes(w))) return 'celebratory'
    if (eduWords.some(w => lower.includes(w))) return 'educational'
    if (solWords.some(w => lower.includes(w))) return 'solution_focused'
    return 'solution_focused'
}

function selectPose(slideType: SlideType, contentTone: ContentTone, vasiaCore: Record<string, unknown>): string {
    const poses = vasiaCore?.poses_universal as Record<string, { prompt: string }> | undefined
    const posesByMood = vasiaCore?.poses_by_mood as Record<string, string[]> | undefined
    if (!poses || !posesByMood) return 'Natural, engaging pose, open and approachable'

    let moodKey = 'professional'
    if (slideType === 'CTA') moodKey = 'warm_personal'
    else if (contentTone === 'problem_aware') moodKey = 'problem_aware'
    else if (contentTone === 'celebratory') moodKey = 'celebratory'
    else if (contentTone === 'educational') moodKey = 'educational'
    else moodKey = 'solution_focused'

    const suitableIds = posesByMood[moodKey] || ['PRESENTING', 'CONFIDENT', 'WELCOMING']
    const poseId = suitableIds[0]
    return poses[poseId]?.prompt || 'Natural, engaging pose, open and approachable'
}

function selectEmotion(slideType: SlideType, contentTone: ContentTone, vasiaCore: Record<string, unknown>): string {
    const emotions = vasiaCore?.emotions_spectrum as Record<string, { prompt: string }> | undefined
    const emotionsByContent = vasiaCore?.emotions_by_content_type as Record<string, string[]> | undefined
    if (!emotions || !emotionsByContent) return 'Warm and friendly, genuine expression'

    if (slideType === 'CTA') return emotions['WARM']?.prompt || 'Warm and friendly, genuine expression'

    let contentType = 'personal_story'
    if (contentTone === 'problem_aware') contentType = 'problem_solution'
    else if (contentTone === 'solution_focused') contentType = 'how_to_guide'
    else if (contentTone === 'celebratory') contentType = 'celebration'
    else if (contentTone === 'educational') contentType = 'tips_tricks'

    const suitableIds = emotionsByContent[contentType] || ['CONFIDENT', 'WARM', 'INSPIRED']
    const emotionId = suitableIds[slideType === 'HOOK' ? 0 : 1]
    return emotions[emotionId]?.prompt || 'Warm and friendly, genuine expression'
}

function selectOutfit(niche: NicheType, slideType: SlideType, vasiaCore: Record<string, unknown>): string {
    const outfits = vasiaCore?.outfit_by_niche as Record<string, { hook: string; cta: string }> | undefined
    if (!outfits) return 'Modern smart casual, clean and professional yet approachable'
    const nicheOutfit = outfits[niche] || outfits['default']
    if (!nicheOutfit) return 'Modern smart casual, clean and professional yet approachable'
    return slideType === 'HOOK' ? nicheOutfit.hook : nicheOutfit.cta
}

function selectProps(niche: NicheType, contentTone: ContentTone, vasiaCore: Record<string, unknown>): string {
    const propsByNiche = vasiaCore?.props_by_niche as Record<string, Record<string, { props: string }>> | undefined
    if (!propsByNiche) return 'Modern workspace, laptop, coffee, plants, clean aesthetic'
    const nicheProps = propsByNiche[niche] || propsByNiche['default']
    if (!nicheProps) return 'Modern workspace, laptop, coffee, plants, clean aesthetic'
    const variant = contentTone === 'problem_aware' ? 'challenge' : 'success'
    return nicheProps[variant]?.props || nicheProps['success']?.props || 'Modern workspace, laptop, coffee, plants, clean aesthetic'
}

function selectViralTarget(vasiaCore: Record<string, unknown>): string {
    const targets = vasiaCore?.viral_targets as Record<string, string> | undefined
    if (!targets) return 'ТОМУ КОМУ ЭТО НУЖНО'
    const keys = Object.keys(targets)
    return targets[keys[Math.floor(Math.random() * keys.length)]] || 'ТОМУ КОМУ ЭТО НУЖНО'
}

// ============================================================
// PIPELINE: Построение промптов
// ============================================================

function buildCopywriterPrompt(payload: GenerationPayload): { systemPrompt: string; userPrompt: string } {
    const styleConfig = payload.styleConfig || {}
    const contentSystemPrompt = styleConfig.content_system_prompt as string || ''
    const globalSystemPrompt = payload.globalSystemPrompt || ''
    const topic = payload.topic || ''

    // Логика приоритетов:
    // 1. Admin content_system_prompt (если > 20 символов) — уже содержит формат
    // 2. Global system prompt из БД — уже содержит формат
    // 3. Базовый fallback с rich JSON форматом
    let systemPrompt = ''

    if (contentSystemPrompt && contentSystemPrompt.length > 20) {
        systemPrompt = contentSystemPrompt
        if (!systemPrompt.includes('{topic}')) {
            systemPrompt = `ТЕМА: ${topic}\n\n${systemPrompt}`
        }
        systemPrompt = systemPrompt.replace(/{topic}/g, topic)
    } else if (globalSystemPrompt && globalSystemPrompt.length > 20) {
        systemPrompt = globalSystemPrompt
        if (!systemPrompt.includes('{topic}')) {
            systemPrompt = `ТЕМА: ${topic}\n\n${systemPrompt}`
        }
        systemPrompt = systemPrompt.replace(/{topic}/g, topic)
    } else {
        // Fallback: rich JSON format instructions
        systemPrompt = `Ты — профессиональный копирайтер для Instagram каруселей.
Создай структуру из 9 слайдов на указанную тему.

ФОРМАТ ОТВЕТА — СТРОГО JSON объект:
{
  "slides": [
    {
      "slideNumber": 1,
      "type": "HOOK",
      "headline": "Главный заголовок (крупный, цепляющий, до 6 слов)",
      "subheadline": "Подзаголовок (до 10 слов)",
      "body_text": "Основной текст для нижней карточки",
      "pose": "описание позы человека на русском",
      "emotion": "описание эмоции человека на русском",
      "human_mode": "FACE"
    },
    {
      "slideNumber": 2,
      "type": "CONTENT",
      "headline": "Заголовок слайда",
      "body_text": "Основной контент — список, факты, советы",
      "transition": "Переходная фраза к следующему слайду",
      "human_mode": "NONE",
      "content_layout": "numbered_list | comparison | checklist | infographic | quote",
      "content_details": "Подробное описание контента для визуализации"
    },
    ... (слайды 3-7 — CONTENT, аналогично слайду 2)
    {
      "slideNumber": 8,
      "type": "CTA",
      "headline": "ПИШИ: {CTA_CODE}",
      "body_text": "Выгода для подписчика + призыв написать кодовое слово",
      "pose": "описание позы",
      "emotion": "описание эмоции",
      "human_mode": "FACE"
    },
    {
      "slideNumber": 9,
      "type": "VIRAL",
      "headline": "ОТПРАВЬ ЭТО",
      "subheadline": "кому именно отправить",
      "human_mode": "NONE"
    }
  ],
  "post_text": "Текст для Instagram caption (200-300 слов, хэштеги, эмодзи)"
}

ПРАВИЛА:
- Слайд 1 (HOOK) и 8 (CTA): human_mode="FACE" — с человеком
- Слайды 2-7 (CONTENT) и 9 (VIRAL): human_mode="NONE" — без человека
- headline: короткий, крупный текст (до 6 слов)
- content_layout: выбери из вариантов для каждого CONTENT слайда
- Чередуй content_layout: не повторяй один и тот же два раза подряд
- ОБЯЗАТЕЛЬНО: Слайд 8 (CTA) — headline ДОЛЖЕН содержать кодовое слово/CTA из запроса пользователя. Формат: "ПИШИ: {CTA_CODE}" где {CTA_CODE} — это кодовое слово. Это КРИТИЧЕСКИ важно!
- post_text: полноценный Instagram caption с CTA и хэштегами, включая кодовое слово
- Верни ТОЛЬКО JSON, без markdown, без пояснений`
    }

    // userPrompt: ТОЛЬКО тема, пол, CTA — БЕЗ описания формата (формат уже в systemPrompt)
    const ctaCode = payload.cta || 'ПОДПИШИСЬ'
    const userPrompt = `Тема: "${topic}".
Пол для склонений: ${payload.gender || 'male'}.
Кодовое слово / CTA: "${ctaCode}".
ВАЖНО: На слайде 8 (CTA) headline ОБЯЗАТЕЛЬНО должен содержать "${ctaCode}" — это кодовое слово продукта!
Верни ТОЛЬКО JSON.`

    return { systemPrompt, userPrompt }
}

function buildImagePrompt(slide: SlideContent, stylePrompt: string, payload: GenerationPayload, hasReferencePhoto: boolean): string {
    const styleConfig = payload.styleConfig || {}
    const slideTemplates = styleConfig.slide_templates as Record<string, string> | undefined
    const vasiaCore = payload.vasiaCore || {}
    const slideType = (slide.type || 'CONTENT') as SlideType
    const topic = payload.topic || ''
    const isFaceSlide = slide.human_mode === 'FACE' || slideType === 'HOOK' || slideType === 'CTA'
    const referenceInstruction = hasReferencePhoto && isFaceSlide
        ? '\n[INSTRUCTION: Person must be clearly visible from chest up. Use the provided reference image for the person\'s appearance — same face, same features. All visible text on slide must be in Russian language.]'
        : '\n[INSTRUCTION: All text shown on the image must be in Russian/Cyrillic only. Do NOT render any English text on the slide.]'

    // Detect niche and tone for VASIA_CORE helpers
    const niche = detectNiche(topic, vasiaCore)
    const contentTone = detectTone(slide.headline || topic)

    // Try to get slide template from styleConfig
    const template = slideTemplates?.[slideType]

    if (template) {
        // Fill placeholders in the template
        let prompt = template

        // Text placeholders
        prompt = prompt.replace(/\{HEADLINE_1\}/g, slide.headline || '')
        prompt = prompt.replace(/\{HEADLINE_2\}/g, slide.subheadline || '')
        prompt = prompt.replace(/\{HEADLINE\}/g, slide.headline || '')
        prompt = prompt.replace(/\{BOTTOM_TEXT\}/g, slide.body_text || '')
        prompt = prompt.replace(/\{TRANSITION\}/g, slide.transition || '')
        prompt = prompt.replace(/\{CTA_HEADLINE\}/g, slide.headline || '')
        prompt = prompt.replace(/\{BENEFIT_TEXT\}/g, slide.body_text || '')
        prompt = prompt.replace(/\{VIRAL_TARGET\}/g, slide.subheadline || selectViralTarget(vasiaCore))

        // VASIA_CORE placeholders — pose and emotion from AI response or helpers
        const posePrompt = slide.pose
            ? slide.pose
            : selectPose(slideType, contentTone, vasiaCore)
        const emotionPrompt = slide.emotion
            ? slide.emotion
            : selectEmotion(slideType, contentTone, vasiaCore)

        prompt = prompt.replace(/\[POSE\]/g, posePrompt)
        prompt = prompt.replace(/\[EMOTION\]/g, emotionPrompt)

        // Outfit
        const outfitHook = selectOutfit(niche, 'HOOK', vasiaCore)
        const outfitCta = selectOutfit(niche, 'CTA', vasiaCore)
        prompt = prompt.replace(/\[OUTFIT_BY_TOPIC\]/g, outfitHook)
        prompt = prompt.replace(/\[OUTFIT_CTA\]/g, outfitCta)

        // Props
        const props = selectProps(niche, contentTone, vasiaCore)
        prompt = prompt.replace(/\[PROPS\]/g, props)

        // CTA product code
        prompt = prompt.replace(/\[PRODUCT_CODE\]/g, payload.cta || 'ПОДПИШИСЬ')

        // Content layout
        prompt = prompt.replace(/\[CONTENT_LAYOUT\]/g, slide.content_layout || 'clean structured layout')
        prompt = prompt.replace(/\[CONTENT_DETAILS\]/g, slide.content_details || slide.body_text || '')

        // Custom color override
        if (payload.primaryColor) {
            prompt += `\n[COLOR_OVERRIDE: Use ${payload.primaryColor} as primary accent color instead of default.]`
        }

        prompt += referenceInstruction

        return prompt
    }

    // Fallback: no slide template available — use stylePrompt + basic description
    let prompt = ''

    if (slideType === 'HOOK' || slideType === 'CTA') {
        // Slides with person
        const posePrompt = slide.pose || selectPose(slideType, contentTone, vasiaCore)
        const emotionPrompt = slide.emotion || selectEmotion(slideType, contentTone, vasiaCore)
        const outfit = selectOutfit(niche, slideType, vasiaCore)
        const props = selectProps(niche, contentTone, vasiaCore)

        // CTA vs HOOK: разные промпты
        if (slideType === 'CTA' && payload.cta) {
            prompt = `Create a vertical portrait image, taller than wide.
${stylePrompt ? stylePrompt + '\n' : ''}
LAYOUT: Person on the LEFT side (40% of frame). On the RIGHT side — a large frosted glass card (glassmorphism style, rounded corners, semi-transparent white).
INSIDE the glass card, centered: Large bold text "ПИШИ: ${payload.cta}" in vibrant orange with glow effect.${slide.body_text ? `\nBelow that, smaller text inside the same card: "${slide.body_text}"` : ''}

Person: chest up to waist.
Pose: ${posePrompt}
Expression: ${emotionPrompt}
Outfit: ${outfit}

Photorealistic, NOT illustration. Cinematic lighting. 8K. ALL text MUST be INSIDE the glass card. DO NOT add text not specified.
${stylePrompt ? `\nMANDATORY: Follow the style description above exactly — same colors, background, aesthetic.` : ''}${referenceInstruction}`
        } else {
            prompt = `Create a vertical portrait image, taller than wide.
${stylePrompt ? stylePrompt + '\n' : ''}
Headline text on image: "${slide.headline || ''}"${slide.subheadline ? `\nSubheadline: "${slide.subheadline}"` : ''}

Person: chest up to waist, fills 85% of frame width.
Pose: ${posePrompt}
Expression: ${emotionPrompt}
Outfit: ${outfit}
Props around person: ${props}

${slide.body_text ? `Bottom card text: "${slide.body_text}"` : ''}

Photorealistic, NOT illustration. Cinematic lighting. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified.
${stylePrompt ? `\nMANDATORY: Follow the style description above exactly — same colors, background, aesthetic.` : ''}${referenceInstruction}`
        }
    } else if (slideType === 'VIRAL') {
        const viralTarget = slide.subheadline || selectViralTarget(vasiaCore)
        prompt = `Create a vertical portrait image, taller than wide.
${stylePrompt ? stylePrompt + '\n' : ''}
Center: Large card with text "ОТПРАВЬ ЭТО" and "${viralTarget}".
Share icons, paper airplane, energy particles.
No person. Bright, viral aesthetic. 8K. CRITICAL: DO NOT add ANY text that is not explicitly specified.${referenceInstruction}`
    } else {
        // CONTENT slides (no person)
        const contentText = slide.content_details || slide.body_text || ''
        prompt = `Create a vertical portrait image, taller than wide.
${stylePrompt ? stylePrompt + '\n' : ''}
At the TOP: Large bold headline "${slide.headline || ''}"
Below headline: ${slide.content_layout || 'clean structured layout'} with the following text items clearly written and readable:
${contentText}
${slide.transition ? `At the BOTTOM: transition text "${slide.transition}"` : ''}
No person. Clean infographic style. 8K.
CRITICAL: All text content listed above MUST be clearly written and READABLE on the image. Do NOT leave cards or frames empty — fill them with the actual text content provided. DO NOT add ANY text that is not explicitly specified.${referenceInstruction}`
    }

    if (payload.primaryColor) {
        prompt += `\n[COLOR_OVERRIDE: Use ${payload.primaryColor} as primary accent color.]`
    }

    return prompt
}

// ============================================================
// MAIN PIPELINE
// ============================================================

async function runPipeline(payload: GenerationPayload, config: EngineConfig) {
    const startTime = Date.now()

    // === Очистка зависших генераций (фикс #5) ===
    try {
        const supabase = getSupabaseClient()
        const { data: cleanedCount } = await supabase.rpc('cleanup_hung_generations', { p_timeout_minutes: 5 })
        if (cleanedCount && cleanedCount > 0) {
            console.log(`[Engine] Cleaned up ${cleanedCount} hung generations`)
        }
    } catch {
        // Non-critical
    }

    // === Автоочистка Cloudinary (удаление картинок старше 24ч) ===
    try {
        const deletedCount = await cleanupOldCloudinaryImages(config)
        if (deletedCount > 0) {
            console.log(`[Engine] Cloudinary cleanup: deleted ${deletedCount} old images`)
        }
    } catch {
        // Non-critical
    }

    const logId = await createGenLog(payload.chatId, payload.topic, payload.styleId, config)

    try {
        // === СТАТУС: Начало генерации ===
        await sendStatusToTelegram(
            payload.chatId,
            `🎨 <b>Карусель запущена!</b>\n\n📝 Тема: «${payload.topic}»\n🤖 Копирайтер пишет тексты слайдов...\n\n⏱ Обычно это занимает 1-2 минуты`,
            config.telegram_bot_token
        )

        // === ШАГ 1: Копирайтинг ===
        console.log('[Engine] Step 1: Generating text...')
        await updateGenLog(logId, { status: 'generating_text' })

        const textStart = Date.now()
        const { systemPrompt, userPrompt } = buildCopywriterPrompt(payload)
        const { text: rawText, keyIndex: textKeyIndex } = await generateText(systemPrompt, userPrompt, config)
        const textMs = Date.now() - textStart

        console.log(`[Engine] Text generated in ${textMs}ms, length: ${rawText.length}, keyIndex: ${textKeyIndex}`)
        await updateGenLog(logId, { text_gen_ms: textMs, text_key_index: textKeyIndex })

        // Парсим JSON из ответа
        let slides: SlideContent[]
        let postText = ''
        try {
            // Убираем markdown обертку если есть
            const cleanJson = rawText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim()
            const parsed = JSON.parse(cleanJson)

            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.slides)) {
                // New format: { slides: [...], post_text: "..." }
                slides = parsed.slides
                postText = (parsed.post_text || '').replace(/\\n/g, '\n')
                console.log('[Engine] Parsed CopywriterResponse format (slides + post_text)')
            } else if (Array.isArray(parsed)) {
                // Legacy format: flat array — convert to new format
                slides = parsed.map((s: Record<string, unknown>, i: number) => ({
                    ...s,
                    slideNumber: s.slideNumber || i + 1,
                    headline: s.headline || s.content || '',
                    human_mode: (s.human_mode as string) || (i === 0 || i === 7 ? 'FACE' : 'NONE'),
                    type: s.type || 'CONTENT',
                } as SlideContent))
                console.log('[Engine] Parsed legacy flat array format, converted to new')
            } else {
                throw new Error('Unexpected JSON structure')
            }
        } catch (parseErr) {
            console.error('[Engine] Failed to parse slides JSON:', rawText.substring(0, 500))
            throw new Error('AI вернул невалидный JSON. Попробуйте ещё раз.')
        }

        if (!Array.isArray(slides) || slides.length === 0) {
            throw new Error('AI не сгенерировал слайды')
        }

        console.log(`[Engine] Parsed ${slides.length} slides, post_text length: ${postText.length}`)

        // === CTA KEYWORD ENFORCEMENT (фикс #6) ===
        const ctaKeyword = payload.cta || 'ПОДПИШИСЬ'
        const ctaSlide = slides.find(s => s.type === 'CTA') || slides[slides.length - 2] // CTA обычно предпоследний
        if (ctaSlide && ctaKeyword) {
            const headline = ctaSlide.headline || ''
            if (!headline.toUpperCase().includes(ctaKeyword.toUpperCase())) {
                console.warn(`[Engine] CTA keyword "${ctaKeyword}" missing from CTA slide headline: "${headline}"`)
                // Inject: заменяем headline, сохраняем оригинал в subheadline
                const originalHeadline = headline
                ctaSlide.headline = `ПИШИ: ${ctaKeyword}`
                if (originalHeadline && !originalHeadline.toUpperCase().startsWith('ПИШИ')) {
                    ctaSlide.subheadline = originalHeadline
                }
                console.log(`[Engine] CTA keyword injected: "${ctaSlide.headline}"`)
            }
        }

        // === СТАТУС: Тексты готовы ===
        const faceCount = slides.filter(s => s.human_mode === 'FACE' || s.type === 'HOOK' || s.type === 'CTA').length
        await sendStatusToTelegram(
            payload.chatId,
            `✅ <b>Тексты готовы!</b> (${(textMs / 1000).toFixed(1)}с)\n\n📊 ${slides.length} слайдов создано\n🎨 Генерирую ${slides.length} изображений${payload.userPhoto ? `\n📸 Использую ваше фото для ${faceCount} слайдов` : ''}...\n\n⏱ Это самый долгий этап — подождите ещё минутку`,
            config.telegram_bot_token
        )

        // === ШАГ 1.5: Скачиваем фото пользователя (для FACE-слайдов) ===
        let photoBase64: string | null = null
        if (payload.userPhoto) {
            console.log('[Engine] Step 1.5: Fetching user photo for reference...')
            photoBase64 = await fetchPhotoAsBase64(payload.userPhoto)
            if (photoBase64) {
                console.log('[Engine] User photo ready as reference image')
            } else {
                console.warn('[Engine] Could not fetch user photo, will generate without reference')
            }
        } else {
            console.log('[Engine] No userPhoto provided, generating without reference')
        }

        // === ШАГ 2: Генерация картинок (ПАРАЛЛЕЛЬНО) ===
        console.log('[Engine] Step 2: Generating images (parallel)...')
        await updateGenLog(logId, { status: 'generating_images', slides_count: slides.length })

        const stylePrompt = payload.stylePrompt || (payload.styleConfig?.style_prompt as string) || ''
        const imageStart = Date.now()

        let firstImageError = ''
        const imagePromises = slides.map((slide, i) => {
            const isFaceSlide = slide.human_mode === 'FACE' || slide.type === 'HOOK' || slide.type === 'CTA'
            const slidePhotoRef = isFaceSlide ? photoBase64 : null
            const prompt = buildImagePrompt(slide, stylePrompt, payload, !!photoBase64)

            return generateImage(prompt, config, slidePhotoRef)
                .then(img => {
                    console.log(`[Engine] Image ${i + 1}/${slides.length} OK`)
                    return img
                })
                .catch((err) => {
                    const errMsg = err instanceof Error ? err.message : String(err)
                    console.error(`[Engine] Image ${i + 1}/${slides.length} FAILED:`, errMsg)
                    if (!firstImageError) firstImageError = errMsg
                    return null
                })
        })

        const imageResults = await Promise.all(imagePromises)

        if (firstImageError) {
            await updateGenLog(logId, { error_message: `Image errors: ${firstImageError}` })
        }
        const imageMs = Date.now() - imageStart
        console.log(`[Engine] Images generated in ${imageMs}ms`)
        await updateGenLog(logId, { image_gen_ms: imageMs })

        // Фильтруем null (провалившиеся слайды)
        const validImages = imageResults.filter((img): img is Uint8Array => img !== null)
        console.log(`[Engine] ${validImages.length}/${slides.length} images generated successfully`)

        // Проверка: если меньше 70% слайдов — считаем ошибкой
        const minRequired = Math.ceil(slides.length * 0.7)
        if (validImages.length < minRequired) {
            throw new Error(`Только ${validImages.length} из ${slides.length} картинок сгенерировано (нужно минимум ${minRequired}). ${firstImageError}`)
        }

        // === СТАТУС: Картинки готовы ===
        await sendStatusToTelegram(
            payload.chatId,
            `🖼 <b>Изображения готовы!</b> (${(imageMs / 1000).toFixed(0)}с)\n\n✅ ${validImages.length}/${slides.length} слайдов отрисовано\n📤 Загружаю и отправляю вам...`,
            config.telegram_bot_token
        )

        // === ШАГ 3: Upload на Cloudinary (ПАРАЛЛЕЛЬНО!) ===
        console.log('[Engine] Step 3: Uploading to Cloudinary (parallel)...')
        await updateGenLog(logId, { status: 'uploading' })

        const uploadStart = Date.now()
        const uploadPromises = validImages.map((img, i) =>
            uploadToCloudinary(img, config.cloudinary_cloud, config.cloudinary_preset, i + 1).catch((err) => {
                console.error(`[Engine] Upload failed for slide ${i + 1}:`, err)
                return null
            })
        )

        const uploadResults = await Promise.all(uploadPromises)
        const imageUrls = uploadResults.filter((url): url is string => url !== null)
        const uploadMs = Date.now() - uploadStart
        console.log(`[Engine] Uploaded ${imageUrls.length} images in ${uploadMs}ms`)
        await updateGenLog(logId, { upload_ms: uploadMs, image_urls: imageUrls })

        // === ШАГ 4: Отправка в Telegram ===
        console.log('[Engine] Step 4: Sending to Telegram...')
        await updateGenLog(logId, { status: 'sending' })

        const telegramStart = Date.now()
        await sendToTelegram(payload.chatId, imageUrls, payload.topic, config.telegram_bot_token, postText)
        const telegramMs = Date.now() - telegramStart
        console.log(`[Engine] Sent to Telegram in ${telegramMs}ms`)

        // === ГОТОВО ===
        const totalMs = Date.now() - startTime
        await updateGenLog(logId, {
            status: 'success',
            telegram_ms: telegramMs,
            total_ms: totalMs,
        })

        console.log(`[Engine] ✅ Pipeline complete in ${totalMs}ms (${(totalMs / 1000).toFixed(1)}s)`)
        return { success: true, totalMs, slidesCount: imageUrls.length }

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        const totalMs = Date.now() - startTime
        console.error(`[Engine] ❌ Pipeline failed after ${totalMs}ms:`, errorMessage)

        // === ВОЗВРАТ МОНЕТ (фикс #2) ===
        try {
            const supabase = getSupabaseClient()
            const refundResult = await supabase.rpc('add_coins', {
                p_telegram_id: payload.chatId,
                p_amount: 30,
                p_type: 'bonus',
                p_description: 'Возврат за ошибку генерации карусели',
                p_metadata: { source: 'refund', reason: 'carousel_engine_error', error: errorMessage.substring(0, 200) }
            })
            if (refundResult.error) {
                console.error('[Engine] Refund failed:', refundResult.error)
            } else {
                console.log(`[Engine] Refunded 30 coins to user ${payload.chatId}`)
                await updateGenLog(logId, { coins_refunded: true })
            }
        } catch (refundErr) {
            console.error('[Engine] Refund error:', refundErr)
        }

        await updateGenLog(logId, {
            status: 'error',
            error_message: errorMessage,
            total_ms: totalMs,
        })

        // Уведомляем пользователя об ошибке (+ текст про возврат монет)
        try {
            await sendErrorToTelegram(payload.chatId, errorMessage, config.telegram_bot_token)
        } catch {
            console.error('[Engine] Failed to send error to Telegram')
        }

        throw err
    }
}

// ============================================================
// SERVE: HTTP Handler
// ============================================================

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload: GenerationPayload = await req.json()

        // Валидация
        if (!payload.chatId || typeof payload.chatId !== 'number') {
            return new Response(
                JSON.stringify({ error: 'chatId is required and must be a number' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!payload.topic?.trim()) {
            return new Response(
                JSON.stringify({ error: 'topic is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Читаем конфиг
        const config = await getEngineConfig()
        console.log(`[Engine] Config loaded: text=${config.text_provider}/${config.text_model}, image=${config.image_provider}`)

        // Запускаем pipeline в фоне (fire-and-forget)
        // Фронтенд не ждёт результата — он приходит через Telegram
        const pipelinePromise = runPipeline(payload, config)

        // Не ждём завершения pipeline — отвечаем сразу
        // EdgeRuntime.waitUntil гарантирует что функция не будет убита
        // @ts-ignore — Deno edge runtime specific
        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            // @ts-ignore
            EdgeRuntime.waitUntil(pipelinePromise)
        } else {
            // Fallback: просто ждём (для локальной разработки)
            pipelinePromise.catch(err => console.error('[Engine] Background pipeline error:', err))
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Carousel generation started. Results will be sent via Telegram.',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('[Engine] Request error:', error)
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal error',
                success: false,
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
