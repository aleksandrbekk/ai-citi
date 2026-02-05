import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Users, TrendingUp, DollarSign, Calendar, BarChart3, ChevronLeft, ChevronRight, ChevronDown, ShoppingCart, XCircle } from 'lucide-react'

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function getMonthName(monthNum: number): string {
  return MONTH_NAMES[monthNum] || ''
}

interface Subscription {
  id: string
  telegram_id: number
  plan: string
  status: string
  amount_rub: number
  neurons_per_month: number
  started_at: string
  expires_at: string
  cancelled_at: string | null
  username?: string
}

export default function SubscriptionsTab() {
  const [showRecent, setShowRecent] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [showByUser, setShowByUser] = useState(false)

  // Подписки из user_subscriptions
  const { data: subscriptions } = useQuery<Subscription[]>({
    queryKey: ['all_subscriptions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('id, telegram_id, plan, status, amount_rub, neurons_per_month, started_at, expires_at, cancelled_at')
        .order('created_at', { ascending: false })
      if (!data) return []
      // Подтянуть username
      const telegramIds = [...new Set(data.map((s: any) => s.telegram_id))]
      const { data: users } = await supabase
        .from('users')
        .select('telegram_id, username')
        .in('telegram_id', telegramIds)
      const userMap = new Map((users || []).map((u: any) => [u.telegram_id, u.username]))
      return data.map((s: any) => ({ ...s, username: userMap.get(s.telegram_id) || null }))
    }
  })

  const recentSubs = subscriptions?.filter((s) => s.status === 'active') || []
  const cancelledSubs = subscriptions?.filter((s) => s.status === 'cancelled') || []

  // По пользователям: группировка
  const byUserMap = subscriptions?.reduce((acc, s) => {
    const key = s.username ? `@${s.username}` : `ID ${s.telegram_id}`
    if (!acc[key]) acc[key] = { active: 0, cancelled: 0, totalPaid: 0 }
    if (s.status === 'active') acc[key].active++
    if (s.status === 'cancelled') acc[key].cancelled++
    acc[key].totalPaid += s.amount_rub || 0
    return acc
  }, {} as Record<string, { active: number; cancelled: number; totalPaid: number }>) || {}

  const uniqueUsers = Object.keys(byUserMap)

  const { data: clients } = useQuery({
    queryKey: ['premium_clients'],
    queryFn: async () => {
      const { data } = await supabase
        .from('premium_clients')
        .select('*')
        .order('created_at', { ascending: true })
      return data || []
    }
  })

  const now = new Date()

  const clientStats = {
    total: clients?.length || 0,
    active: clients?.filter((c: any) => new Date(c.expires_at) > now).length || 0,
    expiring: clients?.filter((c: any) => {
      const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days > 0 && days <= 7
    }).length || 0,
    expired: clients?.filter((c: any) => new Date(c.expires_at) <= now).length || 0,
    totalLTV: clients?.reduce((sum: number, c: any) => sum + (c.total_paid_usd || 0), 0) || 0,
    avgLTV: clients?.length ? Math.round((clients.reduce((sum: number, c: any) => sum + (c.total_paid_usd || 0), 0)) / clients.length) : 0
  }

  const byPlan = {
    free: clients?.filter((c: any) => c.plan?.toUpperCase() === 'FREE' || c.plan?.toUpperCase() === 'BASIC' || c.plan?.toUpperCase() === 'STARTER').length || 0,
    pro: clients?.filter((c: any) => c.plan?.toUpperCase() === 'PRO').length || 0,
    business: clients?.filter((c: any) => c.plan?.toUpperCase() === 'BUSINESS' || c.plan?.toUpperCase() === 'ELITE').length || 0
  }

  const bySources = clients?.reduce((acc: Record<string, number>, c: any) => {
    const source = c.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const clientsByMonth = clients?.reduce((acc: Record<string, number>, c: any) => {
    const date = new Date(c.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  const StatCard = ({ icon: Icon, label, value, subvalue, color }: any) => (
    <div className="bg-gray-100 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded-lg ${color}`}>
          <Icon size={16} />
        </div>
        <span className="text-gray-500 text-xs">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      {subvalue && <div className="text-gray-500 text-xs mt-0.5">{subvalue}</div>}
    </div>
  )

  const ProgressBar = ({ label, value, total, color }: any) => {
    const percent = total > 0 ? Math.round((value / total) * 100) : 0
    return (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-500">{label}</span>
          <span className="text-gray-900">{value} ({percent}%)</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Всего клиентов" value={clientStats.total} color="bg-blue-100 text-blue-600" />
        <StatCard icon={TrendingUp} label="Активных" value={clientStats.active} subvalue={`${clientStats.expiring} истекает скоро`} color="bg-green-100 text-green-600" />
        <StatCard icon={DollarSign} label="Общий LTV" value={`$${clientStats.totalLTV}`} subvalue={`Средний: $${clientStats.avgLTV}`} color="bg-yellow-100 text-yellow-600" />
        <StatCard icon={Calendar} label="Просрочено" value={clientStats.expired} color="bg-red-100 text-red-600" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
          <BarChart3 size={16} /> По тарифам
        </h3>
        <ProgressBar label="FREE" value={byPlan.free} total={clientStats.total} color="bg-gray-400" />
        <ProgressBar label="PRO (2900₽)" value={byPlan.pro} total={clientStats.total} color="bg-orange-500" />
        <ProgressBar label="BUSINESS (9900₽)" value={byPlan.business} total={clientStats.total} color="bg-amber-500" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} /> Источники
        </h3>
        {Object.entries(bySources).length > 0 ? (
          Object.entries(bySources)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([source, count]) => (
              <ProgressBar key={source} label={source} value={count as number} total={clientStats.total} color="bg-cyan-500" />
            ))
        ) : (
          <p className="text-gray-500">Нет данных</p>
        )}
      </div>

      <MonthSelector data={clientsByMonth} />

      {/* Последние подписки */}
      <button
        onClick={() => setShowRecent(!showRecent)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-green-500" />
          <span className="text-gray-900 font-medium">Активные подписки</span>
          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">
            {recentSubs.length}
          </span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showRecent ? 'rotate-180' : ''}`} />
      </button>

      {showRecent && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="space-y-2">
            {recentSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-gray-900 text-sm font-medium">
                    {s.plan.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {s.username ? `@${s.username}` : `ID ${s.telegram_id}`}
                  </span>
                  <span className="text-gray-400 text-xs ml-2">
                    до {new Date(s.expires_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <span className="text-green-600 font-medium text-sm">{s.amount_rub}₽/мес</span>
              </div>
            ))}
            {recentSubs.length === 0 && (
              <p className="text-gray-500 text-center py-4">Нет активных подписок</p>
            )}
          </div>
        </div>
      )}

      {/* Отменённые подписки */}
      <button
        onClick={() => setShowCancelled(!showCancelled)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <XCircle size={18} className="text-red-500" />
          <span className="text-gray-900 font-medium">Отменённые</span>
          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
            {cancelledSubs.length}
          </span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showCancelled ? 'rotate-180' : ''}`} />
      </button>

      {showCancelled && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="space-y-2">
            {cancelledSubs.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-gray-900 text-sm font-medium">
                    {s.plan.toUpperCase()}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {s.username ? `@${s.username}` : `ID ${s.telegram_id}`}
                  </span>
                  {s.cancelled_at && (
                    <span className="text-red-400 text-xs ml-2">
                      отменена {new Date(s.cancelled_at).toLocaleDateString('ru-RU')}
                    </span>
                  )}
                </div>
                <span className="text-red-500 font-medium text-sm">{s.amount_rub}₽</span>
              </div>
            ))}
            {cancelledSubs.length === 0 && (
              <p className="text-gray-500 text-center py-4">Отмен пока не было</p>
            )}
          </div>
        </div>
      )}

      {/* По пользователям */}
      <button
        onClick={() => setShowByUser(!showByUser)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Users size={18} className="text-indigo-500" />
          <span className="text-gray-900 font-medium">По пользователям</span>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
            {uniqueUsers.length}
          </span>
        </div>
        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showByUser ? 'rotate-180' : ''}`} />
      </button>

      {showByUser && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2">Пользователь</th>
                  <th className="py-2 pr-2 text-center">Активных</th>
                  <th className="py-2 pr-2 text-center">Отменено</th>
                  <th className="py-2 pr-2 text-right">Оплачено</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(byUserMap)
                  .sort((a, b) => b[1].totalPaid - a[1].totalPaid)
                  .map(([user, data]) => (
                  <tr key={user} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-gray-900">{user}</td>
                    <td className="py-2 pr-2 text-center">
                      {data.active > 0 ? <span className="text-green-600 font-medium">{data.active}</span> : '0'}
                    </td>
                    <td className="py-2 pr-2 text-center">
                      {data.cancelled > 0 ? <span className="text-red-600 font-medium">{data.cancelled}</span> : '0'}
                    </td>
                    <td className="py-2 pr-2 text-right">{data.totalPaid.toLocaleString()}₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {uniqueUsers.length === 0 && (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MonthSelector({ data }: { data: Record<string, number> }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const count = data[monthKey] || 0

  const prevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1) }
    else setSelectedMonth(selectedMonth - 1)
  }

  const nextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1) }
    else setSelectedMonth(selectedMonth + 1)
  }

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">{getMonthName(selectedMonth)}</div>
          <div className="text-sm text-gray-500">{selectedYear}</div>
        </div>
        <button onClick={nextMonth} disabled={isCurrentMonth} className={`p-2 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30' : 'hover:bg-gray-100'}`}>
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>
      <div className="bg-blue-50 rounded-xl p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <Users size={16} className="text-blue-600" />
          <span className="text-sm text-blue-700">Новых клиентов</span>
        </div>
        <div className="text-2xl font-bold text-blue-600">{count}</div>
      </div>
    </div>
  )
}
