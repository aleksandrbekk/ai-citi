import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface Quiz {
  id: string
  user_id: string
  title: string
  description: string | null
  cover_image_url: string | null
  is_published: boolean
  is_public: boolean
  settings: {
    show_correct_answers?: boolean
    randomize_questions?: boolean
    randomize_options?: boolean
    time_limit?: number | null
    passing_score?: number | null
    show_progress?: boolean
    allow_retake?: boolean
  }
  total_views: number
  total_completions: number
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  question_text: string
  question_image_url: string | null
  question_type: 'single_choice' | 'multiple_choice' | 'text' | 'rating'
  order_index: number
  is_required: boolean
  points: number
  created_at: string
  updated_at: string
}

export interface QuizOption {
  id: string
  question_id: string
  option_text: string
  option_image_url: string | null
  is_correct: boolean
  order_index: number
  created_at: string
}

export interface QuizResponse {
  id: string
  quiz_id: string
  user_id: string | null
  session_id: string | null
  started_at: string
  completed_at: string | null
  score: number
  max_score: number | null
  percentage: number | null
  answers: Array<{
    question_id: string
    option_ids?: string[]
    text_answer?: string
    is_correct?: boolean
  }>
  metadata: Record<string, any>
  created_at: string
}

// Генерация session_id для анонимных пользователей
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function useQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const userId = useAuthStore((state) => state.user?.id)

  // Проверяем, что userId это валидный UUID, иначе используем null
  const validUserId = userId && userId !== 'dev-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null

  const loadQuizzes = async () => {
    if (!validUserId) return
    
    setIsLoading(true)
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', validUserId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error loading quizzes:', error)
    } else {
      setQuizzes(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadQuizzes()
  }, [validUserId])

  const createQuiz = async (quizData: Partial<Quiz>): Promise<Quiz | null> => {
    if (!validUserId) return null

    const { data, error } = await supabase
      .from('quizzes')
      .insert({
        user_id: validUserId || '00000000-0000-0000-0000-000000000001',
        title: quizData.title || 'Новый квиз',
        description: quizData.description || null,
        cover_image_url: quizData.cover_image_url || null,
        settings: quizData.settings || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quiz:', error)
      return null
    }

    await loadQuizzes()
    return data
  }

  const updateQuiz = async (quizId: string, updates: Partial<Quiz>): Promise<boolean> => {
    const { error } = await supabase
      .from('quizzes')
      .update(updates)
      .eq('id', quizId)

    if (error) {
      console.error('Error updating quiz:', error)
      return false
    }

    await loadQuizzes()
    return true
  }

  const deleteQuiz = async (quizId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (error) {
      console.error('Error deleting quiz:', error)
      return false
    }

    await loadQuizzes()
    return true
  }

  return {
    quizzes,
    isLoading,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    loadQuizzes
  }
}

export function useQuiz(quizId: string | null) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadQuiz = async () => {
    if (!quizId) return

    setIsLoading(true)
    
    // Загружаем квиз
    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (quizError) {
      console.error('Error loading quiz:', quizError)
      setIsLoading(false)
      return
    }

    setQuiz(quizData)

    // Загружаем вопросы
    const { data: questionsData, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    if (questionsError) {
      console.error('Error loading questions:', questionsError)
    } else {
      setQuestions(questionsData || [])
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuestions = async () => {
    if (!quizId) return

    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error loading questions:', error)
    } else {
      setQuestions(data || [])
    }
  }

  const createQuestion = async (questionData: Partial<QuizQuestion>): Promise<QuizQuestion | null> => {
    if (!quizId) return null

    const maxOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.order_index)) 
      : -1

    const { data, error } = await supabase
      .from('quiz_questions')
      .insert({
        quiz_id: quizId,
        question_text: questionData.question_text || '',
        question_image_url: questionData.question_image_url || null,
        question_type: questionData.question_type || 'single_choice',
        order_index: maxOrder + 1,
        is_required: questionData.is_required !== undefined ? questionData.is_required : true,
        points: questionData.points || 1
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating question:', error)
      return null
    }

    await loadQuestions()
    return data
  }

  const updateQuestion = async (questionId: string, updates: Partial<QuizQuestion>): Promise<boolean> => {
    const { error } = await supabase
      .from('quiz_questions')
      .update(updates)
      .eq('id', questionId)

    if (error) {
      console.error('Error updating question:', error)
      return false
    }

    await loadQuestions()
    return true
  }

  const deleteQuestion = async (questionId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)

    if (error) {
      console.error('Error deleting question:', error)
      return false
    }

    await loadQuestions()
    return true
  }

  return {
    quiz,
    questions,
    isLoading,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    loadQuestions
  }
}

