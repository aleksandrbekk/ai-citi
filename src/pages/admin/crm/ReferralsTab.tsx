import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Users, Coins, TrendingUp, CreditCard, Search, ArrowRight } from 'lucide-react'
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

interface ReferralLink {
  id: string
  referrer_telegram_id: number
  referrer_username: string | null
  referrer_first_name: string | null
  referred_telegram_id: number
  referred_username: string | null
  referred_first_name: string | null
  bonus_paid: boolean
  created_at: string
}

export function ReferralsTab() {
  const [search, setSearch] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['admin-referral-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_referral_stats')
      if (error) throw error
      return data as ReferralStatRow[]
    }
  })

  // Получаем список всех реферальных связей
  const { data: referralLinks, isLoading: isLinksLoading } = useQuery({
    queryKey: ['admin-referral-links'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_all_referrals')
      if (error) throw error
      return data as ReferralLink[]
    }
  })

  // Фильтрация связей по поиску
  const filteredLinks = referralLinks?.filter(link => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      link.referrer_telegram_id.toString().includes(search) ||
      link.referred_telegram_id.toString().includes(search) ||
      link.referrer_username?.toLowerCase().includes(searchLower) ||
      link.referrer_first_name?.toLowerCase().includes(searchLower) ||
      link.referred_username?.toLowerCase().includes(searchLower) ||
      link.referred_first_name?.toLowerCase().includes(searchLower)
    )
  })

  // Группировка связей по рефереру
  const groupedByReferrer = filteredLinks?.reduce((acc, link) => {
    const key = link.referrer_telegram_id
    if (!acc[key]) {
      acc[key] = {
        referrer_telegram_id: link.referrer_telegram_id,
        referrer_username: link.referrer_username,
        referrer_first_name: link.referrer_first_name,
        partners: []
      }
    }
    acc[key].partners.push({
      telegram_id: link.referred_telegram_id,
      username: link.referred_username,
      first_name: link.referred_first_name,
      bonus_paid: link.bonus_paid,
      created_at: link.created_at
    })
    return acc
  }, {} as Record<number, {
    referrer_telegram_id: number
    referrer_username: string | null
    referrer_first_name: string | null
    partners: Array<{
      telegram_id: number
      username: string | null
      first_name: string | null
      bonus_paid: boolean
      created_at: string
    }>
  }>)

  const groupedReferrers = groupedByReferrer ? Object.values(groupedByReferrer).sort((a, b) => b.partners.length - a.partners.length) : []

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

      {/* Список рефереров с их партнёрами */}
      <div className="mt-2">
        <h3 className="text-sm font-medium text-zinc-400 mb-2">Рефереры и их партнёры</h3>
        {isLinksLoading ? (
          <div className="text-center py-8 text-zinc-500">Загрузка...</div>
        ) : groupedReferrers.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 bg-zinc-800 rounded-xl">
            {referralLinks?.length === 0 ? 'Пока нет реферальных связей' : 'Ничего не найдено'}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedReferrers.map((referrer) => (
              <div key={referrer.referrer_telegram_id} className="bg-zinc-800 rounded-xl p-4">
                {/* Реферер (кто пригласил) */}
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-white truncate">
                      {referrer.referrer_first_name || 'Без имени'}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">
                      {referrer.referrer_username ? `@${referrer.referrer_username}` : referrer.referrer_telegram_id}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm flex-shrink-0">
                    {referrer.partners.length} партн.
                  </span>
                </div>

                {/* Список партнёров */}
                <div className="space-y-2 pl-3 border-l-2 border-green-500/30">
                  {referrer.partners.map((partner) => (
                    <div key={partner.telegram_id} className="flex items-center justify-between gap-2 py-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <ArrowRight className="w-3 h-3 text-green-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">
                            {partner.first_name || 'Без имени'}
                          </div>
                          <div className="text-xs text-zinc-500 truncate">
                            {partner.username ? `@${partner.username}` : partner.telegram_id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-zinc-500">
                          {new Date(partner.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${partner.bonus_paid ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {partner.bonus_paid ? '+6' : '0'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Счётчик */}
        {groupedReferrers.length > 0 && (
          <div className="text-xs text-zinc-500 text-center mt-2">
            {groupedReferrers.length} рефереров, {filteredLinks?.length || 0} партнёров
          </div>
        )}
      </div>
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
