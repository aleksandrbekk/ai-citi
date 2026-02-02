import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { BarChart3, Users, DollarSign, TrendingUp, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function getMonthName(monthNum: number): string {
  return MONTH_NAMES[monthNum] || ''
}

function MonthSelector({ data }: { data: Record<string, number> }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const count = data[monthKey] || 0

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {getMonthName(selectedMonth)}
          </div>
          <div className="text-sm text-gray-500">{selectedYear}</div>
        </div>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className={`p-2 rounded-lg transition-colors ${isCurrentMonth ? 'opacity-30' : 'hover:bg-gray-100'}`}
        >
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

  // По тарифам (актуальные из Shop.tsx)
  const byPlan = {
    free: clients?.filter(c => c.plan?.toUpperCase() === 'FREE' || c.plan?.toUpperCase() === 'BASIC').length || 0,
    starter: clients?.filter(c => c.plan?.toUpperCase() === 'STARTER').length || 0,
    pro: clients?.filter(c => c.plan?.toUpperCase() === 'PRO').length || 0,
    business: clients?.filter(c => c.plan?.toUpperCase() === 'BUSINESS' || c.plan?.toUpperCase() === 'ELITE').length || 0
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
          <ProgressBar label="FREE" value={byPlan.free} total={stats.total} color="bg-gray-400" />
          <ProgressBar label="STARTER (499₽)" value={byPlan.starter} total={stats.total} color="bg-cyan-500" />
          <ProgressBar label="PRO (1499₽)" value={byPlan.pro} total={stats.total} color="bg-orange-500" />
          <ProgressBar label="BUSINESS (4999₽)" value={byPlan.business} total={stats.total} color="bg-amber-500" />
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

      {/* Клиенты по месяцам */}
      <MonthSelector data={byMonth} />
    </div>
  )
}
