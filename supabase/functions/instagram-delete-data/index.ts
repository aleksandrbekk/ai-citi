import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Meta отправляет POST с signed_request
    const formData = await req.formData()
    const signedRequest = formData.get('signed_request') as string

    if (!signedRequest) {
      return new Response(
        JSON.stringify({ error: 'Missing signed_request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Декодируем signed_request
    const [, payload] = signedRequest.split('.')
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    const igUserId = decoded.user_id

    console.log('[IG-DELETE] Data deletion requested for:', igUserId)

    const confirmationCode = crypto.randomUUID()

    if (igUserId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      // Удаляем данные аккаунта
      await supabase
        .from('instagram_accounts')
        .delete()
        .eq('instagram_user_id', String(igUserId))
    }

    // Meta требует ответ с confirmation_code и url для проверки статуса
    return new Response(
      JSON.stringify({
        url: 'https://aiciti.pro/data-deletion',
        confirmation_code: confirmationCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[IG-DELETE] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