export function useQuizOptions(questionId: string | null) {
  const [options, setOptions] = useState<QuizOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadOptions = async () => {
    if (!questionId) return

    setIsLoading(true)
    const { data, error } = await supabase
      .from('quiz_options')
      .select('*')
      .eq('question_id', questionId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error loading options:', error)
    } else {
      setOptions(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadOptions()
  }, [questionId])

  const createOption = async (optionData: Partial<QuizOption>): Promise<QuizOption | null> => {
    if (!questionId) return null

    const maxOrder = options.length > 0 
      ? Math.max(...options.map(o => o.order_index)) 
      : -1

    const { data, error } = await supabase
      .from('quiz_options')
      .insert({
        question_id: questionId,
        option_text: optionData.option_text || '',
        option_image_url: optionData.option_image_url || null,
        is_correct: optionData.is_correct || false,
        order_index: maxOrder + 1
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating option:', error)
      return null
    }

    await loadOptions()
    return data
  }

  const updateOption = async (optionId: string, updates: Partial<QuizOption>): Promise<boolean> => {
    const { error } = await supabase
      .from('quiz_options')
      .update(updates)
      .eq('id', optionId)

    if (error) {
      console.error('Error updating option:', error)
      return false
    }

    await loadOptions()
    return true
  }

  const deleteOption = async (optionId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('quiz_options')
      .delete()
      .eq('id', optionId)

    if (error) {
      console.error('Error deleting option:', error)
      return false
    }

    await loadOptions()
    return true
  }

  return {
    options,
    isLoading,
    createOption,
    updateOption,
    deleteOption,
    loadOptions
  }
}

export function useQuizResponse(quizId: string | null) {
  const [response, setResponse] = useState<QuizResponse | null>(null)
  const [sessionId] = useState(() => generateSessionId())
  const userId = useAuthStore((state) => state.user?.id)

  // Проверяем, что userId это валидный UUID, иначе используем null
  const validUserId = userId && userId !== 'dev-user' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId) ? userId : null

  const startResponse = async (): Promise<QuizResponse | null> => {
    if (!quizId) return null

    // Записываем событие "start"
    await supabase
      .from('quiz_analytics')
      .insert({
        quiz_id: quizId,
        event_type: 'start',
        user_id: validUserId,
        session_id: sessionId
      })

    const { data, error } = await supabase
      .from('quiz_responses')
      .insert({
        quiz_id: quizId,
        user_id: validUserId,
        session_id: sessionId,
        started_at: new Date().toISOString(),
        answers: []
      })
      .select()
      .single()

    if (error) {
      console.error('Error starting response:', error)
      return null
    }

    setResponse(data)
    return data
  }

  const updateResponse = async (answers: QuizResponse['answers']): Promise<boolean> => {
    if (!response) return false

    const { error } = await supabase
      .from('quiz_responses')
      .update({ answers })
      .eq('id', response.id)

    if (error) {
      console.error('Error updating response:', error)
      return false
    }

    setResponse({ ...response, answers })
    return true
  }

  const completeResponse = async (answers: QuizResponse['answers'] | any[]): Promise<QuizResponse | null> => {
    if (!response || !quizId) return null

    // Проверяем, это рейтинг (один слайдер) или рейтинг по рядам (карусели) или обычный квиз
    const isSingleRating =
      answers.length === 1 &&
      answers[0]?.question_id === 'rating' &&
      typeof (answers[0] as any)?.rating_value === 'number'

    const isRowRating =
      answers.length > 0 &&
      answers.every((a: any) => typeof a?.rating_value === 'number') &&
      answers.some((a: any) => typeof a?.row_index === 'number' || String(a?.question_id || '').startsWith('row-'))
    
    let score = 0
    let maxScore = 0
    let percentage = 0

    if (isSingleRating) {
      // Старый формат: один рейтинг (1-5)
      const ratingValue = (answers[0] as any)?.rating_value || 0
      score = ratingValue
      maxScore = 5
      percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
    } else if (isRowRating) {
      // Новый формат: один рейтинг (1-10) на каждый ряд/карусель
      score = (answers as any[]).reduce((sum, a) => sum + (Number(a.rating_value) || 0), 0)
      maxScore = answers.length * 10
      percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
    } else {
      // Загружаем вопросы и опции для подсчёта баллов
      const { data: questions } = await supabase
        .from('quiz_questions')
        .select(`
          id,
          points,
          question_type,
          quiz_options (
            id,
            is_correct
          )
        `)
        .eq('quiz_id', quizId)

      if (!questions) return null

      // Подсчитываем баллы
      questions.forEach((q: any) => {
        maxScore += q.points
        const answer = answers.find((a: any) => a.question_id === q.id)
        if (answer) {
          const questionOptions = (q.quiz_options || []) as QuizOption[]
          const correctOptions = questionOptions.filter((o: QuizOption) => o.is_correct).map((o: QuizOption) => o.id)
          
          if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
            const userOptions = answer.option_ids || []
            const isCorrect = correctOptions.length === userOptions.length &&
              correctOptions.every(id => userOptions.includes(id))
            
            if (isCorrect) {
              score += q.points
              answer.is_correct = true
            } else {
              answer.is_correct = false
            }
          } else {
            // Для текстовых ответов и рейтинга считаем как правильные
            answer.is_correct = true
            score += q.points
          }
        }
      })

      percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
    }

    // Обновляем ответ
    const { data, error } = await supabase
      .from('quiz_responses')
      .update({
        answers,
        score,
        max_score: maxScore,
        percentage,
        completed_at: new Date().toISOString()
      })
      .eq('id', response.id)
      .select()
      .single()

    if (error) {
      console.error('Error completing response:', error)
      return null
    }

    // Записываем событие "complete"
    await supabase
      .from('quiz_analytics')
      .insert({
        quiz_id: quizId,
        event_type: 'complete',
        user_id: validUserId,
        session_id: sessionId
      })

    setResponse(data)
    return data
  }

  return {
    response,
    sessionId,
    startResponse,
    updateResponse,
    completeResponse
  }
}

