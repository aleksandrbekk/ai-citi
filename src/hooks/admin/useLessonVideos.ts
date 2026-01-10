import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface LessonVideo {
  id: string
  lesson_id: string
  video_id: string | null
  video_url: string | null
  title: string | null
  description: string | null
  order_index: number
  created_at?: string
  updated_at?: string
}

// Legacy хук для обратной совместимости
export function useLessonVideosLegacy(lessonId?: string) {
  const [videos, setVideos] = useState<LessonVideo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadVideos = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('lesson_videos')
        .select('*')
        .order('order_index')
      
      if (lessonId) {
        query = query.eq('lesson_id', lessonId)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      setVideos(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading videos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [lessonId])

  const createVideo = async (videoData: Partial<LessonVideo>): Promise<LessonVideo | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('lesson_videos')
        .insert(videoData)
        .select()
        .single()
      
      if (createError) throw createError
      await loadVideos()
      return data
    } catch (err) {
      console.error('Error creating video:', err)
      return null
    }
  }

  const updateVideo = async (id: string, updates: Partial<LessonVideo>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('lesson_videos')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadVideos()
      return true
    } catch (err) {
      console.error('Error updating video:', err)
      return false
    }
  }

  const deleteVideo = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('lesson_videos')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadVideos()
      return true
    } catch (err) {
      console.error('Error deleting video:', err)
      return false
    }
  }

  return {
    videos,
    isLoading,
    error,
    createVideo,
    updateVideo,
    deleteVideo,
    reload: loadVideos
  }
}

// React Query хуки для админки
export function useLessonVideos(lessonId: string) {
  return useQuery({
    queryKey: ['lesson-videos', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_videos')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index')
      if (error) throw error
      return data || []
    },
    enabled: !!lessonId
  })
}

export function useAddVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lessonId, title, videoUrl, orderIndex }: { lessonId: string, title: string, videoUrl: string, orderIndex: number }) => {
      const { data, error } = await supabase
        .from('lesson_videos')
        .insert({ lesson_id: lessonId, title, video_url: videoUrl, order_index: orderIndex })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['lesson-videos', vars.lessonId] })
  })
}

export function useUpdateVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, title }: { id: string, title: string }) => {
      const { error } = await supabase
        .from('lesson_videos')
        .update({ title })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-videos'] })
  })
}

export function useDeleteVideo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lesson_videos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson-videos'] })
  })
}
