import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
  Plus, Search, X, ChevronRight, CreditCard
} from 'lucide-react'

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

  // Форма платежа
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState('RUB')
  const [paymentSource, setPaymentSource] = useState('manual')
  const [paymentMethod, setPaymentMethod] = useState('card')

  // Форма нового клиента
  const [newClientTelegramId, setNewClientTelegramId] = useState('')
  const [newClientPlan, setNewClientPlan] = useState('BASIC')

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
      USDT: filteredPayments.filter(p => p.currency === 'USDT').reduce((sum, p) => sum + p.amount, 0),
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
      setNewClientPlan('BASIC')
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
    if (currency === 'USDT') return `${amount.toLocaleString('en-US')} USDT`
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
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        {/* Заголовок с выбором месяца */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-900 font-medium text-sm">Платежи</span>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 text-gray-900 text-xs"
          >
            {getMonthOptions().map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Суммы по валютам - 2x2 */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-100 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{paymentStats.RUB.toLocaleString('ru-RU')} ₽</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">${paymentStats.USD}</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{paymentStats.USDT} USDT</div>
          </div>
          <div className="bg-gray-100 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">€{paymentStats.EUR}</div>
          </div>
        </div>

        {/* Мини-статы */}
        <div className="flex justify-between text-xs text-gray-600">
          <span>Активных: <span className="text-gray-900">{activeClientsCount}</span></span>
          <span>Оплат: <span className="text-gray-900">{paymentStats.totalPayments}</span></span>
          <span>Ср.чек: <span className="text-gray-900">{paymentStats.avgCheck.toLocaleString('ru-RU')}</span></span>
        </div>
      </div>

      {/* Поиск и добавление */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-gray-300"
          />
        </div>
        <select
          value={filterPlan}
          onChange={(e) => setFilterPlan(e.target.value)}
          className="px-2 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm"
        >
          <option value="all">Все</option>
          <option value="BASIC">BASIC</option>
          <option value="PRO">PRO</option>
          <option value="VIP">VIP</option>
          <option value="ELITE">ELITE</option>
        </select>
        <button
          onClick={() => setShowAddClientModal(true)}
          className="px-3 py-2.5 bg-green-600 text-gray-900 rounded-xl"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Список клиентов */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {clients?.length === 0 ? 'Нет клиентов' : 'Ничего не найдено'}
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
                onClick={() => setSelectedClient(client)}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors cursor-pointer"
              >
                {/* Шапка карточки */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg text-gray-900">
                      {(displayName?.[0] || '?').toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {displayName ? `@${displayName}` : `ID: ${client.telegram_id}`}
                      </div>
                      <div className="text-xs text-gray-500">{client.telegram_id}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                    {client.plan}
                  </span>
                </div>

                {/* Осталось и истекает */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-100/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Осталось</div>
                    <div className={`text-lg font-bold ${daysLeft === null ? 'text-gray-600' :
                      daysLeft <= 0 ? 'text-red-500' :
                        daysLeft <= 7 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                      {daysLeft === null ? '∞' : daysLeft <= 0 ? 'Истёк' : `${daysLeft} дн.`}
                    </div>
                  </div>
                  <div className="bg-gray-100/50 rounded-lg p-2">
                    <div className="text-xs text-gray-500">Истекает</div>
                    <div className="text-gray-900 font-medium">
                      {client.expires_at
                        ? new Date(client.expires_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                        : '—'
                      }
                    </div>
                  </div>
                </div>

                {/* Оплачено и платежей */}
                <div className="flex items-center justify-between text-sm mb-3">
                  <div className="text-gray-600">
                    Оплачено: <span className="text-gray-900">{stats.totalPaid.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="text-gray-600">
                    Платежей: <span className="text-gray-900">{stats.paymentsCount}</span>
                  </div>
                </div>

                {/* Теги */}
                <div className="flex items-center gap-2 flex-wrap">
                  {client.source && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {client.source}
                    </span>
                  )}
                </div>

                {/* Подсказка */}
                <div className="text-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-1">
                  Нажмите для деталей <ChevronRight className="w-3 h-3" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Модалка добавления клиента */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Добавить клиента</h2>
              <button onClick={() => setShowAddClientModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Telegram ID</label>
                <input
                  type="number"
                  value={newClientTelegramId}
                  onChange={(e) => setNewClientTelegramId(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Тариф</label>
                <select
                  value={newClientPlan}
                  onChange={(e) => setNewClientPlan(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="BASIC">BASIC</option>
                  <option value="PRO">PRO</option>
                  <option value="VIP">VIP</option>
                  <option value="ELITE">ELITE</option>
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
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {addClient.isPending ? 'Добавление...' : 'Добавить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка деталей клиента */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-gray-200 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Шапка */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl text-gray-900">
                  {((selectedClient.username || selectedClient.first_name)?.[0] || '?').toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-lg">
                    {selectedClient.username ? `@${selectedClient.username}` : selectedClient.first_name || `ID: ${selectedClient.telegram_id}`}
                  </div>
                  <div className="text-sm text-gray-500">{selectedClient.telegram_id}</div>
                </div>
              </div>
              <button onClick={() => setSelectedClient(null)} className="text-gray-500 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Основная информация */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Тариф</div>
                  <div className="text-gray-900 font-medium">{selectedClient.plan}</div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Осталось</div>
                  {(() => {
                    const days = getDaysRemaining(selectedClient.expires_at)
                    return (
                      <div className={`font-medium ${days === null ? 'text-gray-600' :
                        days <= 0 ? 'text-red-500' :
                          days <= 7 ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                        {days === null ? '∞' : days <= 0 ? `Истёк ${Math.abs(days)} дн. назад` : `${days} дн.`}
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Истекает</div>
                  <div className="text-gray-900">
                    {selectedClient.expires_at
                      ? new Date(selectedClient.expires_at).toLocaleDateString('ru-RU')
                      : '—'
                    }
                  </div>
                </div>
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="text-xs text-gray-500 mb-1">Начало</div>
                  <div className="text-gray-900">{formatDateShort(selectedClient.created_at)}</div>
                </div>
              </div>

              {/* Статистика платежей */}
              {(() => {
                const stats = getClientStats(selectedClient.telegram_id)
                return (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Всего оплачено</div>
                      <div className="text-gray-900 font-medium">{stats.totalPaid.toLocaleString('ru-RU')} ₽</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Платежей</div>
                      <div className="text-gray-900 font-medium">{stats.paymentsCount}</div>
                    </div>
                  </div>
                )
              })()}

              {/* История платежей */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-gray-900 font-medium">История платежей</h4>
                  <button
                    onClick={() => setShowAddPaymentModal(true)}
                    className="text-green-500 hover:text-green-400 text-sm flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить платёж
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getClientPayments(selectedClient.telegram_id).length > 0 ? (
                    getClientPayments(selectedClient.telegram_id).map((payment) => (
                      <div key={payment.id} className="bg-gray-100 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-green-400 font-medium">{formatAmount(payment.amount, payment.currency)}</div>
                          <div className="text-xs text-gray-500">{payment.source} • {payment.payment_method}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(payment.paid_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">Нет платежей</div>
                  )}
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowAddPaymentModal(true)}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-gray-900 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Добавить платёж
                </button>
                <button
                  onClick={() => {
                    if (confirm('Удалить клиента?')) {
                      deleteClient.mutate(selectedClient.id)
                    }
                  }}
                  className="py-3 px-4 bg-red-600/20 hover:bg-red-600/30 text-red-500 rounded-lg transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка добавления платежа */}
      {showAddPaymentModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Добавить платёж</h2>
              <button onClick={() => setShowAddPaymentModal(false)} className="text-gray-500 hover:text-gray-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Сумма</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
                  placeholder="10000"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Валюта</label>
                <select
                  value={paymentCurrency}
                  onChange={(e) => setPaymentCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="RUB">RUB (₽)</option>
                  <option value="USD">USD ($)</option>
                  <option value="USDT">USDT</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Источник</label>
                <select
                  value={paymentSource}
                  onChange={(e) => setPaymentSource(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
                >
                  <option value="manual">Вручную</option>
                  <option value="lava.top">Lava.top</option>
                  <option value="crypto">Crypto</option>
                  <option value="bank">Банк</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Метод оплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg text-gray-900"
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
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-gray-900 font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {addPayment.isPending ? 'Сохранение...' : 'Сохранить платёж'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
