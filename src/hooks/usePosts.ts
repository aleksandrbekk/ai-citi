import { useState } from 'react'
import { supabase } from '@/lib/supabase'

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
    // ВРЕМЕННОЕ РЕШЕНИЕ: хардкод user_id Александра
    // TODO: убрать после исправления авторизации
    const HARDCODED_USER_ID = 'fe23f297-c1da-46b3-9f21-1e13a2ca9165'
    
    console.log('Using hardcoded user_id:', HARDCODED_USER_ID)
    return HARDCODED_USER_ID
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

  return {
    createPost,
    getPosts,
    isLoading,
    error
  }
}
