import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Plus, Search, X, CreditCard, Pencil, Save, Crown, Loader2, Coins, Trash2,
  DollarSign, Clock, CalendarCheck
} from 'lucide-react'
import { cn } from '../../../lib/utils'

interface PremiumClient {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  plan: string
  created_at: string
  expires_at?: string
  source?: string
  payment_method?: string
  has_channel_access?: boolean
  has_chat_access?: boolean
}

interface Payment {
  id: string
  telegram_id: number
  amount: number
  currency: string
  source: string
  payment_method: string
  paid_at: string
  created_at: string
}

interface UserSubscription {
  id: string
  telegram_id: number
  tier: string
  plan: string
  status: string
  amount_rub: number
  neurons_per_month: number
  started_at: string
  expires_at: string
  cancelled_at: string | null
}

// Курс конвертации USD → RUB
const USD_TO_RUB = 80

const toRub = (amount: number, currency: string) => {
  if (currency === 'USD') return Math.round(amount * USD_TO_RUB)
  return amount
}

// Объединённый платящий юзер
interface PaidUser {
  telegram_id: number
  username: string | null
  first_name: string | null
  totalPaid: number // всегда в RUB (конвертировано)
  totalPaidRaw: { rub: number; usd: number } // раздельно по валютам
  paymentsCount: number
  lastPaymentAt: string | null
  firstPaymentAt: string | null
  activeSub: UserSubscription | null
  premiumPlan: string | null
  premiumExpiresAt: string | null
  premiumId: string | null // для CRUD
  source: string | null
}

type Cohort = 'all_paid' | 'active_subs' | 'premium'