export function useQuizAnalytics(quizId: string | null) {
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalStarts: 0,
    totalCompletions: 0,
    completionRate: 0,
    averageScore: 0,
    averagePercentage: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadAnalytics = async () => {
    if (!quizId) return

    setIsLoading(true)

    // Загружаем квиз для базовой статистики
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('total_views, total_completions')
      .eq('id', quizId)
      .single()

    // Загружаем события
    const { data: events } = await supabase
      .from('quiz_analytics')
      .select('event_type')
      .eq('quiz_id', quizId)

    // Загружаем завершённые ответы
    const { data: responses } = await supabase
      .from('quiz_responses')
      .select('score, max_score, percentage')
      .eq('quiz_id', quizId)
      .not('completed_at', 'is', null)

    const starts = events?.filter(e => e.event_type === 'start').length || 0
    const completions = events?.filter(e => e.event_type === 'complete').length || 0
    const completionRate = starts > 0 ? (completions / starts) * 100 : 0

    const avgScore = responses && responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.score || 0), 0) / responses.length
      : 0

    const avgPercentage = responses && responses.length > 0
      ? responses.reduce((sum, r) => sum + (r.percentage || 0), 0) / responses.length
      : 0

    setAnalytics({
      totalViews: quiz?.total_views || 0,
      totalStarts: starts,
      totalCompletions: completions,
      completionRate,
      averageScore: avgScore,
      averagePercentage: avgPercentage
    })

    setIsLoading(false)
  }

  useEffect(() => {
    loadAnalytics()
  }, [quizId])

  return {
    analytics,
    isLoading,
    loadAnalytics
  }
}
