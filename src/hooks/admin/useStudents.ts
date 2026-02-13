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
        .select('id, tariff_slug, expires_at, is_active, curator_id')
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

// --- Хуки для управления доступом к урокам ---

export function useAllModulesWithLessons() {
  return useQuery({
    queryKey: ['admin-all-modules-lessons'],
    queryFn: async () => {
      const { data: modules, error: modError } = await supabase
        .from('course_modules')
        .select('id, title, order_index, min_tariff')
        .eq('is_active', true)
        .order('order_index')

      if (modError) throw modError

      const { data: lessons, error: lesError } = await supabase
        .from('course_lessons')
        .select('id, module_id, title, order_index, has_homework')
        .eq('is_active', true)
        .order('order_index')

      if (lesError) throw lesError

      return { modules: modules || [], lessons: lessons || [] }
    }
  })
}

export function useStudentLessonUnlocks(userId: string) {
  return useQuery({
    queryKey: ['student-lesson-unlocks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_unlocks')
        .select('lesson_id, is_locked')
        .eq('user_id', userId)

      if (error) throw error
      const unlocks: Record<string, boolean> = {}
      const locks: Record<string, boolean> = {}
      for (const row of data || []) {
        if (row.is_locked) {
          locks[row.lesson_id] = true
        } else {
          unlocks[row.lesson_id] = true
        }
      }
      return { unlocks, locks }
    },
    enabled: !!userId
  })
}

export function useStudentHwStatuses(userId: string) {
  return useQuery({
    queryKey: ['student-hw-statuses', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('lesson_id, status')
        .eq('user_id', userId)

      if (error) throw error
      const map: Record<string, string> = {}
      for (const s of data || []) {
        map[s.lesson_id] = s.status
      }
      return map
    },
    enabled: !!userId
  })
}

export function useToggleLessonUnlock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      open
    }: {
      userId: string
      lessonId: string
      open: boolean
    }) => {
      // open=true → is_locked=false (открыть), open=false → is_locked=true (закрыть)
      const { error } = await supabase
        .from('lesson_unlocks')
        .upsert(
          { user_id: userId, lesson_id: lessonId, is_locked: !open },
          { onConflict: 'user_id,lesson_id' }
        )
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-lesson-unlocks', variables.userId]
      })
    }
  })
}

export function useBulkToggleLessonUnlocks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      lessonIds,
      open
    }: {
      userId: string
      lessonIds: string[]
      open: boolean
    }) => {
      if (lessonIds.length === 0) return
      const rows = lessonIds.map(lessonId => ({
        user_id: userId,
        lesson_id: lessonId,
        is_locked: !open
      }))
      const { error } = await supabase
        .from('lesson_unlocks')
        .upsert(rows, { onConflict: 'user_id,lesson_id' })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['student-lesson-unlocks', variables.userId]
      })
    }
  })
}

export function useStudentSubmissions(userId: string) {
  return useQuery({
    queryKey: ['student-submissions', userId],
    queryFn: async () => {
      const { data: submissions, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!submissions || submissions.length === 0) return []

      const lessonIds = [...new Set(submissions.map(s => s.lesson_id))]
      const { data: lessons } = await supabase
        .from('course_lessons')
        .select('id, title, order_index, module_id')
        .in('id', lessonIds)

      const moduleIds = [...new Set(lessons?.map(l => l.module_id) || [])]
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id, title')
        .in('id', moduleIds)

      // Загружаем данные квизов если есть
      const enriched = await Promise.all(submissions.map(async (sub: any) => {
        const lesson = lessons?.find(l => l.id === sub.lesson_id)
        const module = modules?.find(m => m.id === lesson?.module_id)

        const enrichedSub: any = {
          ...sub,
          lesson_title: lesson?.title || 'Неизвестный урок',
          lesson_order: lesson?.order_index,
          module_title: module?.title || 'Неизвестный модуль',
        }

        if (sub.quiz_answers && Object.keys(sub.quiz_answers).length > 0) {
          const questionIds = Object.keys(sub.quiz_answers)
          const { data: questions } = await supabase
            .from('lesson_quizzes')
            .select('id, question')
            .in('id', questionIds)

          const allOptionIds = Object.values(sub.quiz_answers).flat() as string[]
          if (allOptionIds.length > 0) {
            const { data: options } = await supabase
              .from('quiz_options')
              .select('id, option_text, is_correct')
              .in('id', allOptionIds)
            enrichedSub.quizData = { questions: questions || [], options: options || [] }
          }
        }

        return enrichedSub
      }))

      return enriched
    },
    enabled: !!userId
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
