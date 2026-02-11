import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

// ==========================================
// Типы
// ==========================================

export interface ContactFieldConfig {
  enabled: boolean
  required: boolean
  label: string
}

export interface ContactConfig {
  enabled: boolean
  title: string
  description: string
  image_url?: string | null
  fields: {
    name: ContactFieldConfig
    phone: ContactFieldConfig
    telegram: ContactFieldConfig
    email: ContactFieldConfig
  }
}

export interface ResultConfig {
  enabled: boolean
  title: string
  description: string
  image_url: string | null
}

export interface ThankYouConfig {
  title: string
  description: string
  image_url?: string | null
  cta_text: string | null
  cta_url: string | null
}

export interface UserQuiz {
  id: string
  title: string
  description: string | null
  slug: string | null
  cover_image_url: string | null
  cta_text: string
  is_published: boolean
  contact_config: ContactConfig
  result_config: ResultConfig
  thank_you_config: ThankYouConfig
  settings: Record<string, unknown>
  total_views: number
  total_completions: number
  created_at: string
  updated_at: string
}

export interface QuizOptionItem {
  id?: string
  option_text: string
  option_image_url?: string | null
  is_correct: boolean
  order_index: number
}

export interface QuizQuestionItem {
  id?: string
  question_text: string
  question_image_url?: string | null
  question_type: 'single_choice' | 'multiple_choice' | 'text'
  order_index: number
  is_required: boolean
  options: QuizOptionItem[]
}

export interface QuizWithQuestions extends UserQuiz {
  questions: QuizQuestionItem[]
  telegram_id: number
}

export interface QuizLead {
  id: string
  quiz_id: string
  session_id: string | null
  name: string | null
  phone: string | null
  telegram_username: string | null
  email: string | null
  answers: Array<{
    question_id: string
    question_text: string
    answer_text: string
  }>
  created_at: string
}

// ==========================================
// useUserQuizzes — CRUD квизов через RPC
// ==========================================

export function useUserQuizzes() {
  const [quizzes, setQuizzes] = useState<UserQuiz[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  const telegramUser = getTelegramUser()
  const telegramId = telegramUser?.id || null
  const telegramIdRef = useRef(telegramId)
  telegramIdRef.current = telegramId

  const loadQuizzes = useCallback(async () => {
    const tgId = telegramIdRef.current
    if (!tgId) return

    const { data, error } = await supabase.rpc('nq_get_user_quizzes', {
      p_telegram_id: tgId,
    })

    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes(data || [])
    }
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (telegramId) loadQuizzes()
  }, [telegramId, loadQuizzes])

  const createQuiz = useCallback(async (title: string = 'Новый квиз'): Promise<{ id: string; slug: string } | null> => {
    const tgId = telegramIdRef.current
    if (!tgId) return null

    const { data, error } = await supabase.rpc('nq_create_quiz', {
      p_telegram_id: tgId,
      p_title: title,
    })

    if (error) {
      console.error('Error creating quiz:', error)
      return null
    }

    await loadQuizzes()
    return data?.[0] || null
  }, [loadQuizzes])

  const updateQuiz = useCallback(async (quizId: string, updates: Record<string, unknown>): Promise<boolean> => {
    const tgId = telegramIdRef.current
    if (!tgId) return false

    const { error } = await supabase.rpc('nq_update_quiz', {
      p_telegram_id: tgId,
      p_quiz_id: quizId,
      p_updates: updates,
    })

    if (error) {
      console.error('Error updating quiz:', error)
      return false
    }

    await loadQuizzes()
    return true
  }, [loadQuizzes])

  const deleteQuiz = useCallback(async (quizId: string): Promise<boolean> => {
    const tgId = telegramIdRef.current
    if (!tgId) return false

    const { data, error } = await supabase.rpc('nq_delete_quiz', {
      p_telegram_id: tgId,
      p_quiz_id: quizId,
    })

    if (error) {
      console.error('Error deleting quiz:', error)
      return false
    }

    await loadQuizzes()
    return !!data
  }, [loadQuizzes])

  const saveQuestions = useCallback(async (quizId: string, questions: QuizQuestionItem[]): Promise<boolean> => {
    const tgId = telegramIdRef.current
    if (!tgId) return false

    const { error } = await supabase.rpc('nq_save_questions', {
      p_telegram_id: tgId,
      p_quiz_id: quizId,
      p_questions: questions,
    })

    if (error) {
      console.error('Error saving questions:', error)
      return false
    }

    return true
  }, [])

  const getQuizWithQuestions = useCallback(async (quizId: string): Promise<QuizWithQuestions | null> => {
    const { data, error } = await supabase.rpc('nq_get_quiz_with_questions', {
      p_quiz_id: quizId,
    })

    if (error) {
      console.error('Error loading quiz:', error)
      return null
    }

    return data as QuizWithQuestions | null
  }, [])

  const getLeads = useCallback(async (quizId: string): Promise<QuizLead[]> => {
    const tgId = telegramIdRef.current
    if (!tgId) return []

    const { data, error } = await supabase.rpc('nq_get_quiz_leads', {
      p_telegram_id: tgId,
      p_quiz_id: quizId,
    })

    if (error) {
      console.error('Error loading leads:', error)
      return []
    }

    return data || []
  }, [])

  return {
    quizzes,
    isLoading: !isInitialized,
    telegramId,
    loadQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    saveQuestions,
    getQuizWithQuestions,
    getLeads,
  }
}

// ==========================================
// usePublicQuiz — прохождение публичного квиза
// ==========================================

export function usePublicQuiz(slug: string | undefined) {
  const [quiz, setQuiz] = useState<QuizWithQuestions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: rpcError } = await supabase.rpc('nq_get_quiz_by_slug', {
        p_slug: slug,
      })

      if (cancelled) return

      if (rpcError) {
        console.error('Error loading public quiz:', rpcError)
        setError('Ошибка загрузки квиза')
      } else if (!data) {
        setError('Квиз не найден')
      } else {
        setQuiz(data as QuizWithQuestions)

        // Инкремент просмотров
        supabase.rpc('nq_increment_views', {
          p_quiz_id: (data as QuizWithQuestions).id,
        })
      }

      setIsLoading(false)
    }

    load()

    return () => { cancelled = true }
  }, [slug])

  const submitLead = useCallback(async (leadData: {
    name?: string
    phone?: string
    telegram_username?: string
    email?: string
    answers: Array<{ question_id: string; question_text: string; answer_text: string }>
  }): Promise<string | null> => {
    if (!quiz) return null

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const { data: leadId, error: submitError } = await supabase.rpc('nq_submit_lead', {
      p_quiz_id: quiz.id,
      p_session_id: sessionId,
      p_name: leadData.name || null,
      p_phone: leadData.phone || null,
      p_email: leadData.email || null,
      p_telegram_username: leadData.telegram_username || null,
      p_answers: leadData.answers,
    })

    if (submitError) {
      console.error('Error submitting lead:', submitError)
      return null
    }

    // Отправляем TG уведомление через edge function
    try {
      await supabase.functions.invoke('quiz-lead-notify', {
        body: {
          quiz_id: quiz.id,
          lead_name: leadData.name,
          lead_phone: leadData.phone,
          lead_telegram: leadData.telegram_username,
          lead_email: leadData.email,
          lead_answers: leadData.answers,
        },
      })
    } catch (notifyError) {
      console.error('Notification error:', notifyError)
    }

    return leadId as string
  }, [quiz])

  return {
    quiz,
    isLoading,
    error,
    submitLead,
  }
}
