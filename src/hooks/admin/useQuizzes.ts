import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export interface Quiz {
  id: string
  user_id: string | null
  title: string
  description: string | null
  cover_image_url: string | null
  settings: Record<string, any>
  created_at?: string
  updated_at?: string
}

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadQuizzes = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (fetchError) throw fetchError
      setQuizzes(data || [])
    } catch (err) {
      setError(err as Error)
      console.error('Error loading quizzes:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadQuizzes()
  }, [])

  const createQuiz = async (quizData: Partial<Quiz>): Promise<Quiz | null> => {
    try {
      const { data, error: createError } = await supabase
        .from('quizzes')
        .insert(quizData)
        .select()
        .single()
      
      if (createError) throw createError
      await loadQuizzes()
      return data
    } catch (err) {
      console.error('Error creating quiz:', err)
      return null
    }
  }

  const updateQuiz = async (id: string, updates: Partial<Quiz>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('quizzes')
        .update(updates)
        .eq('id', id)
      
      if (updateError) throw updateError
      await loadQuizzes()
      return true
    } catch (err) {
      console.error('Error updating quiz:', err)
      return false
    }
  }

  const deleteQuiz = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', id)
      
      if (deleteError) throw deleteError
      await loadQuizzes()
      return true
    } catch (err) {
      console.error('Error deleting quiz:', err)
      return false
    }
  }

  return {
    quizzes,
    isLoading,
    error,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    reload: loadQuizzes
  }
}
