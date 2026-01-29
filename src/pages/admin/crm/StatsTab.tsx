import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Coins,
  Palette,
  TrendingUp,
  ShoppingCart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users
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

interface CarouselRefund {
  id: string
  user_id: string
  telegram_id: number
  username: string | null
  amount: number
  balance_after: number
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface CarouselStatsSummary {
  total_generations: number
  total_refunds: number
  total_coins_spent: number
  total_coins_refunded: number
  week_generations: number
  week_refunds: number
}

interface CarouselStatsByUser {
  user_id: string
  telegram_id: number
  username: string | null
  generations_count: number
  refunds_count: number
  coins_spent: number
  coins_refunded: number
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
  { id: '_legacy', name: '📦 Старые (без стиля)', color: 'bg-gray-400' },
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

  // Возвраты монет при ошибках генерации
  const { data: carouselRefunds } = useQuery<CarouselRefund[]>({
    queryKey: ['carousel_refunds_stats'],
    queryFn: async () => {
      const { data } = await supabase.rpc('admin_get_carousel_refunds')
      return (data as CarouselRefund[]) || []
    }
  })

  // Сводка: генерации и возвраты (для карточек)
  const { data: statsSummary } = useQuery<CarouselStatsSummary[]>({
    queryKey: ['carousel_stats_summary'],
    queryFn: async () => {
      const { data } = await supabase.rpc('admin_get_carousel_stats_summary')
      return (data as CarouselStatsSummary[]) || []
    }
  })

  // По пользователям: генерации и возвраты
  const { data: statsByUser } = useQuery<CarouselStatsByUser[]>({
    queryKey: ['carousel_stats_by_user'],
    queryFn: async () => {
      const { data } = await supabase.rpc('admin_get_carousel_stats_by_user')
      return (data as CarouselStatsByUser[]) || []
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

  const summaryRow = statsSummary?.[0]
  const refundStats = {
    total: summaryRow?.total_refunds ?? carouselRefunds?.length ?? 0,
    weekRefunds: summaryRow?.week_refunds ?? carouselRefunds?.filter(r => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(r.created_at) >= weekAgo
    }).length ?? 0,
    totalCoinsRefunded: summaryRow?.total_coins_refunded ?? carouselRefunds?.reduce((s, r) => s + (r.amount || 0), 0) ?? 0,
  }

  // По стилям (null/undefined → '_legacy' для старых генераций)
  const byStyle = carouselGenerations?.reduce((acc, g) => {
    const meta = g.metadata as Record<string, string> | null
    const style = meta?.style || '_legacy'
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
        <StatCard
          icon={AlertCircle}
          label="Ошибки (возвраты)"
          value={refundStats.total}
          subvalue={`+${refundStats.weekRefunds} за неделю · возвращено ${refundStats.totalCoinsRefunded} монет`}
          color="bg-red-100 text-red-600"
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

      {/* Статистика по месяцам */}
      <MonthSelector
        purchasesData={purchasesByMonth}
        generationsData={generationsByMonth}
      />

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

        {/* Последние возвраты (ошибки генерации) */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500" /> Последние возвраты
          </h3>
          <p className="text-gray-500 text-xs mb-3">
            Когда генерация карусели падала — монеты возвращались пользователю. Здесь видно все такие случаи.
          </p>
          <div className="space-y-2">
            {carouselRefunds?.slice(0, 10).map((refund, i) => (
              <div key={refund.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-gray-900 text-sm">
                    {new Date(refund.created_at).toLocaleString('ru-RU')}
                  </span>
                  <span className="text-gray-500 text-xs ml-2">
                    {refund.username ? `@${refund.username}` : `ID ${refund.telegram_id}`}
                  </span>
                </div>
                <span className="text-red-600 font-medium">+{refund.amount} монет</span>
              </div>
            ))}
            {(!carouselRefunds || carouselRefunds.length === 0) && (
              <p className="text-gray-500 text-center py-4">Возвратов пока не было</p>
            )}
          </div>
        </div>

        {/* По пользователям: генерации и ошибки */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-gray-900 font-medium text-sm mb-3 flex items-center gap-2">
            <Users size={16} className="text-indigo-500" /> По пользователям
          </h3>
          <p className="text-gray-500 text-xs mb-3">
            Сколько раз каждый пользователь генерировал карусели и сколько раз получал возврат из-за ошибки.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="py-2 pr-2">Пользователь</th>
                  <th className="py-2 pr-2 text-center">Генераций</th>
                  <th className="py-2 pr-2 text-center">Возвратов</th>
                  <th className="py-2 pr-2 text-right">Потрачено</th>
                  <th className="py-2 pr-2 text-right">Возвращено</th>
                </tr>
              </thead>
              <tbody>
                {statsByUser?.slice(0, 20).map((row) => (
                  <tr key={row.user_id} className="border-b border-gray-100">
                    <td className="py-2 pr-2 text-gray-900">
                      {row.username ? `@${row.username}` : `ID ${row.telegram_id}`}
                    </td>
                    <td className="py-2 pr-2 text-center">{row.generations_count}</td>
                    <td className="py-2 pr-2 text-center">
                      {row.refunds_count > 0 ? (
                        <span className="text-red-600 font-medium">{row.refunds_count}</span>
                      ) : (
                        row.refunds_count
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right">{row.coins_spent}</td>
                    <td className="py-2 pr-2 text-right">
                      {row.coins_refunded > 0 ? (
                        <span className="text-red-600">+{row.coins_refunded}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!statsByUser || statsByUser.length === 0) && (
              <p className="text-gray-500 text-center py-4">Нет данных</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']

function getMonthName(monthNum: number): string {
  return MONTH_NAMES[monthNum] || ''
}

function MonthSelector({
  purchasesData,
  generationsData
}: {
  purchasesData: Record<string, number>
  generationsData: Record<string, number>
}) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`
  const purchases = purchasesData[monthKey] || 0
  const generations = generationsData[monthKey] || 0

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

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <ShoppingCart size={16} className="text-green-600" />
            <span className="text-sm text-green-700">Покупки</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{purchases}</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles size={16} className="text-purple-600" />
            <span className="text-sm text-purple-700">Генерации</span>
          </div>
          <div className="text-2xl font-bold text-purple-600">{generations}</div>
        </div>
      </div>
    </div>
  )
}
