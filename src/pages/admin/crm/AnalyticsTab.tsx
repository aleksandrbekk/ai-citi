import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { BarChart3, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react'

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function getMonthName(monthKey: string): string {
  const monthNum = parseInt(monthKey.slice(5), 10) - 1
  return MONTH_NAMES[monthNum] || monthKey
}

export default function AnalyticsTab() {
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

  // Статистика
  const stats = {
    total: clients?.length || 0,
    active: clients?.filter(c => new Date(c.expires_at) > now).length || 0,
    expiring: clients?.filter(c => {
      const days = Math.ceil((new Date(c.expires_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return days > 0 && days <= 7
    }).length || 0,
    expired: clients?.filter(c => new Date(c.expires_at) <= now).length || 0,
    totalLTV: clients?.reduce((sum, c) => sum + (c.total_paid_usd || 0), 0) || 0,
    avgLTV: clients?.length ? Math.round((clients.reduce((sum, c) => sum + (c.total_paid_usd || 0), 0)) / clients.length) : 0
  }

  // По тарифам
  const byPlan = {
    basic: clients?.filter(c => c.plan?.toUpperCase() === 'BASIC').length || 0,
    starter: clients?.filter(c => c.plan?.toUpperCase() === 'STARTER').length || 0,
    pro: clients?.filter(c => c.plan?.toUpperCase() === 'PRO').length || 0,
    elite: clients?.filter(c => c.plan?.toUpperCase() === 'ELITE').length || 0
  }

  // По источникам
  const bySources = clients?.reduce((acc, c) => {
    const source = c.source || 'unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // По месяцам (последние 6 месяцев)
  const byMonth = clients?.reduce((acc, c) => {
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
      {/* Основные метрики */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          label="Всего клиентов"
          value={stats.total}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Активных"
          value={stats.active}
          subvalue={`${stats.expiring} истекает скоро`}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={DollarSign}
          label="Общий LTV"
          value={`$${stats.totalLTV}`}
          subvalue={`Средний: $${stats.avgLTV}`}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          icon={Calendar}
          label="Просрочено"
          value={stats.expired}
          color="bg-red-100 text-red-600"
        />
      </div>

      <div className="grid gap-4">
        {/* По тарифам */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <BarChart3 size={16} /> По тарифам
          </h3>
          <ProgressBar label="BASIC" value={byPlan.basic} total={stats.total} color="bg-blue-500" />
          <ProgressBar label="STARTER" value={byPlan.starter} total={stats.total} color="bg-cyan-500" />
          <ProgressBar label="PRO" value={byPlan.pro} total={stats.total} color="bg-purple-500" />
          <ProgressBar label="ELITE" value={byPlan.elite} total={stats.total} color="bg-amber-500" />
        </div>

        {/* По источникам */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> Источники
          </h3>
          {Object.entries(bySources).length > 0 ? (
            Object.entries(bySources)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .map(([source, count]) => (
                <ProgressBar
                  key={source}
                  label={source}
                  value={count as number}
                  total={stats.total}
                  color="bg-cyan-500"
                />
              ))
          ) : (
            <p className="text-gray-500">Нет данных</p>
          )}
        </div>
      </div>

      {/* По месяцам */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
          <Calendar size={16} /> Клиенты по месяцам
        </h3>
        {Object.keys(byMonth).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(byMonth)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 6)
              .map(([month, count]) => {
                const countNum = count as number
                const maxCount = Math.max(...(Object.values(byMonth) as number[]), 1)
                const percent = maxCount > 0 ? (countNum / maxCount) * 100 : 0
                return (
                  <div key={month} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24 shrink-0">{getMonthName(month)}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">{countNum}</span>
                  </div>
                )
              })}
          </div>
        ) : (
          <p className="text-gray-500 text-center">Нет данных</p>
        )}
      </div>
    </div>
  )
}
