import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()
    
    if (!initData) {
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Валидация initData от Telegram
    const isValid = validateTelegramData(initData)
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Парсинг данных пользователя
    const params = new URLSearchParams(initData)
    const userDataString = params.get('user')
    
    if (!userDataString) {
      return new Response(
        JSON.stringify({ error: 'User data not found in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userData = JSON.parse(decodeURIComponent(userDataString))

    // Создание Supabase клиента с service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Найти существующего пользователя
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userData.id)
      .single()

    let user = existingUser

    if (!user) {
      // Создать нового пользователя
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.id,
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          avatar_url: userData.photo_url || null,
          language_code: userData.language_code || 'ru'
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      user = newUser
    } else {
      // Обновить данные существующего пользователя
      const { data: updatedUser } = await supabase
        .from('users')
        .update({
          username: userData.username || user.username,
          first_name: userData.first_name || user.first_name,
          last_name: userData.last_name || user.last_name,
          avatar_url: userData.photo_url || user.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()
      
      if (updatedUser) user = updatedUser
    }

    // Получить профиль пользователя
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return new Response(
      JSON.stringify({ user, profile }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function validateTelegramData(initData: string): boolean {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not set')
      return false
    }

    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    params.delete('hash')
    
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
    const calculatedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return calculatedHash === hash
  } catch (error) {
    console.error('Validation error:', error)
    return false
  }
}
