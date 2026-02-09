import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const IG_API_VERSION = 'v22.0'
const IG_GRAPH_URL = `https://graph.instagram.com/${IG_API_VERSION}`

// Ждём пока Instagram обработает контейнер
async function waitForContainerReady(
  containerId: string,
  accessToken: string,
  maxAttempts = 10,
  delayMs = 3000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const resp = await fetch(
      `${IG_GRAPH_URL}/${containerId}?fields=status_code,status&access_token=${accessToken}`
    )
    const data = await resp.json()

    if (data.status_code === 'FINISHED') return

    if (data.status_code === 'ERROR') {
      throw new Error(`Container processing failed: ${data.status || 'unknown error'}`)
    }

    console.log(`[IG-PUBLISH] Container ${containerId}: ${data.status_code}, polling...`)
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  throw new Error('Container processing timed out')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { postId, telegramId } = await req.json()

    if (!postId || !telegramId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing postId or telegramId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Найти user_id по telegram_id
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single()

    if (!userData?.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Достать Instagram аккаунт с токеном (service_role обходит RLS)
    const { data: igAccount } = await supabase
      .from('instagram_accounts')
      .select('id, instagram_user_id, access_token, token_expires_at, username')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single()

    if (!igAccount?.access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'No connected Instagram account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Проверить и обновить токен если скоро истечёт
    let accessToken = igAccount.access_token
    const expiresAt = igAccount.token_expires_at ? new Date(igAccount.token_expires_at) : null
    const now = new Date()

    if (expiresAt && expiresAt < now) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instagram token expired. Please reconnect your account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Обновить если до истечения < 7 дней
    if (expiresAt && (expiresAt.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      console.log('[IG-PUBLISH] Token expiring soon, refreshing...')
      try {
        const refreshResp = await fetch(
          `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
        )
        const refreshData = await refreshResp.json()

        if (refreshData.access_token) {
          accessToken = refreshData.access_token
          const newExpiry = new Date(Date.now() + (refreshData.expires_in || 5184000) * 1000)
          await supabase
            .from('instagram_accounts')
            .update({ access_token: refreshData.access_token, token_expires_at: newExpiry.toISOString() })
            .eq('id', igAccount.id)
          console.log('[IG-PUBLISH] Token refreshed, new expiry:', newExpiry.toISOString())
        }
      } catch (refreshErr) {
        console.error('[IG-PUBLISH] Token refresh failed, continuing with current token')
      }
    }

    // 4. Загрузить пост + медиа
    const { data: post } = await supabase
      .from('scheduled_posts')
      .select('*, post_media(*)')
      .eq('id', postId)
      .eq('user_id', userData.id)
      .single()

    if (!post) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!post.post_media?.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Post has no media' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const imageUrls = post.post_media
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((m: any) => m.public_url)

    const igUserId = igAccount.instagram_user_id
    const caption = post.caption || ''
    let instagramPostId: string

    console.log(`[IG-PUBLISH] Publishing ${imageUrls.length} image(s) to @${igAccount.username}`)

    // 5. Публикация через Instagram Graph API
    if (imageUrls.length === 1) {
      // --- ОДНО ФОТО ---
      const containerResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrls[0], caption, access_token: accessToken }),
      })
      const containerData = await containerResp.json()
      if (containerData.error) {
        throw new Error(`IG error: ${containerData.error.message}`)
      }

      await waitForContainerReady(containerData.id, accessToken)

      const publishResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      })
      const publishData = await publishResp.json()
      if (publishData.error) {
        throw new Error(`IG publish error: ${publishData.error.message}`)
      }
      instagramPostId = publishData.id

    } else {
      // --- КАРУСЕЛЬ (несколько фото) ---
      const childIds: string[] = []

      for (const imageUrl of imageUrls) {
        const itemResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_url: imageUrl, is_carousel_item: true, access_token: accessToken }),
        })
        const itemData = await itemResp.json()
        if (itemData.error) {
          throw new Error(`IG carousel item error: ${itemData.error.message}`)
        }
        childIds.push(itemData.id)
      }

      // Ждём обработки всех элементов
      for (const childId of childIds) {
        await waitForContainerReady(childId, accessToken)
      }

      // Создаём контейнер карусели
      const carouselResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: childIds.join(','),
          caption,
          access_token: accessToken,
        }),
      })
      const carouselData = await carouselResp.json()
      if (carouselData.error) {
        throw new Error(`IG carousel error: ${carouselData.error.message}`)
      }

      await waitForContainerReady(carouselData.id, accessToken)

      // Публикуем карусель
      const publishResp = await fetch(`${IG_GRAPH_URL}/${igUserId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: carouselData.id, access_token: accessToken }),
      })
      const publishData = await publishResp.json()
      if (publishData.error) {
        throw new Error(`IG carousel publish error: ${publishData.error.message}`)
      }
      instagramPostId = publishData.id
    }

    console.log(`[IG-PUBLISH] Published! Post ID: ${instagramPostId}`)

    // 6. Обновляем статус поста
    await supabase
      .from('scheduled_posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        instagram_post_id: instagramPostId,
        instagram_account_id: igAccount.id,
      })
      .eq('id', postId)

    // 7. Логируем успех
    await supabase.from('publish_logs').insert({
      post_id: postId,
      action: 'success',
      message: `Published to @${igAccount.username}`,
      details: { instagram_post_id: instagramPostId, method: 'direct_api' },
    })

    return new Response(
      JSON.stringify({ success: true, instagram_post_id: instagramPostId, username: igAccount.username }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[IG-PUBLISH] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Instagram publish failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
