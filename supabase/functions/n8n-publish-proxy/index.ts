import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL хранится в переменной окружения для безопасности
const N8N_WEBHOOK_URL = Deno.env.get('N8N_PUBLISH_WEBHOOK') || 'https://n8n.iferma.pro/webhook/neuroposter-publish'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const requestData = await req.json()

        console.log('Proxying publish request:', {
            postId: requestData.postId,
            imageCount: requestData.imageUrls?.length,
        })

        // Проксируем запрос в n8n
        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('n8n error:', response.status, errorText)
            throw new Error(`n8n publish error: ${response.status}`)
        }

        // Парсим ответ от n8n
        const result = await response.json()

        return new Response(
            JSON.stringify(result),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Proxy error:', error)

        return new Response(
            JSON.stringify({
                error: error.message || 'Publish proxy error',
                success: false
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
