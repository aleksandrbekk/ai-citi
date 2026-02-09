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
    const { telegram_id, action } = await req.json()

    if (!telegram_id) {
      return new Response(
        JSON.stringify({ error: 'Missing telegram_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Находим user_id по telegram_id
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegram_id)
      .single()

    if (!userData?.id) {
      return new Response(
        JSON.stringify({ account: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Отключение аккаунта
    if (action === 'disconnect') {
      await supabase
        .from('instagram_accounts')
        .update({ is_active: false })
        .eq('user_id', userData.id)

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем подключённый аккаунт — ТОЛЬКО безопасные поля (без access_token!)
    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('username, instagram_user_id, is_active')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single()

    return new Response(
      JSON.stringify({ account: account || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
