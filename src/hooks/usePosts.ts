import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// URL n8n теперь хранится в Edge Function для безопасности

interface CreatePostData {
  caption: string
  scheduledAt?: Date
  mediaFiles: File[]
}

export function usePosts() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Получить user_id из базы данных
  const getUserId = async (): Promise<string | null> => {
    // Попробуем получить из Telegram
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      const telegramId = tg.initDataUnsafe.user.id

      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single()

      if (data?.id) {
        console.log('Got user_id from Telegram:', data.id)
        return data.id
      }
    }

    // Fallback: хардкод для тестирования вне Telegram
    const FALLBACK_USER_ID = 'fe23f297-c1da-46b3-9f21-1e13a2ca9165'
    console.log('Using fallback user_id:', FALLBACK_USER_ID)
    return FALLBACK_USER_ID
  }

  // Загрузка медиа в Storage
  const uploadMedia = async (postId: string, files: File[]) => {
    const uploadedMedia = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${postId}/${i + 1}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('poster-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw new Error(`Ошибка загрузки: ${uploadError.message}`)
      }

      const { data: { publicUrl } } = supabase.storage
        .from('poster-media')
        .getPublicUrl(fileName)

      uploadedMedia.push({
        order_index: i + 1,
        storage_path: fileName,
        public_url: publicUrl,
        file_size: file.size
      })
    }

    return uploadedMedia
  }

  // Создание поста
  const createPost = async (data: CreatePostData) => {
    setIsLoading(true)
    setError(null)

    try {
      // Получаем user_id
      const userId = await getUserId()

      if (!userId) {
        throw new Error('Пользователь не найден. Перезайдите в приложение.')
      }

      // 1. Создаём пост в БД
      const status = data.scheduledAt ? 'scheduled' : 'draft'

      const { data: post, error: postError } = await supabase
        .from('scheduled_posts')
        .insert({
          user_id: userId,
          caption: data.caption || '',
          scheduled_at: data.scheduledAt?.toISOString() || null,
          status: status
        })
        .select()
        .single()

      if (postError) {
        throw new Error(`Ошибка создания поста: ${postError.message}`)
      }

      // 2. Загружаем медиа
      if (data.mediaFiles.length > 0) {
        const uploadedMedia = await uploadMedia(post.id, data.mediaFiles)

        // 3. Сохраняем медиа в БД
        const { error: mediaError } = await supabase
          .from('post_media')
          .insert(uploadedMedia.map(m => ({
            post_id: post.id,
            ...m
          })))

        if (mediaError) {
          console.error('Media DB error:', mediaError)
        }
      }

      return post
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(message)
      console.error('Create post error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Получение постов пользователя
  const getPosts = async () => {
    const userId = await getUserId()
    if (!userId) return []

    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        post_media (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return []
    }

    return data || []
  }

  // Получение одного поста
  const getPost = async (postId: string) => {
    const userId = await getUserId()
    if (!userId) return null

    const { data, error } = await supabase
      .from('scheduled_posts')
      .select(`
        *,
        post_media (*)
      `)
      .eq('id', postId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching post:', error)
      return null
    }

    return data
  }

  // Обновление поста
  const updatePost = async (postId: string, data: CreatePostData) => {
    setIsLoading(true)
    setError(null)

    try {
      const userId = await getUserId()
      if (!userId) {
        throw new Error('Пользователь не найден')
      }

      const status = data.scheduledAt ? 'scheduled' : 'draft'

      // Обновляем пост
      const { data: post, error: postError } = await supabase
        .from('scheduled_posts')
        .update({
          caption: data.caption || '',
          scheduled_at: data.scheduledAt?.toISOString() || null,
          status: status
        })
        .eq('id', postId)
        .select()
        .single()

      if (postError) {
        throw new Error(`Ошибка обновления: ${postError.message}`)
      }

      // Если есть новые медиа - удаляем старые и загружаем новые
      if (data.mediaFiles.length > 0) {
        // Удаляем старые медиа
        const { data: oldMedia } = await supabase
          .from('post_media')
          .select('storage_path')
          .eq('post_id', postId)

        if (oldMedia && oldMedia.length > 0) {
          const paths = oldMedia.map(m => m.storage_path)
          await supabase.storage.from('poster-media').remove(paths)
        }

        await supabase.from('post_media').delete().eq('post_id', postId)

        // Загружаем новые медиа
        const uploadedMedia = await uploadMedia(post.id, data.mediaFiles)
        await supabase.from('post_media').insert(uploadedMedia.map(m => ({
          post_id: post.id,
          ...m
        })))
      }

      return post
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(message)
      console.error('Update post error:', err)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  // Удаление поста
  const deletePost = async (postId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Сначала удаляем медиа из Storage
      const { data: mediaFiles } = await supabase
        .from('post_media')
        .select('storage_path')
        .eq('post_id', postId)

      if (mediaFiles && mediaFiles.length > 0) {
        const paths = mediaFiles.map(m => m.storage_path)
        const { error: storageError } = await supabase.storage
          .from('poster-media')
          .remove(paths)

        if (storageError) {
          console.error('Storage delete error:', storageError)
        }
      }

      // Удаляем пост (каскадно удалит post_media)
      const { error: deleteError } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId)

      if (deleteError) {
        throw new Error(`Ошибка удаления: ${deleteError.message}`)
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      setError(message)
      console.error('Delete post error:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createPost,
    updatePost,
    getPosts,
    getPost,
    deletePost,
    isLoading,
    error
  }
}

// Публикация в Instagram — через свой аккаунт (direct API) или n8n (fallback)
export const usePublishToInstagram = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      // Получаем пост с медиа
      const { data: post, error: postError } = await supabase
        .from('scheduled_posts')
        .select(`*, post_media (*)`)
        .eq('id', postId)
        .single()

      if (postError || !post) throw new Error('Post not found')
      if (!post.post_media?.length) throw new Error('No media in post')

      // Проверяем есть ли подключённый Instagram аккаунт
      const tg = window.Telegram?.WebApp
      const telegramId = tg?.initDataUnsafe?.user?.id || null

      let hasConnectedAccount = false
      if (telegramId) {
        try {
          const { data: accountData } = await supabase.functions.invoke('get-instagram-account', {
            body: { telegram_id: telegramId }
          })
          hasConnectedAccount = !!accountData?.account?.is_active
        } catch {
          hasConnectedAccount = false
        }
      }

      if (hasConnectedAccount && telegramId) {
        // --- НОВЫЙ FLOW: Прямой Instagram API через токен пользователя ---
        const { data: result, error } = await supabase.functions.invoke('instagram-publish', {
          body: { postId: post.id, telegramId }
        })

        if (error) throw new Error(`Publish failed: ${error.message}`)
        if (!result?.success) throw new Error(result?.error || 'Publish failed')

        // Edge function сама обновляет статус и логи в БД
        return result

      } else {
        // --- СТАРЫЙ FLOW: n8n proxy (Александр) — НЕ ТРОГАЕМ ---
        const imageUrls = post.post_media
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((m: any) => m.public_url)

        const { data: result, error } = await supabase.functions.invoke('n8n-publish-proxy', {
          body: {
            postId: post.id,
            caption: post.caption || '',
            imageUrls
          }
        })

        if (error) {
          throw new Error(`Publish failed: ${error.message}`)
        }

        // Обновляем статус поста
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            instagram_post_id: result.instagram_post_id
          })
          .eq('id', postId)

        // Логируем успех
        await supabase.from('publish_logs').insert({
          post_id: postId,
          action: 'success',
          message: 'Published to Instagram via n8n',
          details: result
        })

        return result
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: async (error, postId) => {
      // Логируем ошибку
      await supabase.from('publish_logs').insert({
        post_id: postId,
        action: 'error',
        message: error.message
      })

      // Обновляем статус
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', postId)
    }
  })
}
