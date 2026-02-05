import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-refund-secret',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const secret = Deno.env.get('REFUND_WEBHOOK_SECRET')
  const providedSecret = req.headers.get('x-refund-secret')
  if (secret && providedSecret !== secret) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const body = await req.json()
    let chatId = body.chatId ?? body.telegram_id
    const executionId = body.executionId ?? body.execution_id
    const amount = Math.abs(parseInt(String(body.amount || 30), 10)) || 30
    const reason = body.reason || 'Ошибка генерации карусели'

    if (!chatId && executionId) {
      const n8nUrl = Deno.env.get('N8N_API_URL') || 'https://n8n.iferma.pro'
      const n8nKey = Deno.env.get('N8N_API_KEY')
      if (n8nKey) {
        const execRes = await fetch(
          `${n8nUrl}/api/v1/executions/${executionId}?includeData=true`,
          { headers: { 'X-N8N-API-KEY': n8nKey } }
        )
        const execData = await execRes.json()
        const allRunData = execData?.data?.resultData?.runData ?? execData?.resultData?.runData ?? {}
        // Ищем chatId во всех нодах (Webhook, Webhook1, и т.д.)
        for (const nodeName of Object.keys(allRunData)) {
          if (chatId) break
          const nodeRuns = allRunData[nodeName]
          if (!Array.isArray(nodeRuns)) continue
          for (const run of nodeRuns) {
            const items = run?.data?.main?.[0] ?? []
            for (const item of items) {
              const j = item?.json
              if (!j) continue
              const b = j.body || j
              const found = b.chatId ?? b.telegram_id
              if (found) { chatId = found; break }
            }
            if (chatId) break
          }
        }
      }
    }

    if (!chatId) {
      return new Response(
        JSON.stringify({ error: 'chatId or executionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramId = typeof chatId === 'number' ? chatId : parseInt(String(chatId), 10)
    if (isNaN(telegramId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid chatId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await supabase.rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: amount,
      p_type: 'bonus',
      p_description: reason,
      p_metadata: { source: 'refund', reason: 'carousel_generation_failed' }
    })

    if (error) {
      console.error('Refund error:', error)
      return new Response(
        JSON.stringify({ ok: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = data as { success?: boolean; new_balance?: number }
    return new Response(
      JSON.stringify({
        ok: true,
        refunded: amount,
        new_balance: result?.new_balance,
        telegram_id: telegramId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Refund webhook error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
