import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Coins,
  Palette,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  Calendar
} from 'lucide-react'

interface CoinTransaction {
  id: string
  user_id: string
  amount: number
  balance_after: number
  type: string
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

// Типы пакетов монет
const COIN_PACKAGES = [
  { id: '100_coins', name: '100 монет', coins: 100 },
  { id: '500_coins', name: '500 монет', coins: 500 },
  { id: '1000_coins', name: '1000 монет', coins: 1000 },
]

// Стили каруселей (актуальные из carouselStyles.ts)
const CAROUSEL_STYLES = [
  { id: 'APPLE_GLASSMORPHISM', name: '🍎 Apple Glass', color: 'bg-orange-500' },
  { id: 'AESTHETIC_BEIGE', name: '🤎 Aesthetic Beige', color: 'bg-amber-600' },
  { id: 'SOFT_PINK_EDITORIAL', name: '🌸 Soft Pink', color: 'bg-pink-400' },
  { id: 'MINIMALIST_LINE_ART', name: '✏️ Minimalist', color: 'bg-gray-700' },
  { id: 'GRADIENT_MESH_3D', name: '🌈 Gradient 3D', color: 'bg-purple-500' },
]

export default function StatsTab() {
  // Статистика покупок монет (через admin функцию для обхода RLS)
  const { data: coinPurchases } = useQuery<CoinTransaction[]>({
    queryKey: ['coin_purchases_stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('admin_get_coin_purchases')
      return (data as CoinTransaction[]) || []
    }
  })

  // Статистика генераций каруселей (через admin функцию для обхода RLS)
  const { data: carouselGenerations } = useQuery<CoinTransaction[]>({
    queryKey: ['carousel_generations_stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('admin_get_carousel_generations')
      return (data as CoinTransaction[]) || []
    }
  })

  // Расчёт статистики покупок
  const purchaseStats = {
    total: coinPurchases?.length || 0,
    totalCoins: coinPurchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    weekPurchases: coinPurchases?.filter(p => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(p.created_at) >= weekAgo
    }).length || 0,
  }

  // По пакетам монет
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
    weekGenerations: carouselGenerations?.filter(g => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(g.created_at) >= weekAgo
    }).length || 0,
  }

  // По стилям
  const byStyle = carouselGenerations?.reduce((acc, g) => {
    const meta = g.metadata as Record<string, string> | null
    const style = meta?.style || 'ai-citi'
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
          icon={ShoppingCart}
          label="Покупок монет"
          value={purchaseStats.total}
          subvalue={`+${purchaseStats.weekPurchases} за неделю`}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          icon={Coins}
          label="Продано монет"
          value={purchaseStats.totalCoins}
          color="bg-yellow-100 text-yellow-600"
        />
        <StatCard
          icon={Sparkles}
          label="Генераций"
          value={generationStats.total}
          subvalue={`+${generationStats.weekGenerations} за неделю`}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Потрачено монет"
          value={generationStats.totalSpent}
          subvalue="на генерации"
          color="bg-cyan-100 text-cyan-600"
        />
      </div>

      <div className="grid gap-4">
        {/* Покупки по пакетам */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <Coins size={16} className="text-yellow-500" /> Покупки по пакетам
          </h3>
          {COIN_PACKAGES.map(pkg => (
            <ProgressBar
              key={pkg.id}
              label={pkg.name}
              value={byPackage[pkg.id] || 0}
              total={purchaseStats.total}
              color="bg-yellow-500"
            />
          ))}
          {purchaseStats.total === 0 && (
            <p className="text-gray-500 text-center py-2">Пока нет покупок</p>
          )}
        </div>

        {/* Генерации по стилям */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <Palette size={16} className="text-purple-500" /> Генерации по стилям
          </h3>
          {CAROUSEL_STYLES.map(style => (
            <ProgressBar
              key={style.id}
              label={style.name}
              value={byStyle[style.id] || 0}
              total={generationStats.total}
              color={style.color}
            />
          ))}
          {generationStats.total === 0 && (
            <p className="text-gray-500 text-center py-2">Пока нет генераций</p>
          )}
        </div>
      </div>

      {/* Графики по месяцам */}
      <div className="grid gap-4">
        {/* Покупки по месяцам */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-green-500" /> Покупки по месяцам
          </h3>
          <MonthChart data={purchasesByMonth} color="bg-green-500" />
        </div>

        {/* Генерации по месяцам */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <Calendar size={16} className="text-purple-500" /> Генерации по месяцам
          </h3>
          <MonthChart data={generationsByMonth} color="bg-purple-500" />
        </div>
      </div>

      {/* Последние покупки */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
          <ShoppingCart size={16} className="text-green-500" /> Последние покупки
        </h3>
        <div className="space-y-2">
          {coinPurchases?.slice(0, 5).map((purchase, i) => (
            <div key={purchase.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="text-gray-900 text-sm">
                  {new Date(purchase.created_at).toLocaleDateString('ru-RU')}
                </span>
                <span className="text-gray-500 text-xs ml-2">
                  {purchase.user_id?.slice(0, 8)}...
                </span>
              </div>
              <span className="text-green-600 font-medium">+{purchase.amount} монет</span>
            </div>
          ))}
          {(!coinPurchases || coinPurchases.length === 0) && (
            <p className="text-gray-500 text-center py-4">Пока нет покупок</p>
          )}
        </div>
      </div>
    </div>
  )
}

function MonthChart({ data, color }: { data: Record<string, number>, color: string }) {
  const entries = Object.entries(data)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)

  if (entries.length === 0) {
    return <p className="text-gray-500 text-center py-4">Нет данных</p>
  }

  const maxValue = Math.max(...entries.map(([, v]) => v as number), 1)

  return (
    <div className="flex items-end gap-1 h-24">
      {entries.map(([month, count]) => {
        const countNum = count as number
        const height = maxValue > 0 ? (countNum / maxValue) * 100 : 0
        return (
          <div key={month} className="flex-1 flex flex-col items-center">
            <div
              className={`w-full ${color} rounded-t`}
              style={{ height: `${height}%`, minHeight: countNum > 0 ? '4px' : '0' }}
            />
            <span className="text-xs text-gray-500 mt-2">{month.slice(5)}</span>
            <span className="text-xs text-gray-900">{countNum}</span>
          </div>
        )
      })}
    </div>
  )
}
