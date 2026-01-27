import { useState } from 'react'
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
  RefreshCw,
  ChevronLeft,
  Search,
  Clock,
  MessageSquare,
  Image as ImageIcon
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

interface User {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  telegram_id: number
}

interface UserStats {
  user_id: string
  total_tokens: number
  total_cost_thb: number
  messages_count: number
  images_count: number
  last_activity: string
  today_tokens: number
  week_tokens: number
  month_tokens: number
}

// Курс THB к USD (примерный)
const THB_TO_USD = 0.028

export default function AiAnalytics() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users'>('overview')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    refetchInterval: 30000
  })

  // Получаем пользователей для отображения имён
  const { data: users } = useQuery({
    queryKey: ['users_for_analytics'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, first_name, last_name, username, telegram_id')
      return (data || []) as User[]
    }
  })

  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Расчёт статистики
  const calcStats = (data: ChatUsage[]) => {
    const totalTokens = data.reduce((sum, u) => sum + u.input_tokens + u.output_tokens, 0)
    const inputTokens = data.reduce((sum, u) => sum + u.input_tokens, 0)
    const outputTokens = data.reduce((sum, u) => sum + u.output_tokens, 0)
    const totalCostThb = data.reduce((sum, u) => sum + (u.cost_thb || 0), 0)
    const totalCostUsd = totalCostThb * THB_TO_USD
    const imagesCount = data.reduce((sum, u) => sum + (u.images_count || 0), 0)
    const messagesCount = data.length
    const errorCount = data.filter(u => !u.success).length

    return {
      totalTokens,
      inputTokens,
      outputTokens,
      totalCostThb,
      totalCostUsd,
      imagesCount,
      messagesCount,
      errorCount
    }
  }

  // Статистика по периодам
  const todayUsage = usage?.filter(u => new Date(u.created_at) >= startOfDay) || []
  const weekUsage = usage?.filter(u => new Date(u.created_at) >= startOfWeek) || []
  const monthUsage = usage?.filter(u => new Date(u.created_at) >= startOfMonth) || []

  const todayStats = calcStats(todayUsage)
  const weekStats = calcStats(weekUsage)
  const monthStats = calcStats(monthUsage)
  const allTimeStats = calcStats(usage || [])

  // Статистика по пользователям
  const userStatsMap = new Map<string, UserStats>()
  usage?.forEach(u => {
    if (!u.user_id) return
    const existing = userStatsMap.get(u.user_id) || {
      user_id: u.user_id,
      total_tokens: 0,
      total_cost_thb: 0,
      messages_count: 0,
      images_count: 0,
      last_activity: u.created_at,
      today_tokens: 0,
      week_tokens: 0,
      month_tokens: 0
    }

    const tokens = u.input_tokens + u.output_tokens
    existing.total_tokens += tokens
    existing.total_cost_thb += u.cost_thb || 0
    existing.messages_count += 1
    existing.images_count += u.images_count || 0

    const createdAt = new Date(u.created_at)
    if (createdAt >= startOfDay) existing.today_tokens += tokens
    if (createdAt >= startOfWeek) existing.week_tokens += tokens
    if (createdAt >= startOfMonth) existing.month_tokens += tokens

    if (new Date(u.created_at) > new Date(existing.last_activity)) {
      existing.last_activity = u.created_at
    }

    userStatsMap.set(u.user_id, existing)
  })

  const allUserStats = Array.from(userStatsMap.values())
    .sort((a, b) => b.total_tokens - a.total_tokens)

  // Фильтрация пользователей по поиску
  const filteredUserStats = allUserStats.filter(stat => {
    if (!searchQuery) return true
    const user = users?.find(u => u.id === stat.user_id)
    if (!user) return false
    const searchLower = searchQuery.toLowerCase()
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.telegram_id.toString().includes(searchQuery)
    )
  })

  const getUserInfo = (userId: string) => {
    return users?.find(u => u.id === userId)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ru', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Данные выбранного пользователя
  const selectedUserStats = selectedUserId ? userStatsMap.get(selectedUserId) : null
  const selectedUserUsage = selectedUserId
    ? usage?.filter(u => u.user_id === selectedUserId) || []
    : []

  // По дням для выбранного пользователя (последние 7 дней)
  const selectedUserDailyStats = new Map<string, { tokens: number; cost: number; count: number }>()
  if (selectedUserId) {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      selectedUserDailyStats.set(key, { tokens: 0, cost: 0, count: 0 })
    }

    selectedUserUsage.forEach(u => {
      const key = new Date(u.created_at).toISOString().split('T')[0]
      if (selectedUserDailyStats.has(key)) {
        const existing = selectedUserDailyStats.get(key)!
        existing.tokens += u.input_tokens + u.output_tokens
        existing.cost += u.cost_thb || 0
        existing.count += 1
      }
    })
  }

  // По моделям для общего обзора
  const modelStats = new Map<string, { tokens: number; cost: number; count: number }>()
  usage?.forEach(u => {
    const existing = modelStats.get(u.model) || { tokens: 0, cost: 0, count: 0 }
    existing.tokens += u.input_tokens + u.output_tokens
    existing.cost += u.cost_thb || 0
    existing.count += 1
    modelStats.set(u.model, existing)
  })

  // По дням для общего обзора
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  // Детальный просмотр пользователя
  if (selectedUserId && selectedUserStats) {
    const userInfo = getUserInfo(selectedUserId)
    return (
      <div className="space-y-6">
        {/* Заголовок */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedUserId(null)}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {userInfo?.username ? `@${userInfo.username}` : userInfo?.first_name || 'Пользователь'}
            </h1>
            <p className="text-sm text-gray-500">
              Telegram ID: {userInfo?.telegram_id || 'Неизвестно'}
            </p>
          </div>
        </div>

        {/* Карточки статистики пользователя */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-gray-500 text-xs">Всего токенов</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(selectedUserStats.total_tokens)}</div>
            <div className="text-green-600 text-xs font-medium mt-1">
              ${(selectedUserStats.total_cost_thb * THB_TO_USD).toFixed(2)}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Calendar className="w-4 h-4" />
              </div>
              <span className="text-gray-500 text-xs">Сегодня</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{formatNumber(selectedUserStats.today_tokens)}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-gray-500 text-xs">Сообщений</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{selectedUserStats.messages_count}</div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                <ImageIcon className="w-4 h-4" />
              </div>
              <span className="text-gray-500 text-xs">Изображений</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{selectedUserStats.images_count}</div>
          </div>
        </div>

        {/* Периоды */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-1">За неделю</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(selectedUserStats.week_tokens)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-1">За месяц</div>
            <div className="text-lg font-bold text-gray-900">{formatNumber(selectedUserStats.month_tokens)}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-gray-500 text-xs mb-1">Последняя активность</div>
            <div className="text-sm font-medium text-gray-900">{formatDate(selectedUserStats.last_activity)}</div>
          </div>
        </div>

        {/* График по дням */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Токены по дням
          </h3>
          <div className="flex items-end gap-2 h-32">
            {Array.from(selectedUserDailyStats.entries()).map(([date, stats]) => {
              const maxTokens = Math.max(...Array.from(selectedUserDailyStats.values()).map(s => s.tokens), 1)
              const height = maxTokens > 0 ? (stats.tokens / maxTokens) * 100 : 0
              const day = new Date(date).toLocaleDateString('ru', { weekday: 'short' })
              return (
                <div key={date} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{formatNumber(stats.tokens)}</div>
                  <div
                    className="w-full bg-orange-500 rounded-t transition-all"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="text-xs text-gray-400 mt-2">{day}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* История сообщений */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> История запросов (последние 50)
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedUserUsage.slice(0, 50).map(u => (
              <div
                key={u.id}
                className={`p-3 rounded-lg border ${u.success ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs text-gray-500">{formatDate(u.created_at)}</span>
                  <span className="text-xs text-gray-400">{u.model.split('-').slice(-2).join('-')}</span>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-600">
                    Вход: <span className="font-medium text-gray-900">{formatNumber(u.input_tokens)}</span>
                  </span>
                  <span className="text-gray-600">
                    Выход: <span className="font-medium text-gray-900">{formatNumber(u.output_tokens)}</span>
                  </span>
                  <span className="text-green-600 font-medium">
                    ${((u.cost_thb || 0) * THB_TO_USD).toFixed(3)}
                  </span>
                </div>
                {!u.success && u.error_message && (
                  <p className="text-red-600 text-xs mt-1">{u.error_message}</p>
                )}
              </div>
            ))}
            {selectedUserUsage.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">Нет данных</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Cpu className="w-6 h-6 text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">AI Аналитика</h1>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      {/* Табы */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Обзор
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          По пользователям ({allUserStats.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Главные карточки */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Zap}
              label="Сегодня"
              value={formatNumber(todayStats.totalTokens)}
              subvalue={`${todayStats.messagesCount} сообщ.`}
              cost={todayStats.totalCostUsd}
              color="bg-green-100 text-green-600"
            />
            <StatCard
              icon={Calendar}
              label="За неделю"
              value={formatNumber(weekStats.totalTokens)}
              subvalue={`${weekStats.messagesCount} сообщ.`}
              cost={weekStats.totalCostUsd}
              color="bg-blue-100 text-blue-600"
            />
            <StatCard
              icon={TrendingUp}
              label="За месяц"
              value={formatNumber(monthStats.totalTokens)}
              subvalue={`${monthStats.messagesCount} сообщ.`}
              cost={monthStats.totalCostUsd}
              color="bg-purple-100 text-purple-600"
            />
            <StatCard
              icon={BarChart3}
              label="Всего"
              value={formatNumber(allTimeStats.totalTokens)}
              subvalue={`${allTimeStats.messagesCount} сообщ.`}
              cost={allTimeStats.totalCostUsd}
              color="bg-orange-100 text-orange-600"
            />
          </div>

          {/* Детальная статистика */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">Входящие токены</div>
              <div className="text-lg font-bold text-gray-900">{formatNumber(allTimeStats.inputTokens)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">Исходящие токены</div>
              <div className="text-lg font-bold text-gray-900">{formatNumber(allTimeStats.outputTokens)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">Изображений</div>
              <div className="text-lg font-bold text-gray-900">{allTimeStats.imagesCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="text-gray-500 text-xs mb-1">Ошибок</div>
              <div className="text-lg font-bold text-red-500">{allTimeStats.errorCount}</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* График по дням */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Токены по дням
              </h3>
              <div className="flex items-end gap-2 h-32">
                {Array.from(dailyStats.entries()).map(([date, stats]) => {
                  const maxTokens = Math.max(...Array.from(dailyStats.values()).map(s => s.tokens), 1)
                  const height = maxTokens > 0 ? (stats.tokens / maxTokens) * 100 : 0
                  const day = new Date(date).toLocaleDateString('ru', { weekday: 'short' })
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center">
                      <div className="text-xs text-gray-500 mb-1">{formatNumber(stats.tokens)}</div>
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all"
                        style={{ height: `${Math.max(height, 4)}%` }}
                      />
                      <div className="text-xs text-gray-400 mt-2">{day}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* По моделям */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> По моделям
              </h3>
              <div className="space-y-3">
                {Array.from(modelStats.entries())
                  .sort((a, b) => b[1].tokens - a[1].tokens)
                  .map(([model, stats]) => {
                    const totalTokens = allTimeStats.totalTokens || 1
                    const percent = (stats.tokens / totalTokens) * 100
                    return (
                      <div key={model}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 truncate max-w-[200px]">{model}</span>
                          <span className="text-gray-900 font-medium">{formatNumber(stats.tokens)} ({percent.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                {modelStats.size === 0 && (
                  <p className="text-gray-500 text-sm">Нет данных</p>
                )}
              </div>
            </div>
          </div>

          {/* Последние ошибки */}
          {allTimeStats.errorCount > 0 && (
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="text-gray-900 font-medium text-sm mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" /> Последние ошибки
              </h3>
              <div className="space-y-2">
                {usage?.filter(u => !u.success).slice(0, 5).map(u => (
                  <div key={u.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">{formatDate(u.created_at)}</span>
                      <span className="text-gray-400">{u.model}</span>
                    </div>
                    <p className="text-red-600 text-sm">{u.error_message || 'Неизвестная ошибка'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <>
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по username, имени или Telegram ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Таблица пользователей */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-600 font-medium">Пользователь</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Сегодня</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Неделя</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Всего</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Сообщ.</th>
                    <th className="text-right py-3 px-4 text-gray-600 font-medium">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUserStats.map((stat, index) => {
                    const userInfo = getUserInfo(stat.user_id)
                    return (
                      <tr
                        key={stat.user_id}
                        onClick={() => setSelectedUserId(stat.user_id)}
                        className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-400 text-xs w-6">{index + 1}</span>
                            <div>
                              <div className="font-medium text-gray-900">
                                {userInfo?.username ? `@${userInfo.username}` : userInfo?.first_name || 'Без имени'}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {userInfo?.telegram_id || stat.user_id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={stat.today_tokens > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                            {formatNumber(stat.today_tokens)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {formatNumber(stat.week_tokens)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatNumber(stat.total_tokens)}
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">
                          {stat.messages_count}
                        </td>
                        <td className="py-3 px-4 text-right text-green-600 font-medium">
                          ${(stat.total_cost_thb * THB_TO_USD).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUserStats.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        {searchQuery ? 'Пользователи не найдены' : 'Нет данных'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Суммарная статистика */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-gray-500">Всего пользователей: </span>
                <span className="font-medium text-gray-900">{allUserStats.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Активных сегодня: </span>
                <span className="font-medium text-gray-900">
                  {allUserStats.filter(u => u.today_tokens > 0).length}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Общие расходы: </span>
                <span className="font-medium text-green-600">
                  ${(allTimeStats.totalCostThb * THB_TO_USD).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </>
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
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="flex justify-between items-center mt-1">
        {subvalue && <span className="text-gray-400 text-xs">{subvalue}</span>}
        {cost !== undefined && (
          <span className="text-green-600 text-xs font-medium">
            ${cost.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  )
}
