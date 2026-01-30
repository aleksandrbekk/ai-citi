import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-telegram-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Админы проекта
const ADMIN_IDS = [643763835, 190202791]

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Supabase client с service_role для полного доступа
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)
    const styleId = pathParts[pathParts.length - 1] !== 'carousel-styles'
      ? pathParts[pathParts.length - 1]
      : null

    // GET - получить стили
    if (req.method === 'GET') {
      // Если есть ID в пути - получить конкретный стиль
      if (styleId && styleId !== 'carousel-styles') {
        const { data, error } = await supabase
          .from('carousel_styles')
          .select('*')
          .eq('id', styleId)
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify(data),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Параметр all=true для получения всех стилей (включая неактивные)
      const all = url.searchParams.get('all') === 'true'

      let query = supabase
        .from('carousel_styles')
        .select('*')
        .order('sort_order', { ascending: true })

      if (!all) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data || []),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST, PUT, DELETE - требуют проверки админа
    const telegramIdHeader = req.headers.get('x-telegram-id')
    const telegramId = telegramIdHeader ? parseInt(telegramIdHeader, 10) : null

    if (!telegramId || !ADMIN_IDS.includes(telegramId)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST - создать стиль
    if (req.method === 'POST') {
      const body = await req.json()

      const { data, error } = await supabase
        .from('carousel_styles')
        .insert({
          ...body,
          created_by: telegramId,
        })
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PUT - обновить стиль
    if (req.method === 'PUT') {
      if (!styleId) {
        return new Response(
          JSON.stringify({ error: 'Style ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const body = await req.json()

      const { data, error } = await supabase
        .from('carousel_styles')
        .update({
          ...body,
          updated_by: telegramId,
        })
        .eq('id', styleId)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // DELETE - удалить стиль (мягкое удаление)
    if (req.method === 'DELETE') {
      if (!styleId) {
        return new Response(
          JSON.stringify({ error: 'Style ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Мягкое удаление - деактивация
      const { error } = await supabase
        .from('carousel_styles')
        .update({ is_active: false, updated_by: telegramId })
        .eq('id', styleId)

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
