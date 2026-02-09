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
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // user_id из нашей БД
    const error = url.searchParams.get('error')

    // Если юзер отказал в доступе
    if (error) {
      console.error('[IG-OAUTH] User denied access:', error)
      return new Response(null, {
        status: 302,
        headers: { Location: 'https://aiciti.pro/tools/poster/settings?error=denied' }
      })
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing code parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[IG-OAUTH] Received callback, state:', state)

    const IG_APP_ID = Deno.env.get('INSTAGRAM_APP_ID')!
    const IG_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!
    const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-oauth-callback`

    // 1. Обмен code на short-lived token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: IG_APP_ID,
        client_secret: IG_APP_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code,
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log('[IG-OAUTH] Token exchange status:', tokenResponse.status, 'user_id:', tokenData.user_id)

    if (tokenData.error_message || tokenData.error) {
      throw new Error(tokenData.error_message || tokenData.error?.message || 'Token exchange failed')
    }

    const shortLivedToken = tokenData.access_token
    const igUserId = tokenData.user_id

    // 2. Обмен на long-lived token (60 дней)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortLivedToken}`
    )
    const longLivedData = await longLivedResponse.json()
    console.log('[IG-OAUTH] Long-lived token received, expires_in:', longLivedData.expires_in)

    const longLivedToken = longLivedData.access_token || shortLivedToken
    const expiresIn = longLivedData.expires_in || 5184000 // 60 days default

    // 3. Получаем профиль юзера
    const profileResponse = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id,username,account_type,profile_picture_url&access_token=${longLivedToken}`
    )
    const profile = await profileResponse.json()
    console.log('[IG-OAUTH] Profile:', profile.username, profile.account_type)

    // 4. Сохраняем в БД
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Находим user_id из state (telegram user id → наш user id)
    let userId = state

    // Если state — это telegram_id, найдём uuid пользователя
    if (state && !state.includes('-')) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', parseInt(state))
        .single()

      if (userData) {
        userId = userData.id
      }
    }

    if (!userId) {
      throw new Error('User not found')
    }

    // Upsert — обновляем если уже есть, создаём если нет
    const { error: dbError } = await supabase
      .from('instagram_accounts')
      .upsert({
        user_id: userId,
        instagram_user_id: String(igUserId || profile.user_id),
        username: profile.username,
        access_token: longLivedToken,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        is_active: true,
        profile_picture_url: profile.profile_picture_url || null,
      }, {
        onConflict: 'user_id',
      })

    if (dbError) {
      console.error('[IG-OAUTH] DB error:', dbError)
      throw new Error('Failed to save account: ' + dbError.message)
    }

    console.log('[IG-OAUTH] Success! Saved @' + profile.username + ' for user ' + userId)

    // 5. Редирект обратно в приложение
    return new Response(null, {
      status: 302,
      headers: {
        Location: 'https://aiciti.pro/tools/poster/settings?connected=true&username=' + encodeURIComponent(profile.username || ''),
      }
    })

  } catch (err) {
    console.error('[IG-OAUTH] Error:', err)

    return new Response(null, {
      status: 302,
      headers: {
        Location: 'https://aiciti.pro/tools/poster/settings?error=' + encodeURIComponent(err.message || 'unknown'),
      }
    })
  }
})
