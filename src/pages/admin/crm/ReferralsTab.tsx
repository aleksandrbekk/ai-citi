import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Users, Coins, TrendingUp, CreditCard, Search } from 'lucide-react'
import { useState } from 'react'

interface ReferralStatRow {
  telegram_id: number
  username: string | null
  first_name: string | null
  total_referrals: number
  total_coins_earned: number
  total_partner_spent: number
  total_partner_purchased: number
}

export function ReferralsTab() {
  const [search, setSearch] = useState('')

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_referral_stats')
      if (error) throw error
      return data as ReferralStatRow[]
    }
  })

  // Фильтрация по поиску
  const filteredStats = stats?.filter(row => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      row.telegram_id.toString().includes(search) ||
      row.username?.toLowerCase().includes(searchLower) ||
      row.first_name?.toLowerCase().includes(searchLower)
    )
  })

  // Общая статистика
  const totals = stats?.reduce(
    (acc, row) => ({
      referrals: acc.referrals + row.total_referrals,
      earned: acc.earned + row.total_coins_earned,
      spent: acc.spent + row.total_partner_spent,
      purchased: acc.purchased + row.total_partner_purchased
    }),
    { referrals: 0, earned: 0, spent: 0, purchased: 0 }
  ) || { referrals: 0, earned: 0, spent: 0, purchased: 0 }

  return (
    <div className="space-y-4">
      {/* Общая статистика */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Users}
          label="Всего рефералов"
          value={totals.referrals}
          color="blue"
        />
        <StatCard
          icon={Coins}
          label="Выплачено бонусов"
          value={totals.earned}
          color="yellow"
        />
        <StatCard
          icon={TrendingUp}
          label="Траты партнёров"
          value={totals.spent}
          color="green"
        />
        <StatCard
          icon={CreditCard}
          label="Покупки партнёров"
          value={totals.purchased}
          color="purple"
        />
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none"
        />
      </div>

      {/* Таблица по пользователям */}
      {isLoading ? (
        <div className="text-center py-8 text-zinc-500">Загрузка...</div>
      ) : !filteredStats || filteredStats.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          {stats?.length === 0 ? 'Нет данных о рефералах' : 'Ничего не найдено'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredStats.map((row) => (
            <div key={row.telegram_id} className="bg-zinc-800 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-white truncate">
                    {row.first_name || 'Без имени'}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {row.username ? `@${row.username}` : row.telegram_id}
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm flex-shrink-0">
                  {row.total_referrals} партн.
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                  +{row.total_coins_earned} монет
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded">
                  Траты: {row.total_partner_spent}
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-400 rounded">
                  Покупки: {row.total_partner_purchased}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Счётчик */}
      {filteredStats && (
        <div className="text-xs text-zinc-500 text-center">
          {filteredStats.length} из {stats?.length || 0}
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ElementType
  label: string
  value: number
  color: 'blue' | 'yellow' | 'green' | 'purple'
}) {
  const colors = {
    blue: 'bg-blue-500/20 text-blue-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400'
  }

  return (
    <div className="bg-zinc-800 rounded-xl p-3">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}
