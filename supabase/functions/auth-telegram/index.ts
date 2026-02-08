import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

/**
 * Parse startParam with UTM support
 * Format: ref_CODE or ref_CODE_src_TAG
 */
function parseStartParam(startParam: string | null): { referrerCode: string | null, utmSource: string | null } {
  if (!startParam || typeof startParam !== 'string') return { referrerCode: null, utmSource: null }
  if (!startParam.startsWith('ref_')) return { referrerCode: null, utmSource: null }
  const rest = startParam.slice(4)
  const srcIndex = rest.indexOf('_src_')
  if (srcIndex !== -1) {
    return { referrerCode: rest.slice(0, srcIndex) || null, utmSource: rest.slice(srcIndex + 5) || null }
  }
  return { referrerCode: rest || null, utmSource: null }
}

/**
 * Generate unique referral code with retry to avoid race condition
 * on users_referral_code_key UNIQUE constraint
 */
async function generateUniqueReferralCode(supabase: any, maxRetries = 5): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
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
        newCode = String(maxNum + 1 + attempt).padStart(2, '0')
      }
    }

    // Check if code already exists before inserting
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('referral_code', newCode)
      .single()

    if (!existing) return newCode
    console.log(`Referral code ${newCode} taken, retry ${attempt + 1}/${maxRetries}`)
  }

  // Fallback: timestamp-based unique code
  return String(Date.now()).slice(-6)
}

