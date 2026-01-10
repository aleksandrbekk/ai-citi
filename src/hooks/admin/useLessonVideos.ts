import { useState, useEffect } from 'react'
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

export function useLessonVideos(lessonId?: string) {
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
