import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Users, TrendingUp, BarChart3 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useQuiz } from '../../../hooks/admin/useQuizzes'

export default function QuizAnalytics() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { quiz, isLoading } = useQuiz(id || null)
  const [analytics, setAnalytics] = useState({
    totalViews: 0,
    totalStarts: 0,
    totalCompletions: 0,
    completionRate: 0,
    averageScore: 0, // для рейтинга: средняя оценка (1-10)
    averagePercentage: 0 // для рейтинга: средняя оценка в %
  })
  const [responses, setResponses] = useState<any[]>([])
  const [rowAverages, setRowAverages] = useState<Array<{ rowIndex: number; name: string; avg: number; count: number }>>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true)

  useEffect(() => {
    if (id) {
      loadAnalytics()
      loadResponses()
    }
  }, [id, timeRange])

  const getSinceIso = (): string | null => {
    if (timeRange === '7d') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    if (timeRange === '30d') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    return null
  }

  const parseRowIndex = (answer: any): number | null => {
    if (typeof answer?.row_index === 'number') return answer.row_index
    const qid = String(answer?.question_id || '')
    if (qid.startsWith('row-')) {
      const n = Number(qid.replace('row-', ''))
      return Number.isFinite(n) ? n : null
    }
    return null
  }

  const loadAnalytics = async () => {
    if (!id) return

    setIsLoadingAnalytics(true)
    const sinceIso = getSinceIso()

    const { data: quizData } = await supabase
      .from('quizzes')
      .select('total_views, total_completions')
      .eq('id', id)
      .single()

    // Starts: все попытки
    let startsQuery = supabase
      .from('quiz_responses')
      .select('id', { count: 'exact', head: true })
      .eq('quiz_id', id)

    if (sinceIso) {
      startsQuery = startsQuery.gte('created_at', sinceIso)
    }

    const { count: startsCount } = await startsQuery

    // Completions: завершённые (и заодно заберём answers для статистики рейтинга)
    let completedQuery = supabase
      .from('quiz_responses')
      .select('answers, completed_at, session_id, created_at')
      .eq('quiz_id', id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(500)

    if (sinceIso) {
      completedQuery = completedQuery.gte('created_at', sinceIso)
    }

    const { data: completedResponses } = await completedQuery

    const starts = startsCount || 0
    const completions = completedResponses?.length || 0
    const completionRate = starts > 0 ? (completions / starts) * 100 : 0

    // Подтягиваем названия рядов (если есть)
    const { data: rowsData } = await supabase
      .from('quiz_image_rows')
      .select('row_index, name')
      .eq('quiz_id', id)
      .order('row_index', { ascending: true })

    const rowNameByIndex = new Map<number, string>()
    ;(rowsData || []).forEach((r: any) => {
      rowNameByIndex.set(r.row_index, r.name || `Ряд ${r.row_index + 1}`)
    })

    // Средняя оценка (1-10) по всем ответам (по всем рядам)
    let ratingsSum = 0
    let ratingsCount = 0
    const perRow = new Map<number, { sum: number; count: number }>()

    ;(completedResponses || []).forEach((resp: any) => {
      const answers = Array.isArray(resp?.answers) ? resp.answers : []
      answers.forEach((a: any) => {
        if (typeof a?.rating_value !== 'number') return
        const rowIndex = parseRowIndex(a)
        if (rowIndex === null) return
        ratingsSum += a.rating_value
        ratingsCount += 1
        const existing = perRow.get(rowIndex) || { sum: 0, count: 0 }
        perRow.set(rowIndex, { sum: existing.sum + a.rating_value, count: existing.count + 1 })
      })
    })

    const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0
    const avgPercentage = avgRating > 0 ? (avgRating / 10) * 100 : 0

    const rowAvgList = Array.from(perRow.entries())
      .map(([rowIndex, v]) => ({
        rowIndex,
        name: rowNameByIndex.get(rowIndex) || `Ряд ${rowIndex + 1}`,
        avg: v.count > 0 ? v.sum / v.count : 0,
        count: v.count
      }))
      .sort((a, b) => a.rowIndex - b.rowIndex)

    setAnalytics({
      totalViews: quizData?.total_views || 0,
      totalStarts: starts,
      totalCompletions: completions,
      completionRate,
      averageScore: avgRating,
      averagePercentage: avgPercentage
    })

    setRowAverages(rowAvgList)
    setIsLoadingAnalytics(false)
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

  if (isLoading || isLoadingAnalytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка аналитики...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-xl mb-4">Квиз не найден</p>
          <button
            onClick={() => navigate('/admin/quizzes')}
            className="px-6 py-2 bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors"
          >
            Вернуться
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/quizzes')}
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
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.totalCompletions}</div>
            <div className="text-sm text-zinc-400 mt-1">
              {analytics.completionRate.toFixed(1)}% завершения
            </div>
          </div>
          
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-400 text-sm">Средняя оценка</span>
              <BarChart3 className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold">{analytics.averageScore.toFixed(1)} / 10</div>
            <div className="text-sm text-zinc-400 mt-1">{analytics.averagePercentage.toFixed(0)}%</div>
          </div>
        </div>

        {/* Средние оценки по рядам */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl mb-8">
          <h2 className="text-xl font-semibold mb-4">Средние оценки по каруселям</h2>
          {rowAverages.length === 0 ? (
            <div className="text-zinc-400">Пока нет данных по оценкам</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rowAverages.map((r) => (
                <div key={r.rowIndex} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="font-semibold">{r.name}</div>
                  <div className="text-zinc-400 text-sm mt-1">
                    Средняя: <span className="text-white font-semibold">{r.avg.toFixed(1)} / 10</span>
                  </div>
                  <div className="text-zinc-500 text-xs mt-1">Оценок: {r.count}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-xl font-semibold mb-4">Последние ответы</h2>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              Нет завершённых ответов
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-zinc-400">
                        {new Date(response.completed_at).toLocaleString('ru-RU')}
                      </div>
                      <div className="mt-1">
                        Средняя оценка: {(() => {
                          const answers = Array.isArray(response?.answers) ? response.answers : []
                          let sum = 0
                          let cnt = 0
                          answers.forEach((a: any) => {
                            if (typeof a?.rating_value !== 'number') return
                            if (parseRowIndex(a) === null) return
                            sum += a.rating_value
                            cnt += 1
                          })
                          const avg = cnt > 0 ? sum / cnt : 0
                          return `${avg.toFixed(1)} / 10`
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
