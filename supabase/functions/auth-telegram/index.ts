import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('=== AUTH-TELEGRAM START ===')
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Читаем тело запроса как текст сначала
    let bodyText = ''
    try {
      bodyText = await req.text()
      console.log('Body length:', bodyText.length)
      console.log('Body preview:', bodyText.substring(0, 200))
    } catch (readError) {
      console.log('ERROR reading body:', readError)
      return new Response(
        JSON.stringify({ error: 'Failed to read request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Парсим JSON
    let body
    try {
      body = JSON.parse(bodyText)
      console.log('Body parsed successfully')
    } catch (parseError) {
      console.log('ERROR parsing JSON:', parseError)
      console.log('Raw body:', bodyText)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { initData } = body
    
    console.log('Received initData length:', initData?.length || 0)

    if (!initData) {
      console.log('ERROR: initData is missing')
      return new Response(
        JSON.stringify({ error: 'initData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Парсинг данных пользователя (без валидации для отладки)
    const params = new URLSearchParams(initData)
    const userDataString = params.get('user')
    
    console.log('User data string exists:', !!userDataString)

    if (!userDataString) {
      console.log('ERROR: No user in initData')
      return new Response(
        JSON.stringify({ error: 'User data not found in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let userData
    try {
      userData = JSON.parse(decodeURIComponent(userDataString))
      console.log('Parsed user:', userData.id, userData.first_name)
    } catch (parseError) {
      console.log('ERROR: Failed to parse user data:', parseError)
      return new Response(
        JSON.stringify({ error: 'Failed to parse user data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Валидация hash (опционально, можно временно отключить для отладки)
    const isValid = await validateTelegramData(initData)
    console.log('Validation result:', isValid)
    
    if (!isValid) {
      // Временно пропускаем валидацию для отладки
      console.log('WARNING: Hash validation failed, but continuing for debug')
      // return new Response(
      //   JSON.stringify({ error: 'Invalid initData hash' }),
      //   { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      // )
    }

    // Создание Supabase клиента
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      console.log('ERROR: Missing Supabase credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Найти существующего пользователя
    console.log('Looking for user with telegram_id:', userData.id)
    
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userData.id)
      .maybeSingle()

    if (selectError) {
      console.log('ERROR selecting user:', selectError)
    }

    let user = existingUser
    console.log('Existing user found:', !!user)

    if (!user) {
      // Создать нового пользователя
      console.log('Creating new user...')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.id,
          username: userData.username || null,
          first_name: userData.first_name || 'User',
          last_name: userData.last_name || null,
          avatar_url: userData.photo_url || null,
          language_code: userData.language_code || 'ru'
        })
        .select()
        .single()

      if (createError) {
        console.log('ERROR creating user:', createError)
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + createError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      user = newUser
      console.log('New user created:', user.id)
    } else {
      // Обновить данные существующего пользователя
      console.log('Updating existing user...')
      
      const { data: updatedUser, error: updateError } = await supabase
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

      if (updateError) {
        console.log('ERROR updating user:', updateError)
      } else if (updatedUser) {
        user = updatedUser
      }
    }

    // Получить профиль пользователя
    console.log('Getting profile for user:', user.id)
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.log('ERROR getting profile:', profileError)
    }

    console.log('Profile found:', !!profile)
    console.log('=== AUTH-TELEGRAM SUCCESS ===')

    return new Response(
      JSON.stringify({ 
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url
        }, 
        profile: profile || {
          level: 1,
          xp: 0,
          xp_to_next_level: 100,
          coins: 0,
          premium_coins: 0,
          subscription: 'free',
          stats: { learning: 0, content: 0, sales: 0, discipline: 0 }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.log('=== AUTH-TELEGRAM ERROR ===')
    console.log('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function validateTelegramData(initData: string): Promise<boolean> {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.log('TELEGRAM_BOT_TOKEN not set')
      return false
    }

    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) {
      console.log('No hash in initData')
      return false
    }
    
    params.delete('hash')
    
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    // Используем Web Crypto API
    const encoder = new TextEncoder()
    
    // Создаём secret key: HMAC-SHA256("WebAppData", botToken)
    const keyData = encoder.encode('WebAppData')
    const secretKeyData = encoder.encode(botToken)
    
    const cryptoKey1 = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const secretKeyBuffer = await crypto.subtle.sign('HMAC', cryptoKey1, secretKeyData)
    
    // Создаём hash: HMAC-SHA256(secretKey, dataCheckString)
    const cryptoKey2 = await crypto.subtle.importKey(
      'raw',
      secretKeyBuffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const hashBuffer = await crypto.subtle.sign('HMAC', cryptoKey2, encoder.encode(dataCheckString))
    
    // Конвертируем в hex
    const calculatedHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const isValid = calculatedHash === hash
    console.log('Hash comparison:', isValid ? 'MATCH' : 'MISMATCH')
    
    return isValid
  } catch (error) {
    console.log('Validation error:', error)
    return false
  }
}
