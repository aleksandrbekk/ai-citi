import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL хранится в переменной окружения для безопасности
const N8N_WEBHOOK_URL = Deno.env.get('N8N_CAROUSEL_WEBHOOK') || 'https://n8n.iferma.pro/webhook/carousel-v2'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const requestData = await req.json()

        console.log('Proxying carousel request:', {
            chatId: requestData.chatId,
            templateId: requestData.templateId,
            topic: requestData.topic?.substring(0, 50),
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
            throw new Error(`n8n error: ${response.status}`)
        }

        // n8n обычно отвечает сразу, результат придёт в Telegram
        const result = await response.text()

        return new Response(
            JSON.stringify({ success: true, message: 'Request sent to n8n' }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        console.error('Proxy error:', error)

        return new Response(
            JSON.stringify({
                error: error.message || 'Proxy error',
                success: false
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})
