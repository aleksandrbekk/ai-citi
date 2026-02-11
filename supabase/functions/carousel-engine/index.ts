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
// TYPES
// ============================================================

interface EngineConfig {
    text_provider: 'gemini' | 'openrouter'
    text_api_key: string
    text_model: string
    text_fallback_provider: string | null
    text_fallback_key: string | null
    image_provider: 'imagen' | 'ideogram'
    image_api_key: string
    image_model: string
    telegram_bot_token: string
    cloudinary_cloud: string
    cloudinary_preset: string
    max_retries: number
    use_search_grounding: boolean
}

interface SlideContent {
    slideNumber: number
    type: string  // HOOK, CONTENT, CTA, etc.
    content: string
    visualTask: string
    emoji?: string
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

    // Google Search Grounding
    if (useGrounding) {
        requestBody.tools = [
            {
                googleSearchRetrieval: {
                    dynamicRetrievalConfig: {
                        mode: "MODE_DYNAMIC",
                        dynamicThreshold: 0.3,
                    }
                }
            }
        ]
    }

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
    })

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
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
}

// --- Unified text generation ---
async function generateText(
    systemPrompt: string,
    userPrompt: string,
    config: EngineConfig
): Promise<string> {
    try {
        if (config.text_provider === 'gemini') {
            return await generateTextGemini(systemPrompt, userPrompt, config.text_model, config.use_search_grounding)
        } else {
            return await generateTextOpenRouter(systemPrompt, userPrompt, config.text_model, config.text_api_key)
        }
    } catch (err) {
        console.error(`[Engine] Primary text provider (${config.text_provider}) failed:`, err)

        // Fallback
        if (config.text_fallback_provider && config.text_fallback_key) {
            console.log(`[Engine] Trying fallback: ${config.text_fallback_provider}`)
            if (config.text_fallback_provider === 'openrouter') {
                return await generateTextOpenRouter(systemPrompt, userPrompt, config.text_model, config.text_fallback_key)
            } else if (config.text_fallback_provider === 'gemini') {
                return await generateTextGemini(systemPrompt, userPrompt, config.text_model, config.use_search_grounding)
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

    const response = await fetch(endpoint, {
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
    })

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
    const response = await fetch('https://api.ideogram.ai/generate', {
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
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Ideogram error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url
    if (!imageUrl) throw new Error('No image URL from Ideogram')

    // Download the image
    const imgResponse = await fetch(imageUrl)
    const imgBuffer = await imgResponse.arrayBuffer()
    return new Uint8Array(imgBuffer)
}

// --- Unified image generation ---
async function generateImage(
    prompt: string,
    config: EngineConfig
): Promise<Uint8Array> {
    if (config.image_provider === 'imagen') {
        return await generateImageImagen(prompt, config.image_model)
    } else {
        return await generateImageIdeogram(prompt, config.image_model, config.image_api_key)
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

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Cloudinary error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return data.secure_url
}

// ============================================================
// TELEGRAM DELIVERY
// ============================================================

async function sendToTelegram(
    chatId: number,
    imageUrls: string[],
    topic: string,
    botToken: string
): Promise<void> {
    // Отправляем все картинки как media group (альбом)
    if (imageUrls.length > 0) {
        const media = imageUrls.map((url, i) => ({
            type: 'photo',
            media: url,
            ...(i === 0 ? { caption: `🎨 Карусель: ${topic}\n\n✅ Готово! ${imageUrls.length} слайдов` } : {}),
        }))

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                media,
            }),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('[Engine] Telegram media group error:', errorText)

            // Fallback: отправляем по одной
            for (const url of imageUrls) {
                await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        photo: url,
                    }),
                })
            }
        }
    }
}

async function sendErrorToTelegram(chatId: number, error: string, botToken: string) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: `❌ Ошибка генерации карусели:\n${error}\n\nПопробуйте ещё раз.`,
        }),
    })
}

// ============================================================
// PIPELINE: Построение промптов
// ============================================================

