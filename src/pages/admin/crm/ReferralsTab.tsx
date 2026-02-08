import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Users, Coins, TrendingUp, Search, ArrowRight, ChevronDown, ChevronUp, Gift, ShoppingCart } from 'lucide-react'
import { useState } from 'react'

interface ReferralStatRow {
  telegram_id: number
  username: string | null
  first_name: string | null
  total_referrals: number
  total_coins_earned: number
  total_partner_spent: number
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
  partner_earnings: number
}

interface PartnerTransaction {
  id: string
  amount: number
  type: string
  description: string
  created_at: string
}

export function ReferralsTab() {
  const [search, setSearch] = useState('')
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null)

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
      created_at: link.created_at,
      partner_earnings: link.partner_earnings
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
      partner_earnings: number
    }>
  }>)

  const groupedReferrers = groupedByReferrer ? Object.values(groupedByReferrer).sort((a, b) => b.partners.length - a.partners.length) : []

  // Общая статистика
  const totals = stats?.reduce(
    (acc, row) => ({
      referrals: acc.referrals + row.total_referrals,
      earned: acc.earned + row.total_coins_earned,
      spent: acc.spent + row.total_partner_spent
    }),
    { referrals: 0, earned: 0, spent: 0 }
  ) || { referrals: 0, earned: 0, spent: 0 }

  const togglePartner = (referrerId: number, partnerId: number) => {
    const key = `${referrerId}-${partnerId}`
    setExpandedPartner(expandedPartner === key ? null : key)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
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
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      {/* Список рефереров с их партнёрами */}
      <div className="mt-2">
        <h3 className="text-sm font-medium text-gray-600 mb-2">Рефереры и их партнёры</h3>
        {isLinksLoading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : groupedReferrers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white border border-gray-200 rounded-xl">
            {referralLinks?.length === 0 ? 'Пока нет реферальных связей' : 'Ничего не найдено'}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedReferrers.map((referrer) => (
              <div key={referrer.referrer_telegram_id} className="bg-white border border-gray-200 rounded-xl p-4">
                {/* Реферер (кто пригласил) */}
                <div className="flex items-center justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 truncate">
                      {referrer.referrer_first_name || 'Без имени'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {referrer.referrer_username ? `@${referrer.referrer_username}` : referrer.referrer_telegram_id}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-sm flex-shrink-0">
                    {referrer.partners.length} партн.
                  </span>
                </div>

                {/* Список партнёров */}
                <div className="space-y-2 pl-3 border-l-2 border-green-300">
                  {referrer.partners.map((partner) => {
                    const partnerKey = `${referrer.referrer_telegram_id}-${partner.telegram_id}`
                    const isExpanded = expandedPartner === partnerKey

                    return (
                      <div key={partner.telegram_id}>
                        <div
                          className="flex items-center justify-between gap-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
                          onClick={() => togglePartner(referrer.referrer_telegram_id, partner.telegram_id)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <ArrowRight className="w-3 h-3 text-green-600 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm text-gray-900 truncate">
                                {partner.first_name || 'Без имени'}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {partner.username ? `@${partner.username}` : partner.telegram_id}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">
                              {new Date(partner.created_at).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short'
                              })}
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${partner.partner_earnings > 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                              {partner.partner_earnings > 0 ? `+${partner.partner_earnings}` : '0'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Детализация бонусов */}
                        {isExpanded && (
                          <PartnerDetails
                            referrerTelegramId={referrer.referrer_telegram_id}
                            partnerTelegramId={partner.telegram_id}
                            partnerName={partner.first_name || 'Партнёр'}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Счётчик */}
        {groupedReferrers.length > 0 && (
          <div className="text-xs text-gray-500 text-center mt-2">
            {groupedReferrers.length} рефереров, {filteredLinks?.length || 0} партнёров
          </div>
        )}
      </div>
    </div>
  )
}

function PartnerDetails({
  referrerTelegramId,
  partnerTelegramId,
  partnerName
}: {
  referrerTelegramId: number
  partnerTelegramId: number
  partnerName: string
}) {
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['partner-transactions', referrerTelegramId, partnerTelegramId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_get_partner_transactions', {
        p_referrer_telegram_id: referrerTelegramId,
        p_partner_telegram_id: partnerTelegramId
      })
      if (error) throw error
      return data as PartnerTransaction[]
    }
  })

  if (isLoading) {
    return (
      <div className="ml-5 mt-2 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 text-center">Загрузка...</div>
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="ml-5 mt-2 p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 text-center">Нет транзакций</div>
      </div>
    )
  }

  return (
    <div className="ml-5 mt-2 p-3 bg-gray-50 rounded-lg space-y-2">
      <div className="text-xs font-medium text-gray-600 mb-2">
        Доход от {partnerName}:
      </div>
      {transactions.map((tx) => (
        <div key={tx.id} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {tx.type === 'referral' ? (
              <Gift className="w-3 h-3 text-blue-500" />
            ) : (
              <ShoppingCart className="w-3 h-3 text-green-500" />
            )}
            <span className="text-gray-600">
              {tx.type === 'referral' ? 'Регистрация' : 'Бонус от покупки'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              {new Date(tx.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short'
              })}
            </span>
            <span className="font-medium text-green-600">+{tx.amount}</span>
          </div>
        </div>
      ))}
      <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-xs">
        <span className="font-medium text-gray-700">Итого:</span>
        <span className="font-bold text-green-600">
          +{transactions.reduce((sum, tx) => sum + tx.amount, 0)}
        </span>
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
  color: 'blue' | 'yellow' | 'green' | 'cyan'
}) {
  const colors = {
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    cyan: 'bg-cyan-100 text-cyan-600'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3">
      <div className={`w-8 h-8 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  )
}
