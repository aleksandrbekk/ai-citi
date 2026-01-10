import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface Student {
  id: string
  telegram_id: number
  first_name: string | null
  last_name: string | null
  username: string | null
  avatar_url: string | null
  created_at?: string
  updated_at?: string
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadStudents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setStudents(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading students:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStudents()
  }, [])

  const updateStudent = async (id: string, updates: Partial<Student>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadStudents()
      return true
    } catch (err) {
      console.error('Error updating student:', err)
      return false
    }
  }

  const deleteStudent = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadStudents()
      return true
    } catch (err) {
      console.error('Error deleting student:', err)
      return false
    }
  }

  return {
    students,
    isLoading,
    error,
    updateStudent,
    deleteStudent,
    reload: loadStudents
  }
}

// React Query хуки для админки
export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface UserTariff {
  id: string
  user_id: string
  tariff_slug: string
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface StudentWithTariff extends User {
  tariff_slug: string
  expires_at: string | null
  tariff_id: string
}

export interface StudentProgress {
  lesson_id: string
  completed_at: string
  lesson_title?: string
  module_title?: string
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ['student', id],
    queryFn: async () => {
      // Загружаем пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, telegram_id, username, first_name, last_name, created_at')
        .eq('id', id)
        .single()
      
      if (userError) throw userError
      if (!user) return null
      
      // Загружаем тариф
      const { data: tariff } = await supabase
        .from('user_tariffs')
        .select('id, tariff_slug, expires_at, is_active')
        .eq('user_id', id)
        .single()
      
      return {
        ...user,
        tariff: tariff || null
      }
    },
    enabled: !!id
  })
}

export function useStudentProgress(userId: string) {
  return useQuery({
    queryKey: ['student-progress', userId],
    queryFn: async () => {
      const { data: progress, error: progressError } = await supabase
        .from('user_course_progress')
        .select('lesson_id, completed_at')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })

      if (progressError) throw progressError

      // Получаем информацию об уроках
      if (progress && progress.length > 0) {
        const lessonIds = progress.map((p) => p.lesson_id)
        const { data: lessons, error: lessonsError } = await supabase
          .from('course_lessons')
          .select('id, title, module_id')
          .in('id', lessonIds)

        if (lessonsError) throw lessonsError

        // Получаем информацию о модулях
        const moduleIds = [...new Set(lessons?.map((l) => l.module_id) || [])]
        const { data: modules, error: modulesError } = await supabase
          .from('course_modules')
          .select('id, title')
          .in('id', moduleIds)

        if (modulesError) throw modulesError

        const progressWithDetails = progress.map((p) => {
          const lesson = lessons?.find((l) => l.id === p.lesson_id)
          const module = modules?.find((m) => m.id === lesson?.module_id)
          return {
            lesson_id: p.lesson_id,
            completed_at: p.completed_at,
            lesson_title: lesson?.title,
            module_title: module?.title,
          } as StudentProgress
        })

        return progressWithDetails
      }

      return [] as StudentProgress[]
    },
    enabled: !!userId,
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tariffId,
      data,
    }: {
      userId: string
      tariffId: string
      data: Partial<{ tariff_slug: string; expires_at: string | null }>
    }) => {
      const { data: updated, error } = await supabase
        .from('user_tariffs')
        .update(data)
        .eq('id', tariffId)
        .select()
        .single()

      if (error) throw error
      return updated
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student', variables.userId] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      telegram_id: number
      username?: string | null
      first_name?: string | null
      tariff_slug: string
      expires_at?: string | null
    }) => {
      // Создаем пользователя
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          telegram_id: data.telegram_id,
          username: data.username || null,
          first_name: data.first_name || null,
        })
        .select()
        .single()

      if (userError) throw userError

      // Создаем тариф
      const { data: tariff, error: tariffError } = await supabase
        .from('user_tariffs')
        .insert({
          user_id: user.id,
          tariff_slug: data.tariff_slug,
          expires_at: data.expires_at || null,
        })
        .select()
        .single()

      if (tariffError) {
        // Если ошибка при создании тарифа, удаляем пользователя
        await supabase.from('users').delete().eq('id', user.id)
        throw tariffError
      }

      return { user, tariff }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