function buildCopywriterPrompt(payload: GenerationPayload): { systemPrompt: string; userPrompt: string } {
    const styleConfig = payload.styleConfig || {}
    const contentSystemPrompt = styleConfig.content_system_prompt as string || ''
    const globalSystemPrompt = payload.globalSystemPrompt || ''
    const topic = payload.topic || ''

    // Логика приоритетов (как в n8n Copywriter node):
    // 1. Admin content_system_prompt (если > 20 символов)
    // 2. Global system prompt
    // 3. Базовый fallback
    let systemPrompt = ''

    if (contentSystemPrompt && contentSystemPrompt.length > 20) {
        systemPrompt = contentSystemPrompt
        // Если админ забыл {topic} — вставляем автоматически
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
        systemPrompt = `Ты — профессиональный копирайтер для Instagram каруселей. Создай структуру из 9 слайдов на тему "${topic}".`
    }

    const userPrompt = `Создай Instagram карусель из 9 слайдов на тему: "${topic}".

Верни СТРОГО JSON массив из 9 объектов:
[
  {
    "slideNumber": 1,
    "type": "HOOK",
    "content": "Текст слайда (короткий, цепляющий)",
    "visualTask": "Описание что должно быть на картинке",
    "emoji": "🔥"
  },
  ...
]

Типы слайдов: HOOK (1), CONTENT (2-7), BRIDGE (8), CTA (9).
Пол для склонения: ${payload.gender || 'male'}.
CTA текст: ${payload.cta || 'ПОДПИШИСЬ'}.
ВАЖНО: Верни ТОЛЬКО JSON, без markdown, без пояснений.`

    return { systemPrompt, userPrompt }
}

function buildImagePrompt(slide: SlideContent, stylePrompt: string, payload: GenerationPayload): string {
    let prompt = slide.visualTask || `Instagram carousel slide about: ${slide.content}`

    // Добавляем style prompt
    if (stylePrompt) {
        prompt += ` [STYLE_INSTRUCTION: ${stylePrompt}]`
    }

    // Обязательно: текст слайда должен быть на картинке
    prompt += ` [INSTRUCTION: All text shown on the image must be exactly: "${slide.content}". Russian/Cyrillic only.]`

    // Фото пользователя
    if (payload.userPhoto) {
        prompt += ` [USER_PHOTO: Include a person in the image]`
    }

    // Кастомный цвет
    if (payload.primaryColor) {
        prompt += ` [PRIMARY_COLOR: ${payload.primaryColor}]`
    }

    // Объект на слайде
    if (payload.objectImage) {
        prompt += ` [OBJECT: ${payload.objectImage}, placement: ${payload.objectPlacement || 'auto'}]`
    }

    return prompt
}

// ============================================================
// MAIN PIPELINE
// ============================================================

async function runPipeline(payload: GenerationPayload, config: EngineConfig) {
    const startTime = Date.now()
    const logId = await createGenLog(payload.chatId, payload.topic, payload.styleId, config)

    try {
        // === ШАГ 1: Копирайтинг ===
        console.log('[Engine] Step 1: Generating text...')
        await updateGenLog(logId, { status: 'generating_text' })

        const textStart = Date.now()
        const { systemPrompt, userPrompt } = buildCopywriterPrompt(payload)
        const rawText = await generateText(systemPrompt, userPrompt, config)
        const textMs = Date.now() - textStart

        console.log(`[Engine] Text generated in ${textMs}ms, length: ${rawText.length}`)
        await updateGenLog(logId, { text_gen_ms: textMs })

        // Парсим JSON из ответа
        let slides: SlideContent[]
        try {
            // Убираем markdown обертку если есть
            const cleanJson = rawText
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim()
            slides = JSON.parse(cleanJson)
        } catch {
            console.error('[Engine] Failed to parse slides JSON:', rawText.substring(0, 500))
            throw new Error('AI вернул невалидный JSON. Попробуйте ещё раз.')
        }

        if (!Array.isArray(slides) || slides.length === 0) {
            throw new Error('AI не сгенерировал слайды')
        }

        console.log(`[Engine] Parsed ${slides.length} slides`)

        // === ШАГ 2: Генерация картинок (ПАРАЛЛЕЛЬНО!) ===
        console.log('[Engine] Step 2: Generating images (parallel)...')
        await updateGenLog(logId, { status: 'generating_images', slides_count: slides.length })

        const stylePrompt = payload.stylePrompt || (payload.styleConfig?.style_prompt as string) || ''
        const imageStart = Date.now()

        const imagePromises = slides.map((slide) => {
            const prompt = buildImagePrompt(slide, stylePrompt, payload)
            return generateImage(prompt, config).catch((err) => {
                console.error(`[Engine] Image gen failed for slide ${slide.slideNumber}:`, err)
                return null
            })
        })

        const imageResults = await Promise.all(imagePromises)
        const imageMs = Date.now() - imageStart
        console.log(`[Engine] Images generated in ${imageMs}ms`)
        await updateGenLog(logId, { image_gen_ms: imageMs })

        // Фильтруем null (провалившиеся слайды)
        const validImages = imageResults.filter((img): img is Uint8Array => img !== null)
        console.log(`[Engine] ${validImages.length}/${slides.length} images generated successfully`)

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
        await sendToTelegram(payload.chatId, imageUrls, payload.topic, config.telegram_bot_token)
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

        await updateGenLog(logId, {
            status: 'error',
            error_message: errorMessage,
            total_ms: totalMs,
        })

        // Уведомляем пользователя об ошибке
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
