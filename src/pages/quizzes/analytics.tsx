import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, Users, TrendingUp, BarChart3, Calendar, CheckCircle } from 'lucide-react'
import { useQuiz, useQuizAnalytics } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

export default function QuizAnalytics() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { quiz, isLoading } = useQuiz(id || null)
  const { analytics, isLoading: analyticsLoading } = useQuizAnalytics(id || null)
  const [responses, setResponses] = useState<any[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    if (id) {
      loadResponses()
    }
  }, [id, timeRange])

  const loadResponses = async () => {
    if (!id) return

    let dateFilter = ''
    if (timeRange === '7d') {
      dateFilter = 'created_at.gte=' + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (timeRange === '30d') {
      dateFilter = 'created_at.gte=' + new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    const { data } = await supabase
      .from('quiz_responses')
      .select('*')
      .eq('quiz_id', id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(100)

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

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Средние результаты
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
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
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
                  <div className="text-right">
                    <div className="text-sm text-zinc-400">ID сессии</div>
                    <div className="text-xs text-zinc-500 font-mono">
                      {response.session_id?.substring(0, 8)}...
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