export function ClientsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [cohort, setCohort] = useState<Cohort>('all_paid')
  const [selectedUser, setSelectedUser] = useState<PaidUser | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'payments'>('info')

  // CRUD state
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [newClientTelegramId, setNewClientTelegramId] = useState('')
  const [newClientPlan, setNewClientPlan] = useState('FREE')
  const [isEditMode, setIsEditMode] = useState(false)
  const [editPlan, setEditPlan] = useState('')
  const [editExpiresAt, setEditExpiresAt] = useState('')

  // Payment form
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('RUB')
  const [paymentSource, setPaymentSource] = useState('manual')
  const [paymentMethod, setPaymentMethod] = useState('card')

  // ========== DATA LOADING ==========

  const { data: clients } = useQuery({
    queryKey: ['premium-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PremiumClient[]
    }
  })

  const { data: usersData } = useQuery({
    queryKey: ['all-users-for-premium'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('telegram_id, username, first_name')
      if (error) throw error
      return data
    }
  })

  const { data: payments } = useQuery({
    queryKey: ['all-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data as Payment[]
    }
  })

  const { data: subscriptions } = useQuery({
    queryKey: ['all-user-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as UserSubscription[]
    }
  })

  const isLoading = !clients || !payments || !subscriptions

  // ========== BUILD UNIFIED PAID USERS ==========

  const usersMap = useMemo(() => {
    const map = new Map<number, { username?: string; first_name?: string }>()
    usersData?.forEach(u => {
      map.set(u.telegram_id, { username: u.username, first_name: u.first_name })
    })
    return map
  }, [usersData])

  const paidUsers = useMemo(() => {
    if (!payments || !subscriptions || !clients) return []

    const map = new Map<number, PaidUser>()

    // 1. Из payments
    payments.forEach(p => {
      const amountRub = toRub(p.amount, p.currency)
      const isUsd = p.currency === 'USD'
      const existing = map.get(p.telegram_id)
      if (existing) {
        existing.totalPaid += amountRub
        if (isUsd) existing.totalPaidRaw.usd += p.amount
        else existing.totalPaidRaw.rub += p.amount
        existing.paymentsCount++
        if (!existing.lastPaymentAt || p.paid_at > existing.lastPaymentAt) {
          existing.lastPaymentAt = p.paid_at
        }
        if (!existing.firstPaymentAt || p.paid_at < existing.firstPaymentAt) {
          existing.firstPaymentAt = p.paid_at
        }
      } else {
        const user = usersMap.get(p.telegram_id)
        map.set(p.telegram_id, {
          telegram_id: p.telegram_id,
          username: user?.username || null,
          first_name: user?.first_name || null,
          totalPaid: amountRub,
          totalPaidRaw: { rub: isUsd ? 0 : p.amount, usd: isUsd ? p.amount : 0 },
          paymentsCount: 1,
          lastPaymentAt: p.paid_at,
          firstPaymentAt: p.paid_at,
          activeSub: null,
          premiumPlan: null,
          premiumExpiresAt: null,
          premiumId: null,
          source: p.source || null,
        })
      }
    })

    // 2. Из user_subscriptions (добавляем тех кто платил через подписки)
    subscriptions.forEach(s => {
      const existing = map.get(s.telegram_id)
      if (existing) {
        if (s.amount_rub) {
          existing.totalPaid += s.amount_rub
          existing.paymentsCount++
        }
        // Активная подписка — берём последнюю
        if (s.status === 'active' && (!existing.activeSub || s.started_at > existing.activeSub.started_at)) {
          existing.activeSub = s
        }
      } else {
        const user = usersMap.get(s.telegram_id)
        map.set(s.telegram_id, {
          telegram_id: s.telegram_id,
          username: user?.username || null,
          first_name: user?.first_name || null,
          totalPaid: s.amount_rub || 0,
          totalPaidRaw: { rub: s.amount_rub || 0, usd: 0 },
          paymentsCount: s.amount_rub ? 1 : 0,
          lastPaymentAt: s.started_at,
          firstPaymentAt: s.started_at,
          activeSub: s.status === 'active' ? s : null,
          premiumPlan: null,
          premiumExpiresAt: null,
          premiumId: null,
          source: null,
        })
      }
    })

    // 3. Из premium_clients — добавляем в map или обогащаем
    clients.forEach(c => {
      const existing = map.get(c.telegram_id)
      if (existing) {
        existing.premiumPlan = c.plan
        existing.premiumExpiresAt = c.expires_at || null
        existing.premiumId = c.id
        if (!existing.username && c.username) existing.username = c.username
        if (!existing.first_name && c.first_name) existing.first_name = c.first_name
        if (c.source && !existing.source) existing.source = c.source
      } else {
        const user = usersMap.get(c.telegram_id)
        map.set(c.telegram_id, {
          telegram_id: c.telegram_id,
          username: c.username || user?.username || null,
          first_name: c.first_name || user?.first_name || null,
          totalPaid: 0,
          totalPaidRaw: { rub: 0, usd: 0 },
          paymentsCount: 0,
          lastPaymentAt: null,
          firstPaymentAt: c.created_at,
          activeSub: null,
          premiumPlan: c.plan,
          premiumExpiresAt: c.expires_at || null,
          premiumId: c.id,
          source: c.source || null,
        })
      }
    })

    return Array.from(map.values()).sort((a, b) => {
      // Сортируем: по дате последней оплаты (новые сверху)
      const dateA = a.lastPaymentAt || a.firstPaymentAt || ''
      const dateB = b.lastPaymentAt || b.firstPaymentAt || ''
      return dateB.localeCompare(dateA)
    })
  }, [payments, subscriptions, clients, usersMap])

  // ========== FILTERING ==========

  const filteredUsers = useMemo(() => {
    let list = paidUsers

    // Когорта
    if (cohort === 'active_subs') {
      list = list.filter(u => u.activeSub !== null)
    } else if (cohort === 'premium') {
      list = list.filter(u => u.premiumPlan !== null)
    }
    // 'all_paid' — все кто есть в пуле

    // Поиск
    if (search) {
      const s = search.toLowerCase()
      list = list.filter(u =>
        u.telegram_id.toString().includes(s) ||
        u.username?.toLowerCase().includes(s) ||
        u.first_name?.toLowerCase().includes(s)
      )
    }

    return list
  }, [paidUsers, cohort, search])

  // ========== STATS ==========

  const stats = useMemo(() => {
    const activeSubs = paidUsers.filter(u => u.activeSub !== null).length
    const totalRevenue = paidUsers.reduce((sum, u) => sum + u.totalPaid, 0)
    const avgCheck = paidUsers.length > 0 ? Math.round(totalRevenue / paidUsers.filter(u => u.totalPaid > 0).length) : 0
    return {
      totalPaidUsers: paidUsers.length,
      activeSubs,
      totalRevenue,
      avgCheck,
    }
  }, [paidUsers])

  // ========== MUTATIONS ==========

  const addClient = useMutation({
    mutationFn: async ({ telegram_id, plan }: { telegram_id: number; plan: string }) => {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      const { data: userInfo } = await supabase
        .from('users')
        .select('username, first_name')
        .eq('telegram_id', telegram_id)
        .single()
      const { data, error } = await supabase
        .from('premium_clients')
        .insert({
          telegram_id,
          plan,
          expires_at: expiresAt.toISOString(),
          username: userInfo?.username || null,
          first_name: userInfo?.first_name || null
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-clients'] })
      setShowAddClientModal(false)
      setNewClientTelegramId('')
      setNewClientPlan('FREE')
    }
  })

  const addPayment = useMutation({
    mutationFn: async (data: { telegram_id: number; amount: number; currency: string; source: string; payment_method: string }) => {
      const { error } = await supabase.from('payments').insert(data)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-payments'] })
      setShowAddPaymentModal(false)
      setPaymentAmount('')
      setPaymentCurrency('RUB')
      setPaymentSource('manual')
      setPaymentMethod('card')
    }
  })

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('premium_clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-clients'] })
      setSelectedUser(null)
    }
  })

  const updateClient = useMutation({
    mutationFn: async ({ id, plan, expires_at }: { id: string; plan: string; expires_at: string }) => {
      const { data, error } = await supabase
        .from('premium_clients')
        .update({ plan, expires_at })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-clients'] })
      setIsEditMode(false)
    }
  })

  // ========== HELPERS ==========

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('ru-RU')} ₽`
  }

  const formatUserAmount = (user: PaidUser) => {
    const parts: string[] = []
    if (user.totalPaidRaw.rub > 0) parts.push(`${user.totalPaidRaw.rub.toLocaleString('ru-RU')} ₽`)
    if (user.totalPaidRaw.usd > 0) parts.push(`$${user.totalPaidRaw.usd.toLocaleString('en-US')}`)
    return parts.join(' + ') || '0 ₽'
  }

  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getDaysRemaining = (expiresAt?: string | null) => {
    if (!expiresAt) return null
    const now = new Date()
    const exp = new Date(expiresAt)
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  const getSubStatusBadge = (user: PaidUser) => {
    if (user.activeSub) {
      const tier = user.activeSub.tier || user.activeSub.plan
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
          <CalendarCheck size={10} />
          {tier?.toUpperCase()}
        </span>
      )
    }
    if (user.premiumPlan) {
      const days = getDaysRemaining(user.premiumExpiresAt)
      const isActive = days === null || (days !== null && days > 0)
      return (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
          isActive ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
        )}>
          <Crown size={10} fill="currentColor" />
          {user.premiumPlan}
        </span>
      )
    }
    return null
  }

  const getClientPayments = (telegramId: number) => {
    if (!payments) return []
    return payments.filter(p => p.telegram_id === telegramId)
  }

  // ========== RENDER ==========

  return (
    <div className="space-y-4">
      {/* Статистика карточки */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-4 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="text-orange-100 text-xs mb-1">Общий доход</div>
          <div className="text-2xl font-bold">{formatAmount(stats.totalRevenue)}</div>
          <div className="text-orange-100/80 text-xs mt-1">ср. чек {formatAmount(stats.avgCheck)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-gray-400 text-xs mb-1">Платящих</div>
              <div className="text-xl font-bold text-gray-900">{stats.totalPaidUsers}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Активных</div>
              <div className="text-xl font-bold text-green-600">{stats.activeSubs}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Когорты */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {([
          ['all_paid', `Все платившие (${paidUsers.length})`, DollarSign],
          ['active_subs', `Активные (${paidUsers.filter(u => u.activeSub).length})`, CalendarCheck],
          ['premium', `Premium (${paidUsers.filter(u => u.premiumPlan).length})`, Crown],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setCohort(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap min-w-fit",
              cohort === key
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Поиск и добавление */}
      <div className="flex gap-2">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
          <input
            type="text"
            placeholder="Поиск по ID или @username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-200 transition-all font-medium"
          />
        </div>
        <button
          onClick={() => setShowAddClientModal(true)}
          className="px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl shadow-sm hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Список */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
          <p className="font-medium animate-pulse">Загрузка данных...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">
            {paidUsers.length === 0 ? 'Нет платящих клиентов' : 'Ничего не найдено'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const displayName = user.username || user.first_name
            return (
              <div
                key={user.telegram_id}
                onClick={() => {
                  setSelectedUser(user)
                  setActiveModalTab('info')
                  setIsEditMode(false)
                }}
                className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:border-orange-100 hover:translate-y-[-2px] transition-all duration-200 relative group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                        {(displayName?.[0] || '?').toUpperCase()}
                      </div>
                      {user.activeSub && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2 text-sm">
                        {displayName ? `@${displayName}` : `ID: ${user.telegram_id}`}
                        {getSubStatusBadge(user)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{user.telegram_id}</span>
                        {user.source && (
                          <span className="text-[10px] text-gray-400 px-1.5 bg-gray-50 rounded-full">{user.source}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {user.totalPaid > 0 && (
                      <span className="text-sm font-bold text-orange-600">
                        {formatUserAmount(user)}
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      {user.paymentsCount > 0 && (
                        <span>{user.paymentsCount} оплат</span>
                      )}
                      {user.lastPaymentAt && (
                        <>
                          <span>•</span>
                          <span>{formatDateShort(user.lastPaymentAt)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Счётчик */}
      {filteredUsers.length > 0 && (
        <div className="text-xs text-gray-400 font-medium text-center uppercase tracking-widest pt-4 opacity-60">
          Показано {filteredUsers.length} из {paidUsers.length}
        </div>
      )}

      {/* ========== МОДАЛКА ДОБАВЛЕНИЯ КЛИЕНТА ========== */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddClientModal(false)}>
          <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-white/20 ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Добавить клиента</h2>
              <button onClick={() => setShowAddClientModal(false)} className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Telegram ID</label>
                <input
                  type="number"
                  value={newClientTelegramId}
                  onChange={(e) => setNewClientTelegramId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="123456789"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Тариф</label>
                <select
                  value={newClientPlan}
                  onChange={(e) => setNewClientPlan(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="FREE">FREE (бесплатно)</option>
                  <option value="PRO">PRO (2 900₽/мес)</option>
                  <option value="ELITE">ELITE (9 900₽/мес)</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (newClientTelegramId) {
                    addClient.mutate({ telegram_id: parseInt(newClientTelegramId), plan: newClientPlan })
                  }
                }}
                disabled={addClient.isPending || !newClientTelegramId}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addClient.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                {addClient.isPending ? 'Добавление...' : 'Добавить клиента'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== МОДАЛКА ДЕТАЛЕЙ КЛИЕНТА ========== */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { setSelectedUser(null); setIsEditMode(false) }}
        >
          <div
            className="bg-white/90 backdrop-blur-md rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200 border border-white/20 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-6 relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg ring-4 ring-white flex items-center justify-center text-white text-2xl font-bold">
                      {((selectedUser.username || selectedUser.first_name)?.[0] || '?').toUpperCase()}
                    </div>
                    {selectedUser.activeSub && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CalendarCheck size={10} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {selectedUser.username ? `@${selectedUser.username}` : selectedUser.first_name || `ID: ${selectedUser.telegram_id}`}
                    </h3>
                    <div className="text-gray-500 font-medium mt-1">{selectedUser.telegram_id}</div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {getSubStatusBadge(selectedUser)}
                      {selectedUser.activeSub && (
                        <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                          до {formatDateShort(selectedUser.activeSub.expires_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedUser(null); setIsEditMode(false) }}
                  className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-100 px-6 py-2 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white/50">
              <div className="flex gap-2 min-w-max">
                {[
                  { id: 'info', label: 'Обзор', icon: CreditCard },
                  { id: 'payments', label: 'Платежи', icon: Coins },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveModalTab(tab.id as typeof activeModalTab); setIsEditMode(false) }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                      activeModalTab === tab.id
                        ? "bg-orange-50 text-orange-600 shadow-sm ring-1 ring-orange-200"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white/50 relative">
              <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">

                {/* Tab: Обзор */}
                {activeModalTab === 'info' && (
                  <div className="space-y-6">
                    {isEditMode && selectedUser.premiumId ? (
                      <div className="space-y-4 bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
                        <div className="text-sm font-semibold text-orange-700 flex items-center gap-2">
                          <Pencil size={14} />
                          Редактирование
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Тариф</label>
                          <select
                            value={editPlan}
                            onChange={(e) => setEditPlan(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          >
                            <option value="FREE">FREE (бесплатно)</option>
                            <option value="PRO">PRO (2 900₽/мес)</option>
                            <option value="ELITE">ELITE (9 900₽/мес)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Дата истечения</label>
                          <input
                            type="date"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <button
                            onClick={() => {
                              if (editExpiresAt && selectedUser.premiumId) {
                                updateClient.mutate({
                                  id: selectedUser.premiumId,
                                  plan: editPlan,
                                  expires_at: new Date(editExpiresAt).toISOString()
                                })
                              }
                            }}
                            disabled={updateClient.isPending || !editExpiresAt}
                            className="py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {updateClient.isPending ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button
                            onClick={() => setIsEditMode(false)}
                            className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Финансы */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-2 text-orange-100 mb-2 font-medium">
                              <DollarSign size={18} />
                              <span>Оплачено</span>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">
                              {formatUserAmount(selectedUser)}
                            </div>
                            <div className="text-xs text-orange-100 mt-1 opacity-80">≈ {formatAmount(selectedUser.totalPaid)}</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 text-gray-500 mb-2 font-medium">
                              <Coins size={18} className="text-cyan-500" />
                              <span>Платежей</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight">
                              {selectedUser.paymentsCount}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">за всё время</div>
                          </div>
                        </div>

                        {/* Подписка */}
                        {selectedUser.activeSub && (
                          <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                            <h4 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                              <CalendarCheck size={18} className="text-green-600" />
                              Активная подписка
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white rounded-xl p-3 border border-green-100">
                                <div className="text-xs text-gray-400 mb-1">Тариф</div>
                                <div className="font-semibold text-gray-900 uppercase">
                                  {selectedUser.activeSub.tier || selectedUser.activeSub.plan}
                                </div>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-green-100">
                                <div className="text-xs text-gray-400 mb-1">Стоимость</div>
                                <div className="font-semibold text-gray-900">
                                  {selectedUser.activeSub.amount_rub?.toLocaleString('ru-RU')} ₽/мес
                                </div>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-green-100">
                                <div className="text-xs text-gray-400 mb-1">Начало</div>
                                <div className="font-semibold text-gray-900">
                                  {formatDateShort(selectedUser.activeSub.started_at)}
                                </div>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-green-100">
                                <div className="text-xs text-gray-400 mb-1">Истекает</div>
                                <div className="font-semibold text-gray-900">
                                  {formatDateShort(selectedUser.activeSub.expires_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Premium info (если есть) */}
                        {selectedUser.premiumPlan && (
                          <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                              <Crown size={18} className="text-orange-500 fill-orange-500" />
                              Premium (legacy)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <div className="text-xs text-gray-400 mb-1">Тариф</div>
                                <div className="font-semibold text-gray-900">{selectedUser.premiumPlan}</div>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <div className="text-xs text-gray-400 mb-1">
                                  {(() => { const d = getDaysRemaining(selectedUser.premiumExpiresAt); return d !== null && d <= 0 ? 'Истёк' : 'Осталось' })()}
                                </div>
                                <div className={cn(
                                  "font-semibold",
                                  (() => {
                                    const d = getDaysRemaining(selectedUser.premiumExpiresAt)
                                    if (d === null) return 'text-gray-600'
                                    return d <= 0 ? 'text-red-600' : d <= 7 ? 'text-amber-600' : 'text-green-600'
                                  })()
                                )}>
                                  {(() => {
                                    const d = getDaysRemaining(selectedUser.premiumExpiresAt)
                                    if (d === null) return '∞'
                                    return d <= 0 ? `${Math.abs(d)} дн. назад` : `${d} дн.`
                                  })()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Даты */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <Clock size={12} />
                              Первый платёж
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {selectedUser.firstPaymentAt ? formatDateShort(selectedUser.firstPaymentAt) : '—'}
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                              <Clock size={12} />
                              Последний платёж
                            </div>
                            <div className="font-semibold text-gray-900 text-sm">
                              {selectedUser.lastPaymentAt ? formatDateShort(selectedUser.lastPaymentAt) : '—'}
                            </div>
                          </div>
                        </div>

                        {/* CTA кнопки */}
                        {selectedUser.premiumId && (
                          <>
                            <button
                              onClick={() => {
                                setIsEditMode(true)
                                setEditPlan(selectedUser.premiumPlan || 'FREE')
                                setEditExpiresAt(selectedUser.premiumExpiresAt ? new Date(selectedUser.premiumExpiresAt).toISOString().split('T')[0] : '')
                              }}
                              className="w-full py-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-2xl transition-all border border-gray-200 hover:shadow-lg flex items-center justify-center gap-2 group"
                            >
                              <Pencil size={18} className="group-hover:scale-110 transition-transform text-orange-500" />
                              Редактировать тариф
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Удалить клиента из premium?') && selectedUser.premiumId) {
                                  deleteClient.mutate(selectedUser.premiumId)
                                }
                              }}
                              className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-2xl transition-all border border-red-100 hover:shadow-lg hover:shadow-red-500/10 flex items-center justify-center gap-2 group"
                            >
                              <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                              Удалить из premium
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Tab: Платежи */}
                {activeModalTab === 'payments' && (
                  <div className="space-y-6">
                    <button
                      onClick={() => setShowAddPaymentModal(true)}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Добавить платёж
                    </button>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4 px-1">История платежей</h4>
                      <div className="space-y-3">
                        {getClientPayments(selectedUser.telegram_id).length > 0 ? (
                          getClientPayments(selectedUser.telegram_id).map((payment) => (
                            <div key={payment.id} className="group bg-white hover:bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-colors flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-green-50 border-green-100 text-green-600">
                                  <CreditCard size={20} />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {payment.amount.toLocaleString('ru-RU')} {payment.currency === 'RUB' ? '₽' : payment.currency === 'USD' ? '$' : '€'}
                                    <span className="text-gray-400 font-normal ml-2 text-xs">
                                      {new Date(payment.paid_at).toLocaleDateString('ru-RU')}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 max-w-[180px] truncate">
                                    {payment.source} • {payment.payment_method}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600">
                                  +{payment.amount.toLocaleString('ru-RU')} {payment.currency === 'RUB' ? '₽' : payment.currency}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <CreditCard size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-gray-400 text-sm">Нет платежей</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== МОДАЛКА ДОБАВЛЕНИЯ ПЛАТЕЖА ========== */}
      {showAddPaymentModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setShowAddPaymentModal(false)}>
          <div className="bg-white/90 backdrop-blur-md rounded-[28px] p-6 w-full max-w-md shadow-2xl border border-white/20 ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Добавить платёж</h2>
              <button onClick={() => setShowAddPaymentModal(false)} className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Сумма</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  placeholder="1499"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Валюта</label>
                  <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)} className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm">
                    <option value="RUB">₽ RUB</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Источник</label>
                  <select value={paymentSource} onChange={(e) => setPaymentSource(e.target.value)} className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm">
                    <option value="manual">Manual</option>
                    <option value="lava">Lava</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Метод</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm">
                    <option value="card">Карта</option>
                    <option value="crypto">Крипто</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
              </div>
              <button
                onClick={() => {
                  if (paymentAmount && selectedUser) {
                    addPayment.mutate({
                      telegram_id: selectedUser.telegram_id,
                      amount: parseFloat(paymentAmount),
                      currency: paymentCurrency,
                      source: paymentSource,
                      payment_method: paymentMethod
                    })
                  }
                }}
                disabled={addPayment.isPending || !paymentAmount}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {addPayment.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus size={18} />}
                {addPayment.isPending ? 'Добавление...' : 'Добавить платёж'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
