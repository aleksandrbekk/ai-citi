import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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

// React Query хуки для админки
export function useLesson(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['lesson', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Lesson
    },
    enabled: options?.enabled !== false && !!id,
  })
}

export function useUpdateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lesson> }) => {
      const { data: updated, error } = await supabase
        .from('course_lessons')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['module', updated.module_id] })
      queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
  })
}

export function useCreateLesson() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Lesson>) => {
      const { data: created, error } = await supabase
        .from('course_lessons')
        .insert(data)
        .select()
        .single()

      if (error) throw error
      return created
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['module', created.module_id] })
      queryClient.invalidateQueries({ queryKey: ['modules'] })
    },
  })
}
