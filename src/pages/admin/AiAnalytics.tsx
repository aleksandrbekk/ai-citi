import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  Cpu,
  TrendingUp,
  Users,
  Zap,
  Calendar,
  BarChart3,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface ChatUsage {
  id: string
  user_id: string | null
  created_at: string
  input_tokens: number
  output_tokens: number
  images_count: number
  model: string
  cost_thb: number
  success: boolean
  error_message: string | null
}

interface UserStats {
  user_id: string
  total_tokens: number
  total_cost_thb: number
  messages_count: number
}

// Курс THB к USD (примерный)
const THB_TO_USD = 0.028

export default function AiAnalytics() {
  // Получаем все записи использования
  const { data: usage, isLoading, refetch } = useQuery({
    queryKey: ['chat_usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_usage')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching chat_usage:', error)
        return []
      }
      return data as ChatUsage[]
    },
    refetchInterval: 30000 // Обновлять каждые 30 секунд
  })

  // Получаем пользователей для отображения имён
  const { data: users } = useQuery({
    queryKey: ['users_for_analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, telegram_id')
      return data || []
    }
  })

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Фильтры по периодам
  const todayUsage = usage?.filter(u => new Date(u.created_at) >= startOfDay) || []
  const weekUsage = usage?.filter(u => new Date(u.created_at) >= startOfWeek) || []
  const monthUsage = usage?.filter(u => new Date(u.created_at) >= startOfMonth) || []

  // Расчёт статистики
  const calcStats = (data: ChatUsage[]) => {
    const totalTokens = data.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0)
    const inputTokens = data.reduce((sum, u) => sum + u.input_tokens, 0)
    const outputTokens = data.reduce((sum, u) => sum + u.output_tokens, 0)
    const totalCostThb = data.reduce((sum, u) => sum + (u.cost_thb || 0), 0)
    const totalCostUsd = totalCostThb * THB_TO_USD
    const imagesCount = data.reduce((sum, u) => sum + (u.images_count || 0), 0)
    const messagesCount = data.length
    const successCount = data.filter(u => u.success).length
    const errorCount = data.filter(u => !u.success).length

    return {
      totalTokens,
      inputTokens,
      outputTokens,
      totalCostThb,
      totalCostUsd,
      imagesCount,
      messagesCount,
      successCount,
      errorCount
    }
  }

  const todayStats = calcStats(todayUsage)
  const weekStats = calcStats(weekUsage)
  const monthStats = calcStats(monthUsage)
  const allTimeStats = calcStats(usage || [])

  // Топ пользователей
  const userStatsMap = new Map<string, UserStats>()
  usage?.forEach(u => {
    if (!u.user_id) return
    const existing = userStatsMap.get(u.user_id) || {
      user_id: u.user_id,
      total_tokens: 0,
      total_cost_thb: 0,
      messages_count: 0
    }
    existing.total_tokens += u.input_tokens + u.output_tokens
    existing.total_cost_thb += u.cost_thb || 0
    existing.messages_count += 1
    userStatsMap.set(u.user_id, existing)
  })

  const topUsers = Array.from(userStatsMap.values())
    .sort((a, b) => b.total_tokens - a.total_tokens)
    .slice(0, 10)

  // По моделям
  const modelStats = new Map<string, { tokens: number; cost: number; count: number }>()
  usage?.forEach(u => {
    const existing = modelStats.get(u.model) || { tokens: 0, cost: 0, count: 0 }
    existing.tokens += u.input_tokens + u.output_tokens
    existing.cost += u.cost_thb || 0
    existing.count += 1
    modelStats.set(u.model, existing)
  })

  // По дням (последние 7 дней)
  const dailyStats = new Map<string, { tokens: number; cost: number; count: number }>()
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const key = date.toISOString().split('T')[0]
    dailyStats.set(key, { tokens: 0, cost: 0, count: 0 })
  }

  usage?.forEach(u => {
    const key = new Date(u.created_at).toISOString().split('T')[0]
    if (dailyStats.has(key)) {
      const existing = dailyStats.get(key)!
      existing.tokens += u.input_tokens + u.output_tokens
      existing.cost += u.cost_thb || 0
      existing.count += 1
    }
  })

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId)
    if (!user) return userId.slice(0, 8) + '...'
    return user.username ? `@${user.username}` : user.first_name || `ID: ${user.telegram_id}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-purple-500" />
          <h1 className="text-xl font-bold text-white">AI Аналитика</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Главные карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Zap}
          label="Сегодня"
          value={formatNumber(todayStats.totalTokens)}
          subvalue={`${todayStats.messagesCount} сообщ.`}
          cost={todayStats.totalCostUsd}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          icon={Calendar}
          label="За неделю"
          value={formatNumber(weekStats.totalTokens)}
          subvalue={`${weekStats.messagesCount} сообщ.`}
          cost={weekStats.totalCostUsd}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="За месяц"
          value={formatNumber(monthStats.totalTokens)}
          subvalue={`${monthStats.messagesCount} сообщ.`}
          cost={monthStats.totalCostUsd}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={BarChart3}
          label="Всего"
          value={formatNumber(allTimeStats.totalTokens)}
          subvalue={`${allTimeStats.messagesCount} сообщ.`}
          cost={allTimeStats.totalCostUsd}
          color="bg-yellow-500/20 text-yellow-400"
        />
      </div>

      {/* Детальная статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-800 rounded-xl p-4">
          <div className="text-zinc-400 text-xs mb-1">Входящие токены</div>
          <div className="text-lg font-bold text-white">{formatNumber(allTimeStats.inputTokens)}</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4">
          <div className="text-zinc-400 text-xs mb-1">Исходящие токены</div>
          <div className="text-lg font-bold text-white">{formatNumber(allTimeStats.outputTokens)}</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4">
          <div className="text-zinc-400 text-xs mb-1">Изображений</div>
          <div className="text-lg font-bold text-white">{allTimeStats.imagesCount}</div>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4">
          <div className="text-zinc-400 text-xs mb-1">Ошибок</div>
          <div className="text-lg font-bold text-red-400">{allTimeStats.errorCount}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* График по дням */}
        <div className="bg-zinc-900 rounded-xl p-4">
          <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Токены по дням
          </h3>
          <div className="flex items-end gap-2 h-32">
            {Array.from(dailyStats.entries()).map(([date, stats]) => {
              const maxTokens = Math.max(...Array.from(dailyStats.values()).map(s => s.tokens))
              const height = maxTokens > 0 ? (stats.tokens / maxTokens) * 100 : 0
              const day = new Date(date).toLocaleDateString('ru', { weekday: 'short' })
              return (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-zinc-400 mb-1">{formatNumber(stats.tokens)}</div>
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="text-xs text-zinc-500 mt-2">{day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* По моделям */}
        <div className="bg-zinc-900 rounded-xl p-4">
          <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4" /> По моделям
          </h3>
          <div className="space-y-3">
            {Array.from(modelStats.entries())
              .sort((a, b) => b[1].tokens - a[1].tokens)
              .map(([model, stats]) => {
                const totalTokens = allTimeStats.totalTokens
                const percent = totalTokens > 0 ? (stats.tokens / totalTokens) * 100 : 0
                return (
                  <div key={model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400 truncate max-w-[200px]">{model}</span>
                      <span className="text-white">{formatNumber(stats.tokens)} ({percent.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            {modelStats.size === 0 && (
              <p className="text-zinc-500 text-sm">Нет данных</p>
            )}
          </div>
        </div>
      </div>

      {/* Топ пользователей */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> Топ пользователей по токенам
        </h3>
        {topUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-400 border-b border-zinc-800">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Пользователь</th>
                  <th className="text-right py-2 px-2">Токены</th>
                  <th className="text-right py-2 px-2">Сообщений</th>
                  <th className="text-right py-2 px-2">Стоимость</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((user, index) => (
                  <tr key={user.user_id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                    <td className="py-2 px-2 text-zinc-500">{index + 1}</td>
                    <td className="py-2 px-2 text-white">{getUserName(user.user_id)}</td>
                    <td className="py-2 px-2 text-right text-blue-400">{formatNumber(user.total_tokens)}</td>
                    <td className="py-2 px-2 text-right text-zinc-400">{user.messages_count}</td>
                    <td className="py-2 px-2 text-right text-green-400">
                      ${(user.total_cost_thb * THB_TO_USD).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-zinc-500 text-sm">Нет данных</p>
        )}
      </div>

      {/* Последние ошибки */}
      {allTimeStats.errorCount > 0 && (
        <div className="bg-zinc-900 rounded-xl p-4">
          <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" /> Последние ошибки
          </h3>
          <div className="space-y-2">
            {usage?.filter(u => !u.success).slice(0, 5).map(u => (
              <div key={u.id} className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-400">
                    {new Date(u.created_at).toLocaleString('ru')}
                  </span>
                  <span className="text-zinc-500">{u.model}</span>
                </div>
                <p className="text-red-400 text-sm">{u.error_message || 'Неизвестная ошибка'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  subvalue,
  cost,
  color
}: {
  icon: any
  label: string
  value: string
  subvalue?: string
  cost?: number
  color: string
}) {
  return (
    <div className="bg-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-zinc-400 text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="flex justify-between items-center mt-1">
        {subvalue && <span className="text-zinc-500 text-xs">{subvalue}</span>}
        {cost !== undefined && (
          <span className="text-green-400 text-xs font-medium">
            ${cost.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
