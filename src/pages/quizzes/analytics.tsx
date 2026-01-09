import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Users, TrendingUp, BarChart3, Calendar, CheckCircle, X, FileText } from 'lucide-react'
import { useQuiz, useQuizAnalytics } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

export default function QuizAnalytics() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { quiz, isLoading } = useQuiz(id || null)
  const { analytics, isLoading: analyticsLoading } = useQuizAnalytics(id || null)
  const [responses, setResponses] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [selectedResponse, setSelectedResponse] = useState<any | null>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [options, setOptions] = useState<any[]>([])
  const [imageRows, setImageRows] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      loadResponses()
      loadQuestionsAndOptions()
      loadImageRows()
    }
  }, [id, timeRange])

  const loadQuestionsAndOptions = async () => {
    if (!id) return

    // Загружаем вопросы
    const { data: questionsData } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', id)
      .order('order_index', { ascending: true })

    setQuestions(questionsData || [])

    // Загружаем опции
    if (questionsData && questionsData.length > 0) {
      const questionIds = questionsData.map(q => q.id)
      const { data: optionsData } = await supabase
        .from('quiz_options')
        .select('*')
        .in('question_id', questionIds)
        .order('order_index', { ascending: true })

      setOptions(optionsData || [])
    }
  }

  const loadImageRows = async () => {
    if (!id) return

    const { data: rowsData } = await supabase
      .from('quiz_image_rows')
      .select('*')
      .eq('quiz_id', id)
      .order('row_index', { ascending: true })

    setImageRows(rowsData || [])
  }

  const loadResponses = async () => {
    if (!id) return

    let query = supabase
      .from('quiz_responses')
      .select('*')
      .eq('quiz_id', id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100)

    if (timeRange === '7d') {
      query = query.gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    } else if (timeRange === '30d') {
      query = query.gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    }

    const { data } = await query

    setResponses(data || [])
  }

  if (isLoading || analyticsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка аналитики...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/quizzes')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад к квизам
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent mb-2">
                Аналитика квиза
              </h1>
              <p className="text-zinc-400">{quiz.title}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  timeRange === '7d'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                7 дней
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  timeRange === '30d'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                30 дней
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2 rounded-xl transition-all ${
                  timeRange === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                Всё время
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Просмотры</span>
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.totalViews}</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Начали</span>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.totalStarts}</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Завершили</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.totalCompletions}</div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Конверсия</span>
              <TrendingUp className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.completionRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Рейтинг по стилям - ГЛАВНАЯ СТАТИСТИКА */}
        {imageRows.length > 0 && responses.length > 0 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl mb-8">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-orange-500" />
              🏆 Рейтинг стилей
            </h3>
            
            {(() => {
              // Вычисляем средние оценки по каждому стилю
              const styleRatings: { rowIndex: number; name: string; totalRating: number; count: number; avgRating: number }[] = []
              
              imageRows.forEach((row) => {
                let totalRating = 0
                let count = 0
                
                responses.forEach((response) => {
                  if (response.answers && Array.isArray(response.answers)) {
                    response.answers.forEach((answer: any) => {
                      const isRowRating = String(answer.question_id || '').startsWith('row-')
                      if (isRowRating) {
                        const answerRowIndex = parseInt(String(answer.question_id).replace('row-', ''))
                        if (answerRowIndex === row.row_index && typeof answer.rating_value === 'number') {
                          totalRating += answer.rating_value
                          count++
                        }
                      }
                    })
                  }
                })
                
                styleRatings.push({
                  rowIndex: row.row_index,
                  name: row.name || `Стиль ${row.row_index + 1}`,
                  totalRating,
                  count,
                  avgRating: count > 0 ? totalRating / count : 0
                })
              })
              
              // Сортируем по среднему рейтингу (лучшие сверху)
              const sortedRatings = [...styleRatings].sort((a, b) => b.avgRating - a.avgRating)
              
              return (
                <div className="space-y-4">
                  {sortedRatings.map((style, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
                    const barColor = index === 0 ? 'from-yellow-500 to-yellow-600' : 
                                     index === 1 ? 'from-gray-400 to-gray-500' : 
                                     index === 2 ? 'from-amber-600 to-amber-700' : 
                                     'from-blue-500 to-blue-600'
                    
                    return (
                      <div key={style.rowIndex} className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{medal}</span>
                            <span className="font-semibold text-lg">{style.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-orange-400">
                              {style.avgRating.toFixed(1)}
                            </div>
                            <div className="text-xs text-zinc-500">
                              из 10 ({style.count} оценок)
                            </div>
                          </div>
                        </div>
                        <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                            style={{ width: `${(style.avgRating / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Общая статистика
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Средний балл</span>
                  <span className="text-xl font-bold">{analytics.averageScore.toFixed(1)}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 transition-all"
                    style={{ width: `${(analytics.averageScore / (quiz.settings?.passing_score || 100)) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400">Средний процент</span>
                  <span className="text-xl font-bold">{analytics.averagePercentage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                    style={{ width: `${analytics.averagePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Активность
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Всего ответов</span>
                <span className="text-xl font-bold">{responses.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Успешных</span>
                <span className="text-xl font-bold text-green-500">
                  {responses.filter(r => (r.percentage || 0) >= (quiz.settings?.passing_score || 0)).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Неудачных</span>
                <span className="text-xl font-bold text-red-500">
                  {responses.filter(r => (r.percentage || 0) < (quiz.settings?.passing_score || 0)).length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Responses */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-semibold mb-4">Последние ответы</h3>
          {responses.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">Нет ответов за выбранный период</div>
          ) : (
            <div className="space-y-3">
              {responses.slice(0, 10).map((response) => (
                <div
                  key={response.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setSelectedResponse(response)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${
                      (response.percentage || 0) >= (quiz.settings?.passing_score || 0)
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {response.percentage?.toFixed(0)}%
                    </div>
                    <div>
                      <div className="font-semibold">
                        {response.score} / {response.max_score} баллов
                      </div>
                      <div className="text-sm text-zinc-400">
                        {new Date(response.completed_at).toLocaleString('ru-RU')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-zinc-400">ID сессии</div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {response.session_id?.substring(0, 8)}...
                      </div>
                    </div>
                    <FileText className="w-5 h-5 text-zinc-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно с детальными ответами */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-zinc-900 via-black to-zinc-900 border border-white/10 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Детальные ответы</h2>
              <button
                onClick={() => setSelectedResponse(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Информация о сессии */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-zinc-400">Дата завершения:</span>
                    <div className="font-semibold">
                      {new Date(selectedResponse.completed_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">Результат:</span>
                    <div className="font-semibold">
                      {selectedResponse.score} / {selectedResponse.max_score} ({selectedResponse.percentage?.toFixed(1)}%)
                    </div>
                  </div>
                  <div>
                    <span className="text-zinc-400">ID сессии:</span>
                    <div className="font-mono text-xs">{selectedResponse.session_id}</div>
                  </div>
                  {selectedResponse.user_id && (
                    <div>
                      <span className="text-zinc-400">ID пользователя:</span>
                      <div className="font-mono text-xs">{selectedResponse.user_id}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ответы */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Ответы:</h3>
                {!selectedResponse.answers || selectedResponse.answers.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400">Нет ответов</div>
                ) : (
                  selectedResponse.answers.map((answer: any, index: number) => {
                    // Проверяем, это рейтинг по ряду или обычный вопрос
                    const isRowRating = String(answer.question_id || '').startsWith('row-')
                    const rowIndex = isRowRating ? parseInt(String(answer.question_id).replace('row-', '')) : null
                    const row = rowIndex !== null ? imageRows.find(r => r.row_index === rowIndex) : null

                    if (isRowRating && row && rowIndex !== null) {
                      // Рейтинг по ряду
                      return (
                        <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-lg">{row.name || `Ряд ${rowIndex + 1}`}</div>
                            <div className="text-2xl font-bold text-orange-400">
                              {answer.rating_value} / 10
                            </div>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden mt-2">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-orange-600"
                              style={{ width: `${(answer.rating_value / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    } else {
                      // Обычный вопрос
                      const question = questions.find(q => q.id === answer.question_id)
                      if (!question) return null

                      const questionOptions = options.filter(o => o.question_id === question.id)
                      const selectedOptionIds = answer.option_ids || []
                      const selectedOptions = questionOptions.filter(o => selectedOptionIds.includes(o.id))

                      return (
                        <div key={index} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold">{question.question_text}</div>
                            {answer.is_correct !== undefined && (
                              <div className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                answer.is_correct
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {answer.is_correct ? '✓ Правильно' : '✗ Неправильно'}
                              </div>
                            )}
                          </div>

                          {question.question_type === 'text' && answer.text_answer && (
                            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
                              <div className="text-sm text-zinc-400 mb-1">Текстовый ответ:</div>
                              <div className="text-white">{answer.text_answer}</div>
                            </div>
                          )}

                          {question.question_type === 'rating' && answer.rating_value !== undefined && (
                            <div className="mt-2">
                              <div className="text-sm text-zinc-400 mb-1">Рейтинг:</div>
                              <div className="text-2xl font-bold text-orange-400">
                                {answer.rating_value} / 5
                              </div>
                            </div>
                          )}

                          {(question.question_type === 'single_choice' || question.question_type === 'multiple_choice') && (
                            <div className="mt-2 space-y-2">
                              <div className="text-sm text-zinc-400 mb-2">Выбранные варианты:</div>
                              {selectedOptions.length === 0 ? (
                                <div className="text-zinc-500 text-sm">Варианты не выбраны</div>
                              ) : (
                                selectedOptions.map((option: any) => (
                                  <div
                                    key={option.id}
                                    className={`p-2 rounded-lg border ${
                                      option.is_correct
                                        ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                        : 'bg-white/5 border-white/10 text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {option.is_correct && <span className="text-green-400">✓</span>}
                                      <span>{option.option_text}</span>
                                    </div>
                                  </div>
                                ))
                              )}
                              {questionOptions.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/10">
                                  <div className="text-xs text-zinc-500 mb-2">Все варианты:</div>
                                  <div className="space-y-1">
                                    {questionOptions.map((option: any) => {
                                      const isSelected = selectedOptionIds.includes(option.id)
                                      return (
                                        <div
                                          key={option.id}
                                          className={`text-xs p-2 rounded ${
                                            isSelected
                                              ? option.is_correct
                                                ? 'bg-green-500/20 text-green-300'
                                                : 'bg-orange-500/20 text-orange-300'
                                              : option.is_correct
                                                ? 'bg-blue-500/10 text-blue-300'
                                                : 'bg-white/5 text-zinc-400'
                                          }`}
                                        >
                                          {isSelected && '→ '}
                                          {option.option_text}
                                          {option.is_correct && ' (правильный)'}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    }
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
