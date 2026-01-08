import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Star, CheckCircle } from 'lucide-react'
import { useQuiz, useQuizResponse } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>()
  const { quiz, isLoading } = useQuiz(id || null)
  const { response, startResponse, completeResponse, sessionId } = useQuizResponse(id || null)
  
  const [rating, setRating] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (id && !response) {
      // Записываем событие "view"
      supabase.from('quiz_analytics').insert({
        quiz_id: id,
        event_type: 'view',
        session_id: sessionId
      })
      
      startResponse()
    }
  }, [id, response, startResponse, sessionId])

  useEffect(() => {
    if (response?.completed_at) {
      setIsSubmitted(true)
    }
  }, [response])

  const handleRatingSelect = (value: number) => {
    setRating(value)
  }

  const handleSubmit = async () => {
    if (!rating || !id || !response) return

    // Сохраняем рейтинг как ответ
    const formattedAnswers = [{
      question_id: 'rating', // Используем специальный ID для рейтинга
      option_ids: [],
      rating_value: rating,
      is_correct: true
    }]

    // Записываем событие "start" если еще не записано
    await supabase.from('quiz_analytics').insert({
      quiz_id: id,
      event_type: 'start',
      session_id: sessionId,
      metadata: { rating: rating }
    })

    // Сохраняем рейтинг в ответ
    const completed = await completeResponse(formattedAnswers as any)
    
    if (completed) {
      setIsSubmitted(true)
      
      // Записываем событие "complete" с рейтингом
      await supabase.from('quiz_analytics').insert({
        quiz_id: id,
        event_type: 'complete',
        session_id: sessionId,
        metadata: { rating: rating }
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Квиз не найден</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Спасибо за оценку!</h2>
          <p className="text-zinc-400 text-lg mb-2">Ваш рейтинг: <span className="text-orange-500 font-bold text-2xl">{rating}</span> / 5</p>
          <p className="text-zinc-500 text-sm">Ваш отзыв сохранён</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl w-full">
          {/* Cover Image */}
          {quiz.cover_image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={quiz.cover_image_url}
                alt={quiz.title}
                className="w-full h-64 md:h-80 object-cover"
              />
            </div>
          )}

          {/* Title and Description */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
              {quiz.title}
            </h1>
            {quiz.description && (
              <p className="text-xl text-zinc-400">{quiz.description}</p>
            )}
          </div>

          {/* Rating Section */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-12 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-semibold mb-4">Оцените, пожалуйста</h2>
              <p className="text-zinc-400">Выберите оценку от 1 до 5</p>
            </div>

            {/* Star Rating */}
            <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleRatingSelect(value)}
                  className={`transition-all transform hover:scale-110 ${
                    rating && rating >= value
                      ? 'text-orange-500 scale-110'
                      : 'text-zinc-600 hover:text-orange-400'
                  }`}
                >
                  <Star
                    className={`w-12 h-12 md:w-16 md:h-16 ${
                      rating && rating >= value
                        ? 'fill-current'
                        : ''
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Rating Number Display */}
            {rating && (
              <div className="text-center mb-8">
                <div className="inline-block bg-orange-500/20 border border-orange-500/50 rounded-full px-6 py-3">
                  <span className="text-3xl font-bold text-orange-500">{rating}</span>
                  <span className="text-zinc-400 ml-2">/ 5</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!rating}
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              Отправить оценку
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
