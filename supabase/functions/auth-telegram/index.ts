import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Отправка уведомления рефереру через Telegram бот
async function sendReferralNotification(chatId: number, text: string) {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) return
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    })
  } catch (e) {
    console.error('Failed to send referral notification:', e)
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData, startParam } = await req.json()

    console.log('Auth request received, startParam:', startParam)

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

    // ВАЖНО: start_param может быть внутри initData!
    const startParamFromInitData = params.get('start_param')
    const effectiveStartParam = startParam || startParamFromInitData

    console.log('startParam from body:', startParam)
    console.log('startParam from initData:', startParamFromInitData)
    console.log('effectiveStartParam:', effectiveStartParam)

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

    // Извлекаем реферальный код из effectiveStartParam (ref_06 -> 06)
    let referrerCode: string | null = null
    console.log('🔍 Checking referrer code:')
    console.log('  - effectiveStartParam:', effectiveStartParam)
    console.log('  - type:', typeof effectiveStartParam)
    console.log('  - starts with ref_:', effectiveStartParam?.startsWith('ref_'))

    if (effectiveStartParam && typeof effectiveStartParam === 'string' && effectiveStartParam.startsWith('ref_')) {
      referrerCode = effectiveStartParam.replace('ref_', '')
      console.log('✅ Extracted referrer code from startParam:', referrerCode)
    } else {
      // Фоллбэк: проверяем pending_referrals (код сохранён ботом при /start ref_XX)
      console.log('🔍 No startParam, checking pending_referrals...')
      try {
        const { data: pending } = await supabase
          .from('pending_referrals')
          .select('referral_code')
          .eq('telegram_id', userData.id)
          .single()

        if (pending?.referral_code) {
          referrerCode = pending.referral_code
          console.log('✅ Found pending referral code:', referrerCode)

          // Удаляем запись — код использован
          await supabase
            .from('pending_referrals')
            .delete()
            .eq('telegram_id', userData.id)
        } else {
          console.log('❌ No referrer code found anywhere')
        }
      } catch (e) {
        console.log('❌ pending_referrals check failed:', e)
      }
    }

    if (!user) {
      // Генерируем реферальный код для нового пользователя
      // Получаем максимальный существующий код и добавляем 1
      const { data: maxCodeData } = await supabase
        .from('users')
        .select('referral_code')
        .not('referral_code', 'is', null)
        .order('referral_code', { ascending: false })
        .limit(1)
        .single()

      let newReferralCode = '01'
      if (maxCodeData?.referral_code) {
        const maxNum = parseInt(maxCodeData.referral_code, 10)
        if (!isNaN(maxNum)) {
          newReferralCode = String(maxNum + 1).padStart(2, '0')
        }
      }

      console.log('Generated referral code for new user:', newReferralCode)
      console.log('📝 Creating new user with:')
      console.log('  - telegram_id:', userData.id)
      console.log('  - referral_code:', newReferralCode)
      console.log('  - referred_by_code:', referrerCode || null)

      // Создать нового пользователя
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          telegram_id: userData.id,
          username: userData.username || null,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          avatar_url: userData.photo_url || null,
          language_code: userData.language_code || 'ru',
          referral_code: newReferralCode,
          referred_by_code: referrerCode || null
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

      // Обработка реферальной ссылки для нового пользователя
      if (referrerCode) {
        const { data: registerResult, error: refError } = await supabase.rpc('register_referral_by_code', {
          p_referrer_code: referrerCode,
          p_referred_telegram_id: userData.id
        })

        console.log('Referral registration result:', registerResult, refError)

        if (!refError && registerResult?.success) {
          console.log('Referral registered:', registerResult)

          // Выплачиваем бонус за регистрацию (6 монет)
          const { data: bonusResult } = await supabase.rpc('pay_referral_registration_bonus', {
            p_referred_telegram_id: userData.id
          })
          console.log('Referral bonus paid:', bonusResult)
        } else {
          console.log('Referral registration skipped:', refError || registerResult?.error)
        }

        // Уведомление рефереру о новом партнёре
        try {
          const { data: referrerUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('referral_code', referrerCode)
            .single()

          if (referrerUser?.telegram_id) {
            const { data: stats } = await supabase
              .from('referral_stats')
              .select('total_referrals')
              .eq('telegram_id', referrerUser.telegram_id)
              .single()

            const partnerName = userData.first_name || userData.username || 'Новый пользователь'
            const totalPartners = stats?.total_referrals || 1

            await sendReferralNotification(
              referrerUser.telegram_id,
              `🎉 <b>${partnerName}</b> присоединился по вашей ссылке!\n\n` +
              `У вас теперь <b>${totalPartners}</b> партнёр(ов).\n` +
              `Вы получаете бонус с каждой их активности.`
            )
            console.log('Referral notification sent to:', referrerUser.telegram_id)
          }
        } catch (e) {
          console.error('Failed to send referral registration notification:', e)
        }
      }
    } else {
      // Обновить данные существующего пользователя
      const updateData: any = {
        username: userData.username || user.username,
        first_name: userData.first_name || user.first_name,
        last_name: userData.last_name || user.last_name,
        avatar_url: userData.photo_url || user.avatar_url,
        updated_at: new Date().toISOString()
      }

      // Если у пользователя нет referral_code, генерируем
      if (!user.referral_code) {
        const { data: maxCodeData } = await supabase
          .from('users')
          .select('referral_code')
          .not('referral_code', 'is', null)
          .order('referral_code', { ascending: false })
          .limit(1)
          .single()

        let newCode = '01'
        if (maxCodeData?.referral_code) {
          const maxNum = parseInt(maxCodeData.referral_code, 10)
          if (!isNaN(maxNum)) {
            newCode = String(maxNum + 1).padStart(2, '0')
          }
        }
        updateData.referral_code = newCode
        console.log('Generated referral code for existing user:', updateData.referral_code)
      }

      const { data: updatedUser } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (updatedUser) user = updatedUser

      // Обработка реферальной ссылки для существующего пользователя (если ещё нет реферера)
      if (referrerCode) {
        // Проверяем, есть ли уже реферер
        const { data: existingReferrer } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_telegram_id', userData.id)
          .single()

        if (!existingReferrer) {
          const { data: registerResult, error: refError } = await supabase.rpc('register_referral_by_code', {
            p_referrer_code: referrerCode,
            p_referred_telegram_id: userData.id
          })

          console.log('Referral registration result for existing user:', registerResult, refError)

          if (!refError && registerResult?.success) {
            console.log('Referral registered for existing user:', registerResult)

            // Выплачиваем бонус за регистрацию (6 монет)
            const { data: bonusResult } = await supabase.rpc('pay_referral_registration_bonus', {
              p_referred_telegram_id: userData.id
            })
            console.log('Referral bonus paid:', bonusResult)
          } else {
            console.log('Referral registration skipped:', refError || registerResult?.error)
          }

          // Уведомление рефереру о новом партнёре
          try {
            const { data: referrerUser } = await supabase
              .from('users')
              .select('telegram_id')
              .eq('referral_code', referrerCode)
              .single()

            if (referrerUser?.telegram_id) {
              const { data: stats } = await supabase
                .from('referral_stats')
                .select('total_referrals')
                .eq('telegram_id', referrerUser.telegram_id)
                .single()

              const partnerName = userData.first_name || userData.username || 'Новый пользователь'
              const totalPartners = stats?.total_referrals || 1

              await sendReferralNotification(
                referrerUser.telegram_id,
                `🎉 <b>${partnerName}</b> присоединился по вашей ссылке!\n\n` +
                `У вас теперь <b>${totalPartners}</b> партнёр(ов).\n` +
                `Вы получаете бонус с каждой их активности.`
              )
              console.log('Referral notification sent to:', referrerUser.telegram_id)
            }
          } catch (e) {
            console.error('Failed to send referral registration notification:', e)
          }
        }
      }
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
