import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

// Загрузка квизов урока
export function useLessonQuizzes(lessonId: string) {
  return useQuery({
    queryKey: ['quizzes', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_quizzes')
        .select(`
          *,
          quiz_options (*)
        `)
        .eq('lesson_id', lessonId)
        .order('order_index')
      if (error) throw error
      return data || []
    },
    enabled: !!lessonId
  })
}

// Добавить вопрос
export function useAddQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ lessonId, question, questionType, orderIndex }: { 
      lessonId: string, question: string, questionType: string, orderIndex: number 
    }) => {
      const { data, error } = await supabase
        .from('lesson_quizzes')
        .insert({ lesson_id: lessonId, question, question_type: questionType, order_index: orderIndex })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['quizzes', vars.lessonId] })
  })
}

// Обновить вопрос
export function useUpdateQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, question }: { id: string, question: string }) => {
      const { error } = await supabase
        .from('lesson_quizzes')
        .update({ question })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] })
  })
}

// Удалить вопрос
export function useDeleteQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('lesson_quizzes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] })
  })
}

// Добавить вариант ответа
export function useAddOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ quizId, optionText, imageUrl, isCorrect, orderIndex }: {
      quizId: string, optionText?: string, imageUrl?: string, isCorrect: boolean, orderIndex: number
    }) => {
      const { data, error } = await supabase
        .from('quiz_options')
        .insert({ quiz_id: quizId, option_text: optionText, image_url: imageUrl, is_correct: isCorrect, order_index: orderIndex })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] })
  })
}

// Обновить вариант ответа
export function useUpdateOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, optionText, imageUrl, isCorrect }: {
      id: string, optionText?: string, imageUrl?: string, isCorrect?: boolean
    }) => {
      const { error } = await supabase
        .from('quiz_options')
        .update({ option_text: optionText, image_url: imageUrl, is_correct: isCorrect })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] })
  })
}

// Удалить вариант ответа
export function useDeleteOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quiz_options').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quizzes'] })
  })
}
