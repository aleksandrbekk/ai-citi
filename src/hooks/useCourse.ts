import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Типы
export interface Module {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  order_index: number
  min_tariff: string
  lessons_count: number
  is_active: boolean
}

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
}

export interface LessonMaterial {
  id: string
  lesson_id: string
  type: 'pdf' | 'sheet' | 'link' | 'file'
  title: string | null
  url: string
  order_index: number
}

export interface HomeworkSubmission {
  id: string
  user_id: string
  lesson_id: string
  answer_text: string | null
  answer_files: string[] | null
  status: 'pending' | 'approved' | 'rejected'
  curator_comment: string | null
  reviewed_at: string | null
  created_at: string
}

// Получить все модули
export function useModules() {
  return useQuery({
    queryKey: ['modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('is_active', true)
        .order('order_index')
      
      if (error) throw error
      return data as Module[]
    }
  })
}

// Получить один модуль
export function useModule(moduleId: string) {
  return useQuery({
    queryKey: ['module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('*')
        .eq('id', moduleId)
        .single()
      
      if (error) throw error
      return data as Module
    },
    enabled: !!moduleId
  })
}

// Получить уроки модуля
export function useLessons(moduleId: string) {
  return useQuery({
    queryKey: ['lessons', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('order_index')
      
      if (error) throw error
      return data as Lesson[]
    },
    enabled: !!moduleId
  })
}

// Получить один урок с материалами
export function useLesson(lessonId: string) {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data: lesson, error: lessonError } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', lessonId)
        .single()
      
      if (lessonError) throw lessonError

      const { data: materials, error: materialsError } = await supabase
        .from('lesson_materials')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index')
      
      if (materialsError) throw materialsError

      return { lesson: lesson as Lesson, materials: materials as LessonMaterial[] }
    },
    enabled: !!lessonId
  })
}

// Получить ДЗ пользователя по уроку
export function useHomeworkSubmission(lessonId: string, userId: string) {
  return useQuery({
    queryKey: ['homework', lessonId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data as HomeworkSubmission | null
    },
    enabled: !!lessonId && !!userId
  })
}

// Отправить ДЗ
export function useSubmitHomework() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ lessonId, userId, answerText }: { 
      lessonId: string
      userId: string
      answerText: string 
    }) => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .insert({
          lesson_id: lessonId,
          user_id: userId,
          answer_text: answerText,
          status: 'pending'
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['homework', variables.lessonId] })
    }
  })
}