serve(async (req) => {
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

    const isValid = validateTelegramData(initData)
    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid initData' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const params = new URLSearchParams(initData)
    const userDataString = params.get('user')
    const startParamFromInitData = params.get('start_param')
    const effectiveStartParam = startParam || startParamFromInitData

    console.log('effectiveStartParam:', effectiveStartParam)

    if (!userDataString) {
      return new Response(
        JSON.stringify({ error: 'User data not found in initData' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userData = JSON.parse(decodeURIComponent(userDataString))

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', userData.id)
      .single()

    let user = existingUser

    // Parse startParam with UTM support
    const { referrerCode, utmSource } = parseStartParam(effectiveStartParam)
    console.log('Parsed startParam:', { referrerCode, utmSource })

    // Fallback: check pending_referrals
    let finalReferrerCode = referrerCode
    if (!finalReferrerCode) {
      try {
        const { data: pending } = await supabase
          .from('pending_referrals')
          .select('referral_code')
          .eq('telegram_id', userData.id)
          .single()

        if (pending?.referral_code) {
          finalReferrerCode = pending.referral_code
          console.log('Found pending referral code:', finalReferrerCode)
          await supabase.from('pending_referrals').delete().eq('telegram_id', userData.id)
        }
      } catch (_e) { /* ok */ }
    }

    if (!user) {
      // Generate referral code with retry logic (fixes race condition)
      const newReferralCode = await generateUniqueReferralCode(supabase)

      console.log('Creating new user:', { referral_code: newReferralCode, referred_by_code: finalReferrerCode, utm_source: utmSource })

      const insertData: any = {
        telegram_id: userData.id,
        username: userData.username || null,
        first_name: userData.first_name || null,
        last_name: userData.last_name || null,
        avatar_url: userData.photo_url || null,
        language_code: userData.language_code || 'ru',
        referral_code: newReferralCode,
        referred_by_code: finalReferrerCode || null
      }
      if (utmSource) insertData.utm_source = utmSource

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(insertData)
        .select()
        .single()

      if (createError) {
        // Handle unique constraint violation on referral_code - retry with fallback
        if (createError.code === '23505' && createError.message?.includes('referral_code')) {
          console.log('Referral code collision on insert, using timestamp fallback')
          insertData.referral_code = String(Date.now()).slice(-8)
          const { data: retryUser, error: retryError } = await supabase
            .from('users')
            .insert(insertData)
            .select()
            .single()

          if (retryError) {
            console.error('Error creating user (retry):', retryError)
            return new Response(
              JSON.stringify({ error: 'Failed to create user' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          user = retryUser
        } else {
          console.error('Error creating user:', createError)
          return new Response(
            JSON.stringify({ error: 'Failed to create user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        user = newUser
      }

      // Process referral for new user
      if (finalReferrerCode) {
        try {
          const { data: registerResult, error: refError } = await supabase.rpc('register_referral_by_code', {
            p_referrer_code: finalReferrerCode,
            p_referred_telegram_id: userData.id
          })

          if (!refError && registerResult?.success) {
            const { data: bonusResult } = await supabase.rpc('pay_referral_registration_bonus', {
              p_referred_telegram_id: userData.id
            })
            console.log('Referral bonus paid:', bonusResult)
          }
        } catch (e) {
          console.error('Referral processing error (non-fatal):', e)
        }

        // Notify referrer
        try {
          const { data: referrerUser } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('referral_code', finalReferrerCode)
            .single()

          if (referrerUser?.telegram_id) {
            const { data: stats } = await supabase
              .from('referral_stats')
              .select('total_referrals')
              .eq('telegram_id', referrerUser.telegram_id)
              .single()

            const partnerName = userData.first_name || userData.username || 'Новый пользователь'
            const totalPartners = stats?.total_referrals || 1
            const utmNote = utmSource ? `\n📍 Источник: <b>${utmSource}</b>` : ''

            await sendReferralNotification(
              referrerUser.telegram_id,
              `🎉 <b>${partnerName}</b> присоединился по вашей ссылке!\n\nУ вас теперь <b>${totalPartners}</b> партнёр(ов).\nВы получаете бонус с каждой их активности.${utmNote}`
            )
          }
        } catch (e) {
          console.error('Failed to send referral notification:', e)
        }
      }
    } else {
      // Update existing user
      const updateData: any = {
        username: userData.username || user.username,
        first_name: userData.first_name || user.first_name,
        last_name: userData.last_name || user.last_name,
        avatar_url: userData.photo_url || user.avatar_url,
        updated_at: new Date().toISOString()
      }

      if (utmSource && !user.utm_source) {
        updateData.utm_source = utmSource
        console.log('Setting utm_source for existing user:', utmSource)
      }

      if (!user.referral_code) {
        updateData.referral_code = await generateUniqueReferralCode(supabase)
      }

      const { data: updatedUser } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (updatedUser) user = updatedUser

      // Process referral for existing user (if no referrer yet)
      if (finalReferrerCode) {
        const { data: existingReferrer } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_telegram_id', userData.id)
          .single()

        if (!existingReferrer) {
          try {
            const { data: registerResult, error: refError } = await supabase.rpc('register_referral_by_code', {
              p_referrer_code: finalReferrerCode,
              p_referred_telegram_id: userData.id
            })

            if (!refError && registerResult?.success) {
              const { data: bonusResult } = await supabase.rpc('pay_referral_registration_bonus', {
                p_referred_telegram_id: userData.id
              })
              console.log('Referral bonus paid:', bonusResult)
            }
          } catch (e) {
            console.error('Referral processing error (non-fatal):', e)
          }

          // Notify referrer
          try {
            const { data: referrerUser } = await supabase
              .from('users')
              .select('telegram_id')
              .eq('referral_code', finalReferrerCode)
              .single()

            if (referrerUser?.telegram_id) {
              const { data: stats } = await supabase
                .from('referral_stats')
                .select('total_referrals')
                .eq('telegram_id', referrerUser.telegram_id)
                .single()

              const partnerName = userData.first_name || userData.username || 'Новый пользователь'
              const totalPartners = stats?.total_referrals || 1
              const utmNote = utmSource ? `\n📍 Источник: <b>${utmSource}</b>` : ''

              await sendReferralNotification(
                referrerUser.telegram_id,
                `🎉 <b>${partnerName}</b> присоединился по вашей ссылке!\n\nУ вас теперь <b>${totalPartners}</b> партнёр(ов).\nВы получаете бонус с каждой их активности.${utmNote}`
              )
            }
          } catch (e) {
            console.error('Failed to send referral notification:', e)
          }
        }
      }
    }

    // Get user profile
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
