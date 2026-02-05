import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Plus, Search, X, CreditCard, Pencil, Save, Crown, Loader2, Coins, Trash2
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

export function ClientsTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<PremiumClient | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<'info' | 'payments'>('info')
  const [editPlan, setEditPlan] = useState('')
  const [editExpiresAt, setEditExpiresAt] = useState('')

  // Форма платежа
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('RUB')
  const [paymentSource, setPaymentSource] = useState('manual')
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Форма нового клиента
  const [newClientTelegramId, setNewClientTelegramId] = useState('')
  const [newClientPlan, setNewClientPlan] = useState('FREE')

  // Загрузка клиентов
  const { data: clients, isLoading } = useQuery({
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

  // Загрузка всех пользователей для поиска username
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

  const usersMap = useMemo(() => {
    const map = new Map<number, { username?: string; first_name?: string }>()
    usersData?.forEach(u => {
      map.set(u.telegram_id, { username: u.username, first_name: u.first_name })
    })
    return map
  }, [usersData])

  // Загрузка платежей
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

  // Фильтруем платежи по выбранному месяцу
  const filteredPayments = useMemo(() => {
    if (!payments) return []
    return payments.filter(p => {
      const paidDate = new Date(p.paid_at)
      const monthStr = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`
      return monthStr === selectedMonth
    })
  }, [payments, selectedMonth])

  // Статистика платежей
  const paymentStats = useMemo(() => {
    return {
      RUB: filteredPayments.filter(p => p.currency === 'RUB').reduce((sum, p) => sum + p.amount, 0),
      USD: filteredPayments.filter(p => p.currency === 'USD').reduce((sum, p) => sum + p.amount, 0),
      EUR: filteredPayments.filter(p => p.currency === 'EUR').reduce((sum, p) => sum + p.amount, 0),
      totalPayments: filteredPayments.length,
      avgCheck: filteredPayments.length > 0
        ? Math.round(filteredPayments.reduce((sum, p) => sum + p.amount, 0) / filteredPayments.length)
        : 0
    }
  }, [filteredPayments])

  // Функция для получения статистики клиента из payments
  const getClientStats = (telegramId: number) => {
    if (!payments) return { totalPaid: 0, paymentsCount: 0, lastPaymentAt: null }
    const clientPayments = payments.filter(p => p.telegram_id === telegramId)
    return {
      totalPaid: clientPayments.reduce((sum, p) => sum + p.amount, 0),
      paymentsCount: clientPayments.length,
      lastPaymentAt: clientPayments[0]?.paid_at || null
    }
  }

  // Функция для получения платежей клиента
  const getClientPayments = (telegramId: number) => {
    if (!payments) return []
    return payments.filter(p => p.telegram_id === telegramId)
  }

  // Фильтрация клиентов
  const filteredClients = useMemo(() => {
    if (!clients) return []
    return clients.filter(client => {
      // Фильтр по тарифу
      if (filterPlan !== 'all' && client.plan?.toLowerCase() !== filterPlan.toLowerCase()) {
        return false
      }
      // Поиск
      if (!search) return true
      const searchLower = search.toLowerCase()
      const user = usersMap.get(client.telegram_id)
      return (
        client.telegram_id.toString().includes(search) ||
        client.username?.toLowerCase().includes(searchLower) ||
        user?.username?.toLowerCase().includes(searchLower) ||
        client.first_name?.toLowerCase().includes(searchLower) ||
        user?.first_name?.toLowerCase().includes(searchLower)
      )
    })
  }, [clients, search, filterPlan, usersMap])

  // Добавление клиента
  const addClient = useMutation({
    mutationFn: async ({ telegram_id, plan }: { telegram_id: number; plan: string }) => {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

      // Пробуем найти пользователя в таблице users
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

  // Добавление платежа
  const addPayment = useMutation({
    mutationFn: async (data: { telegram_id: number; amount: number; currency: string; source: string; payment_method: string }) => {
      const { error } = await supabase
        .from('payments')
        .insert(data)
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

  // Удаление клиента
  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('premium_clients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['premium-clients'] })
      setSelectedClient(null)
    }
  })

  // Обновление клиента
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['premium-clients'] })
      setSelectedClient(data)
      setIsEditMode(false)
    }
  })

  // Хелперы
  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  }

  const getDaysRemaining = (expiresAt?: string) => {
    if (!expiresAt) return null
    const now = new Date()
    const exp = new Date(expiresAt)
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'RUB') return `${amount.toLocaleString('ru-RU')} ₽`
    if (currency === 'USD') return `$${amount.toLocaleString('en-US')}`
    if (currency === 'EUR') return `€${amount.toLocaleString('en-US')}`
    return `${amount} ${currency}`
  }

  const getMonthOptions = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      months.push({ value, label })
    }
    return months
  }

  const activeClientsCount = clients?.filter(c => {
    const days = getDaysRemaining(c.expires_at)
    return days === null || days > 0
  }).length || 0

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-900 font-semibold text-sm">Платежи</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-gray-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl p-3 text-center text-white shadow-sm">
            <div className="text-sm font-bold">{paymentStats.RUB.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-sm font-bold text-gray-900">${paymentStats.USD}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center border border-gray-100">
            <div className="text-sm font-bold text-gray-900">€{paymentStats.EUR}</div>
          </div>
        </div>

        <div className="flex justify-between text-xs text-gray-500 font-medium">
          <span>Активных: <span className="text-gray-900">{activeClientsCount}</span></span>
          <span>Оплат: <span className="text-gray-900">{paymentStats.totalPayments}</span></span>
          <span>Ср.чек: <span className="text-gray-900">{paymentStats.avgCheck.toLocaleString('ru-RU')}</span></span>
        </div>
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
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-3 py-3 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-100"
        >
          <option value="all">Все</option>
          <option value="FREE">FREE</option>
          <option value="PRO">PRO</option>
          <option value="BUSINESS">BUSINESS</option>
        </select>
        <button
          onClick={() => setShowAddClientModal(true)}
          className="px-4 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl shadow-sm hover:shadow-lg transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Список клиентов */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
          <p className="font-medium animate-pulse">Загрузка клиентов...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{clients?.length === 0 ? 'Нет клиентов' : 'Ничего не найдено'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClients.map((client) => {
            const user = usersMap.get(client.telegram_id)
            const displayName = client.username || user?.username || client.first_name || user?.first_name
            const daysLeft = getDaysRemaining(client.expires_at)
            const stats = getClientStats(client.telegram_id)

            return (
              <div
                key={client.id}
                onClick={() => {
                  setSelectedClient(client)
                  setActiveModalTab('info')
                  setIsEditMode(false)
                }}
                className={cn(
                  "bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:border-orange-100 hover:translate-y-[-2px] transition-all duration-200 relative group",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                        {(displayName?.[0] || '?').toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2 text-base">
                        {displayName ? `@${displayName}` : `ID: ${client.telegram_id}`}
                        <div className="flex-shrink-0 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                          <Crown size={10} fill="currentColor" />
                          {client.plan}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {client.telegram_id}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      daysLeft === null ? "bg-gray-100 text-gray-500" :
                        daysLeft <= 0 ? "bg-red-100 text-red-700" :
                          daysLeft <= 7 ? "bg-amber-100 text-amber-700" :
                            "bg-green-100 text-green-700"
                    )}>
                      {daysLeft === null ? '∞' : daysLeft <= 0 ? 'Истёк' : `${daysLeft} дн.`}
                    </span>
                    {stats.totalPaid > 0 && (
                      <span className="text-[10px] text-gray-400 px-2 bg-gray-50 rounded-full">
                        {stats.totalPaid.toLocaleString('ru-RU')} ₽
                      </span>
                    )}
                    {client.source && (
                      <span className="text-[10px] text-gray-400 px-2 bg-gray-50 rounded-full">
                        {client.source}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Счётчик */}
      {filteredClients.length > 0 && (
        <div className="text-xs text-gray-400 font-medium text-center uppercase tracking-widest pt-4 opacity-60">
          Показано {filteredClients.length} из {clients?.length || 0}
        </div>
      )}

      {/* Модалка добавления клиента */}
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
                  <option value="PRO">PRO (2900₽/мес)</option>
                  <option value="BUSINESS">BUSINESS (9900₽/мес)</option>
                </select>
              </div>

              <button
                onClick={() => {
                  if (newClientTelegramId) {
                    addClient.mutate({
                      telegram_id: parseInt(newClientTelegramId),
                      plan: newClientPlan
                    })
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

      {/* Модалка деталей клиента (Liquid Glass) */}
      {selectedClient && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => { setSelectedClient(null); setIsEditMode(false) }}
        >
          <div
            className="bg-white/90 backdrop-blur-md rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200 border border-white/20 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-6 relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg ring-4 ring-white flex items-center justify-center text-white text-2xl font-bold">
                      {((selectedClient.username || selectedClient.first_name)?.[0] || '?').toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {selectedClient.username ? `@${selectedClient.username}` : selectedClient.first_name || `ID: ${selectedClient.telegram_id}`}
                    </h3>
                    <div className="text-gray-500 font-medium mt-1">
                      {selectedClient.telegram_id}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-sm">
                        <Crown size={10} fill="currentColor" />
                        {selectedClient.plan}
                      </span>
                      {(() => {
                        const days = getDaysRemaining(selectedClient.expires_at)
                        return (
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            days === null ? "bg-gray-100 text-gray-500" :
                              days <= 0 ? "bg-red-100 text-red-700" :
                                days <= 7 ? "bg-amber-100 text-amber-700" :
                                  "bg-green-100 text-green-700"
                          )}>
                            {days === null ? '∞' : days <= 0 ? `Истёк ${Math.abs(days)} дн.` : `${days} дн.`}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedClient(null); setIsEditMode(false) }}
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
                  { id: 'info', label: 'Инфо', icon: CreditCard },
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

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1 bg-white/50 relative">
              <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">

                {/* Tab: Инфо */}
                {activeModalTab === 'info' && (
                  <div className="space-y-6">
                    {/* Режим редактирования */}
                    {isEditMode ? (
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
                            <option value="STARTER">STARTER (499₽/мес)</option>
                            <option value="PRO">PRO (1499₽/мес)</option>
                            <option value="BUSINESS">BUSINESS (4999₽/мес)</option>
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
                              if (editExpiresAt) {
                                updateClient.mutate({
                                  id: selectedClient.id,
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
                        {/* Основная статистика */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-2 text-orange-100 mb-2 font-medium">
                              <CreditCard size={18} />
                              <span>Оплачено</span>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">
                              {getClientStats(selectedClient.telegram_id).totalPaid.toLocaleString('ru-RU')}
                            </div>
                            <div className="text-xs text-orange-100 mt-1 opacity-80">рублей всего</div>
                          </div>
                          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 text-gray-500 mb-2 font-medium">
                              <Coins size={18} className="text-blue-500" />
                              <span>Платежей</span>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 tracking-tight">
                              {getClientStats(selectedClient.telegram_id).paymentsCount}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">за всё время</div>
                          </div>
                        </div>

                        {/* Детали тарифа */}
                        <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                          <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                            <Crown size={18} className="text-orange-500 fill-orange-500" />
                            Информация о тарифе
                          </h4>
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                              <span className="text-sm text-gray-500">Тариф</span>
                              <span className="font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{selectedClient.plan}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                              <span className="text-sm text-gray-500">Осталось</span>
                              {(() => {
                                const days = getDaysRemaining(selectedClient.expires_at)
                                return (
                                  <span className={cn(
                                    "font-medium px-2 py-1 rounded text-sm",
                                    days === null ? "text-gray-600 bg-gray-100" :
                                      days <= 0 ? "text-red-600 bg-red-50" :
                                        days <= 7 ? "text-amber-600 bg-amber-50" : "text-green-600 bg-green-50"
                                  )}>
                                    {days === null ? '∞' : days <= 0 ? `Истёк ${Math.abs(days)} дн. назад` : `${days} дн.`}
                                  </span>
                                )
                              })()}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <div className="text-xs text-gray-400 mb-1">Истекает</div>
                                <div className="font-semibold text-gray-900">
                                  {selectedClient.expires_at
                                    ? new Date(selectedClient.expires_at).toLocaleDateString('ru-RU')
                                    : '—'
                                  }
                                </div>
                              </div>
                              <div className="bg-white rounded-xl p-3 border border-gray-100">
                                <div className="text-xs text-gray-400 mb-1">Начало</div>
                                <div className="font-semibold text-gray-900">{formatDateShort(selectedClient.created_at)}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Кнопка редактирования */}
                        <button
                          onClick={() => {
                            setIsEditMode(true)
                            setEditPlan(selectedClient.plan)
                            setEditExpiresAt(selectedClient.expires_at ? new Date(selectedClient.expires_at).toISOString().split('T')[0] : '')
                          }}
                          className="w-full py-4 bg-white hover:bg-gray-50 text-gray-900 font-semibold rounded-2xl transition-all border border-gray-200 hover:shadow-lg flex items-center justify-center gap-2 group"
                        >
                          <Pencil size={18} className="group-hover:scale-110 transition-transform text-orange-500" />
                          Редактировать тариф
                        </button>

                        {/* Удаление */}
                        <button
                          onClick={() => {
                            if (confirm('Удалить клиента?')) {
                              deleteClient.mutate(selectedClient.id)
                            }
                          }}
                          className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-2xl transition-all border border-red-100 hover:shadow-lg hover:shadow-red-500/10 flex items-center justify-center gap-2 group"
                        >
                          <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                          Удалить клиента
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Tab: Платежи */}
                {activeModalTab === 'payments' && (
                  <div className="space-y-6">
                    {/* Кнопка добавления */}
                    <button
                      onClick={() => setShowAddPaymentModal(true)}
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={18} />
                      Добавить платёж
                    </button>

                    {/* История платежей */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-4 px-1">История платежей</h4>
                      <div className="space-y-3">
                        {getClientPayments(selectedClient.telegram_id).length > 0 ? (
                          getClientPayments(selectedClient.telegram_id).map((payment) => (
                            <div key={payment.id} className="group bg-white hover:bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-colors flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-green-50 border-green-100 text-green-600">
                                  <CreditCard size={20} />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 text-sm">
                                    {formatAmount(payment.amount, payment.currency)}
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
                                  +{formatAmount(payment.amount, payment.currency)}
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

      {/* Модалка добавления платежа */}
      {showAddPaymentModal && selectedClient && (
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
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Валюта</label>
                <select
                  value={paymentCurrency}
                  onChange={(e) => setPaymentCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Источник</label>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="manual">Вручную</option>
                  <option value="lava.top">Lava.top</option>
                  <option value="crypto">Crypto</option>
                  <option value="bank">Банк</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Метод оплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="card">Карта</option>
                  <option value="crypto">Крипта</option>
                  <option value="sbp">СБП</option>
                  <option value="cash">Наличные</option>
                </select>
              </div>

              <button
                onClick={() => {
                  if (paymentAmount && selectedClient) {
                    addPayment.mutate({
                      telegram_id: selectedClient.telegram_id,
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
                {addPayment.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard size={18} />}
                {addPayment.isPending ? 'Сохранение...' : 'Сохранить платёж'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
