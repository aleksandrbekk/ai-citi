import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowRight, ArrowLeft, Trophy } from 'lucide-react'
import { useQuiz, useQuizResponse, type QuizQuestion, type QuizOption } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { quiz, questions, isLoading } = useQuiz(id || null)
  const { response, startResponse, updateResponse, completeResponse, sessionId } = useQuizResponse(id || null)
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [showResults, setShowResults] = useState(false)

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
      setShowResults(true)
    }
  }, [response])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка квиза...</p>
        </div>
      </div>
    )
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Квиз не найден</p>
          <button
            onClick={() => navigate('/quizzes')}
            className="px-6 py-2 bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
          >
            Вернуться
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleAnswer = (optionId: string) => {
    const questionId = currentQuestion.id
    const currentAnswers = answers[questionId] || []
    
    let newAnswers: string[]
    if (currentQuestion.question_type === 'single_choice') {
      newAnswers = [optionId]
    } else if (currentQuestion.question_type === 'multiple_choice') {
      if (currentAnswers.includes(optionId)) {
        newAnswers = currentAnswers.filter(id => id !== optionId)
      } else {
        newAnswers = [...currentAnswers, optionId]
      }
    } else {
      newAnswers = [optionId]
    }
    
    setAnswers({ ...answers, [questionId]: newAnswers })
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleComplete = async () => {
    const formattedAnswers = questions.map(q => ({
      question_id: q.id,
      option_ids: answers[q.id] || [],
      is_correct: false
    }))

    await updateResponse(formattedAnswers)
    const completed = await completeResponse(formattedAnswers)
    
    if (completed) {
      setShowResults(true)
    }
  }

  if (showResults && response) {
    return (
      <QuizResults
        quiz={quiz}
        response={response}
        questions={questions}
        answers={answers}
        onBack={() => navigate('/quizzes')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-zinc-400">
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </span>
            <span className="text-sm text-zinc-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl mb-6">
          {currentQuestion.question_image_url && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img
                src={currentQuestion.question_image_url}
                alt="Question"
                className="w-full h-64 object-cover"
              />
            </div>
          )}

          <h2 className="text-2xl font-bold mb-6">{currentQuestion.question_text}</h2>

          {/* Options */}
          {currentQuestion.question_type === 'single_choice' || currentQuestion.question_type === 'multiple_choice' ? (
            <QuestionOptions
              question={currentQuestion}
              selectedAnswers={answers[currentQuestion.id] || []}
              onAnswer={handleAnswer}
            />
          ) : (
            <div className="space-y-4">
              <textarea
                value={answers[currentQuestion.id]?.[0] || ''}
                onChange={(e) => setAnswers({ ...answers, [currentQuestion.id]: [e.target.value] })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white placeholder-zinc-500 resize-none"
                rows={5}
                placeholder="Введите ваш ответ..."
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
          >
            {currentQuestionIndex === questions.length - 1 ? 'Завершить' : 'Далее'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function QuestionOptions({
  question,
  selectedAnswers,
  onAnswer
}: {
  question: QuizQuestion
  selectedAnswers: string[]
  onAnswer: (optionId: string) => void
}) {
  const [options, setOptions] = useState<QuizOption[]>([])

  useEffect(() => {
    const loadOptions = async () => {
      const { data } = await supabase
        .from('quiz_options')
        .select('*')
        .eq('question_id', question.id)
        .order('order_index', { ascending: true })
      
      setOptions(data || [])
    }
    
    loadOptions()
  }, [question.id])

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const isSelected = selectedAnswers.includes(option.id)
        return (
          <button
            key={option.id}
            onClick={() => onAnswer(option.id)}
            className={`w-full p-4 rounded-xl border transition-all text-left ${
              isSelected
                ? 'bg-orange-500/20 border-orange-500/50 shadow-lg shadow-orange-500/20'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                isSelected
                  ? 'border-orange-500 bg-orange-500'
                  : 'border-white/30'
              }`}>
                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="flex-1">{option.option_text}</span>
            </div>
            {option.option_image_url && (
              <div className="mt-3 rounded-lg overflow-hidden">
                <img
                  src={option.option_image_url}
                  alt="Option"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function QuizResults({
  quiz,
  response,
  questions,
  answers,
  onBack
}: {
  quiz: any
  response: any
  questions: QuizQuestion[]
  answers: Record<string, string[]>
  onBack: () => void
}) {
  const [questionResults, setQuestionResults] = useState<any[]>([])

  useEffect(() => {
    const loadResults = async () => {
      const results = await Promise.all(
        questions.map(async (q) => {
          const { data: options } = await supabase
            .from('quiz_options')
            .select('*')
            .eq('question_id', q.id)
          
          const userAnswers = answers[q.id] || []
          const answerData = response.answers.find((a: any) => a.question_id === q.id)
          
          return {
            question: q,
            options: options || [],
            userAnswers,
            isCorrect: answerData?.is_correct || false
          }
        })
      )
      
      setQuestionResults(results)
    }
    
    loadResults()
  }, [questions, answers, response])

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Results Header */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl mb-6 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Квиз завершён!</h2>
          <p className="text-zinc-400 mb-6">{quiz.title}</p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-orange-500">{response.score}</div>
              <div className="text-xs text-zinc-400">Баллы</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-500">{response.max_score}</div>
              <div className="text-xs text-zinc-400">Максимум</div>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-500">{response.percentage?.toFixed(0)}%</div>
              <div className="text-xs text-zinc-400">Процент</div>
            </div>
          </div>
        </div>

        {/* Question Results */}
        {quiz.settings?.show_correct_answers && (
          <div className="space-y-4 mb-6">
            {questionResults.map((result, index) => (
              <div
                key={result.question.id}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  {result.isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold mb-2">
                      Вопрос {index + 1}: {result.question.question_text}
                    </p>
                    <div className="space-y-2">
                      {result.options.map((option: QuizOption) => {
                        const isUserAnswer = result.userAnswers.includes(option.id)
                        const isCorrect = option.is_correct
                        
                        return (
                          <div
                            key={option.id}
                            className={`p-3 rounded-lg ${
                              isCorrect
                                ? 'bg-green-500/20 border border-green-500/50'
                                : isUserAnswer
                                ? 'bg-red-500/20 border border-red-500/50'
                                : 'bg-white/5 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrect && <CheckCircle className="w-4 h-4 text-green-500" />}
                              {isUserAnswer && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                              <span>{option.option_text}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30"
        >
          Вернуться к квизам
        </button>
      </div>
    </div>
  )
}
