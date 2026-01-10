import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface Lesson {
  id: string
  module_id: string
  title: string
  description: string | null
  order_index: number
  video_id: string | null
  video_url: string | null
  video_duration: number | null
  has_homework: boolean
  homework_title: string | null
  homework_description: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export function useLessons(moduleId?: string) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadLessons = async () => {
    setIsLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('course_lessons')
        .select('*')
        .order('order_index')
      
      if (moduleId) {
        query = query.eq('module_id', moduleId)
      }
      
      const { data, error: fetchError } = await query
      
      if (fetchError) throw fetchError
      setLessons(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading lessons:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadLessons()
  }, [moduleId])

  const createLesson = async (lessonData: Partial<Lesson>): Promise<Lesson | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('course_lessons')
        .insert(lessonData)
        .select()
        .single()
      
      if (createError) throw createError
      await loadLessons()
      return data
    } catch (err) {
      console.error('Error creating lesson:', err)
      return null
    }
  }

  const updateLesson = async (id: string, updates: Partial<Lesson>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('course_lessons')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadLessons()
      return true
    } catch (err) {
      console.error('Error updating lesson:', err)
      return false
    }
  }

  const deleteLesson = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('course_lessons')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadLessons()
      return true
    } catch (err) {
      console.error('Error deleting lesson:', err)
      return false
    }
  }

  return {
    lessons,
    isLoading,
    error,
    createLesson,
    updateLesson,
    deleteLesson,
    reload: loadLessons
  }
}
