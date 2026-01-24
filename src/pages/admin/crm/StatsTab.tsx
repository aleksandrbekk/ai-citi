import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Coins,
  Palette,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  Users,
  DollarSign,
  Calendar
} from 'lucide-react'

// Типы пакетов монет
const COIN_PACKAGES = [
  { id: '100_coins', name: '100 монет', coins: 100, price: 377 },
  { id: '500_coins', name: '500 монет', coins: 500, price: 1500 },
  { id: '1000_coins', name: '1000 монет', coins: 1000, price: 2500 },
]

// Стили каруселей
const CAROUSEL_STYLES = [
  { id: 'ai-citi', name: 'AI CITI', color: 'bg-cyan-500' },
  { id: 'minimal', name: 'Минимализм', color: 'bg-gray-500' },
  { id: 'bright', name: 'Яркий', color: 'bg-orange-500' },
  { id: 'business', name: 'Бизнес', color: 'bg-blue-500' },
  { id: 'creative', name: 'Креатив', color: 'bg-purple-500' },
]

export default function StatsTab() {
  // Статистика покупок монет
  const { data: coinPurchases } = useQuery({
    queryKey: ['coin_purchases_stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('type', 'purchase')
        .order('created_at', { ascending: false })
      return data || []
    }
  })

  // Статистика генераций каруселей (из coin_transactions с type='spend')
  const { data: carouselGenerations } = useQuery({
    queryKey: ['carousel_generations_stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('type', 'spend')
        .ilike('description', '%карусел%')
        .order('created_at', { ascending: false })
      return data || []
    }
  })

  // Расчёт статистики покупок
  const purchaseStats = {
    total: coinPurchases?.length || 0,
    totalCoins: coinPurchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    totalRevenue: (coinPurchases?.length || 0) * 377, // Примерная выручка
    todayPurchases: coinPurchases?.filter(p => {
      const today = new Date()
      const purchaseDate = new Date(p.created_at)
      return purchaseDate.toDateString() === today.toDateString()
    }).length || 0,
    weekPurchases: coinPurchases?.filter(p => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(p.created_at) >= weekAgo
    }).length || 0,
  }

  // По пакетам монет (группировка по amount)
  const byPackage = coinPurchases?.reduce((acc, p) => {
    const amount = p.amount || 0
    const key = `${amount}_coins`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // Статистика генераций
  const generationStats = {
    total: carouselGenerations?.length || 0,
    totalSpent: carouselGenerations?.reduce((sum, g) => sum + Math.abs(g.amount || 0), 0) || 0,
    todayGenerations: carouselGenerations?.filter(g => {
      const today = new Date()
      const genDate = new Date(g.created_at)
      return genDate.toDateString() === today.toDateString()
    }).length || 0,
    weekGenerations: carouselGenerations?.filter(g => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(g.created_at) >= weekAgo
    }).length || 0,
  }

  // По стилям (извлекаем из metadata или description)
  const byStyle = carouselGenerations?.reduce((acc, g) => {
    const style = g.metadata?.style || 'ai-citi'
    acc[style] = (acc[style] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // По месяцам (покупки)
  const purchasesByMonth = coinPurchases?.reduce((acc, p) => {
    const date = new Date(p.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  // По месяцам (генерации)
  const generationsByMonth = carouselGenerations?.reduce((acc, g) => {
    const date = new Date(g.created_at)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>) || {}

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Статистика платформы
        </h2>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShoppingCart}
          label="Покупок монет"
          value={purchaseStats.total}
          subvalue={`+${purchaseStats.weekPurchases} за неделю`}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          icon={Coins}
          label="Продано монет"
          value={purchaseStats.totalCoins}
          subvalue={`~${Math.round(purchaseStats.totalRevenue / 100)}$ выручка`}
          color="bg-yellow-500/20 text-yellow-400"
        />
        <StatCard
          icon={Sparkles}
          label="Генераций"
          value={generationStats.total}
          subvalue={`+${generationStats.weekGenerations} за неделю`}
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={DollarSign}
          label="Потрачено монет"
          value={generationStats.totalSpent}
          subvalue="на генерации"
          color="bg-cyan-500/20 text-cyan-400"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Покупки по пакетам */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            Покупки по пакетам
          </h3>
          {COIN_PACKAGES.map(pkg => {
            const count = byPackage[pkg.id] || 0
            const total = purchaseStats.total || 1
            const percent = Math.round((count / total) * 100) || 0
            return (
              <div key={pkg.id} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#94A3B8]">{pkg.name}</span>
                  <span className="text-white">{count} ({percent}%)</span>
                </div>
                <div className="h-3 bg-[#0F172A] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-500 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
          {purchaseStats.total === 0 && (
            <p className="text-[#64748B] text-center py-4">Пока нет покупок</p>
          )}
        </div>

        {/* Генерации по стилям */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-purple-400" />
            Генерации по стилям
          </h3>
          {CAROUSEL_STYLES.map(style => {
            const count = byStyle[style.id] || 0
            const total = generationStats.total || 1
            const percent = Math.round((count / total) * 100) || 0
            return (
              <div key={style.id} className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#94A3B8]">{style.name}</span>
                  <span className="text-white">{count} ({percent}%)</span>
                </div>
                <div className="h-3 bg-[#0F172A] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${style.color} rounded-full transition-all`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            )
          })}
          {generationStats.total === 0 && (
            <p className="text-[#64748B] text-center py-4">Пока нет генераций</p>
          )}
        </div>
      </div>

      {/* Графики по месяцам */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Покупки по месяцам */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-400" />
            Покупки по месяцам
          </h3>
          <MonthChart data={purchasesByMonth} color="bg-green-500" />
        </div>

        {/* Генерации по месяцам */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            Генерации по месяцам
          </h3>
          <MonthChart data={generationsByMonth} color="bg-purple-500" />
        </div>
      </div>

      {/* Последние транзакции */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          Последние покупки монет
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[#64748B] text-sm border-b border-[#334155]">
                <th className="text-left py-3">Дата</th>
                <th className="text-left py-3">Пользователь</th>
                <th className="text-right py-3">Монет</th>
              </tr>
            </thead>
            <tbody>
              {coinPurchases?.slice(0, 10).map((purchase, i) => (
                <tr key={purchase.id || i} className="border-b border-[#334155]/50 hover:bg-[#0F172A]">
                  <td className="py-3 text-[#94A3B8] text-sm">
                    {new Date(purchase.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="py-3 text-white text-sm">
                    {purchase.user_id?.slice(0, 8)}...
                  </td>
                  <td className="py-3 text-right text-green-400 font-medium">
                    +{purchase.amount}
                  </td>
                </tr>
              ))}
              {(!coinPurchases || coinPurchases.length === 0) && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-[#64748B]">
                    Пока нет покупок
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, subvalue, color }: {
  icon: any
  label: string
  value: number | string
  subvalue?: string
  color: string
}) {
  return (
    <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[#94A3B8] text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {subvalue && (
        <div className="text-[#64748B] text-xs mt-1">{subvalue}</div>
      )}
    </div>
  )
}

function MonthChart({ data, color }: { data: Record<string, number>, color: string }) {
  const entries = Object.entries(data)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)

  if (entries.length === 0) {
    return <p className="text-[#64748B] text-center py-8">Нет данных</p>
  }

  const maxValue = Math.max(...entries.map(([, v]) => v as number), 1)

  return (
    <div className="flex items-end gap-2 h-32">
      {entries.map(([month, count]) => {
        const height = (count as number / maxValue) * 100
        return (
          <div key={month} className="flex-1 flex flex-col items-center">
            <div className="w-full flex flex-col items-center justify-end h-24">
              <span className="text-white text-xs mb-1">{count}</span>
              <div
                className={`w-full ${color} rounded-t transition-all`}
                style={{ height: `${height}%`, minHeight: count > 0 ? '8px' : '0' }}
              />
            </div>
            <span className="text-[#64748B] text-xs mt-2">
              {month.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
