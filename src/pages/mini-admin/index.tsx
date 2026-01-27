import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { isAdmin as checkIsAdmin } from '@/config/admins'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  BarChart3,
  GraduationCap,
  CreditCard,
  Search,
  Trash2,
  Plus,
  Shield,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  created_at: string
  last_active_at: string | null
}

interface PremiumClient {
  id: string
  telegram_id: number
  plan: string
  created_at: string
  expires_at?: string
  total_paid?: number
  payments_count?: number
  source?: string
  payment_method?: string
  currency?: string
  last_payment_at?: string
  has_channel_access?: boolean
  has_chat_access?: boolean
}

interface Student {
  id: string
  user_id: string
  tariff_slug: string
  is_active: boolean
  expires_at: string | null
  created_at: string
  user?: User
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

type Tab = 'users' | 'add-client' | 'add-student' | 'analytics'

export default function MiniAdmin() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const telegramUser = getTelegramUser()

  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [search, setSearch] = useState('')
  const [newClientId, setNewClientId] = useState('')
  const [newClientPlan, setNewClientPlan] = useState('basic')
  const [newStudentId, setNewStudentId] = useState('')
  const [newStudentTariff, setNewStudentTariff] = useState('standard')
  const [newUserId, setNewUserId] = useState('')

  // Premium tab states
  const [premiumSearch, setPremiumSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [showAddClientModal, setShowAddClientModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<PremiumClient | null>(null)
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false)
  const [newPaymentAmount, setNewPaymentAmount] = useState('')
  const [newPaymentCurrency, setNewPaymentCurrency] = useState('RUB')
  const [newPaymentSource, setNewPaymentSource] = useState('manual')
  const [newPaymentMethod, setNewPaymentMethod] = useState('card')

  // Проверяем доступ
  const isAdmin = checkIsAdmin(telegramUser?.id)

  // Загрузка пользователей
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['mini-admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as User[]
    },
    enabled: isAdmin
  })

  // Загрузка платных клиентов
  const { data: premiumClients = [] } = useQuery<PremiumClient[]>({
    queryKey: ['mini-admin-premium'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as PremiumClient[]
    },
    enabled: isAdmin
  })

  // Загрузка студентов (из user_tariffs)
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['mini-admin-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_tariffs')
        .select('id, user_id, tariff_slug, is_active, expires_at, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Student[]
    },
    enabled: isAdmin
  })

  // Загрузка платежей
  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['mini-admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('paid_at', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
    enabled: isAdmin
  })

  // Добавление платного клиента
  const addClient = useMutation({
    mutationFn: async ({ telegram_id, plan }: { telegram_id: number; plan: string }) => {
      // expires_at - через 1 год
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
      queryClient.invalidateQueries({ queryKey: ['mini-admin-premium'] })
      setNewClientId('')
      setNewClientPlan('basic')
      toast.success('Клиент добавлен!')
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error?.message || JSON.stringify(error)))
    }
  })

  // Удаление платного клиента
  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('premium_clients')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-premium'] })
    }
  })

  // Добавление платежа
  const addPayment = useMutation({
    mutationFn: async ({ telegram_id, amount, currency, source, payment_method }: {
      telegram_id: number
      amount: number
      currency: string
      source: string
      payment_method: string
    }) => {
      const { data, error } = await supabase
        .from('payments')
        .insert({ telegram_id, amount, currency, source, payment_method })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-payments'] })
      setNewPaymentAmount('')
      setNewPaymentCurrency('RUB')
      setNewPaymentSource('manual')
      setNewPaymentMethod('card')
      setShowAddPaymentModal(false)
      toast.success('Платёж добавлен!')
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error?.message || JSON.stringify(error)))
    }
  })

  // Добавление студента (создаём user + user_tariff)
  const addStudent = useMutation({
    mutationFn: async ({ telegram_id, tariff }: { telegram_id: number; tariff: string }) => {
      // Проверяем, есть ли уже пользователь
      let userId: string

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegram_id)
        .single()

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Создаём пользователя
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ telegram_id })
          .select()
          .single()
        if (userError) throw userError
        userId = newUser.id
      }

      // Создаём тариф
      const { data, error } = await supabase
        .from('user_tariffs')
        .insert({ user_id: userId, tariff_slug: tariff, is_active: true })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-students'] })
      queryClient.invalidateQueries({ queryKey: ['mini-admin-users'] })
      setNewStudentId('')
      setNewStudentTariff('standard')
      toast.success('Ученик добавлен!')
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error?.message || JSON.stringify(error)))
    }
  })

  // Удаление студента (из user_tariffs)
  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_tariffs')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-students'] })
    }
  })

  // Добавление пользователя
  const addUser = useMutation({
    mutationFn: async (telegram_id: number) => {
      const { data, error } = await supabase
        .from('users')
        .insert({ telegram_id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-users'] })
      setNewUserId('')
      toast.success('Пользователь добавлен!')
    },
    onError: (error: any) => {
      toast.error('Ошибка: ' + (error?.message || JSON.stringify(error)))
    }
  })

  // Удаление пользователя
  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-users'] })
    }
  })

  // Фильтрация пользователей
  const filteredUsers = users.filter((user: User) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      user.telegram_id.toString().includes(search) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower)
    )
  })

  // Проверка онлайн
  const isOnline = (dateStr: string | null) => {
    if (!dateStr) return false
    return Date.now() - new Date(dateStr).getTime() < 300000
  }

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Форматирование даты коротко (дд.мм)
  const formatDateShort = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  }

  // Дней осталось до истечения
  const getDaysRemaining = (expiresAt: string | undefined) => {
    if (!expiresAt) return null
    const now = new Date()
    const expires = new Date(expiresAt)
    const diff = expires.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Форматирование суммы
  const formatAmount = (amount: number | undefined) => {
    if (!amount) return '0'
    return amount.toLocaleString('ru-RU')
  }

  // Месяцы для селектора
  const getMonthOptions = () => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const label = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return months
  }

  // Фильтруем платежи по выбранному месяцу
  const filteredPayments = useMemo(() => {
    return payments.filter((p: Payment) => {
      const paymentDate = new Date(p.paid_at)
      const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
      return paymentMonth === selectedMonth
    })
  }, [payments, selectedMonth])

  // Статистика платежей по валютам
  const paymentStats = useMemo(() => ({
    RUB: filteredPayments.filter(p => p.currency === 'RUB').reduce((sum, p) => sum + p.amount, 0),
    USD: filteredPayments.filter(p => p.currency === 'USD').reduce((sum, p) => sum + p.amount, 0),
    USDT: filteredPayments.filter(p => p.currency === 'USDT').reduce((sum, p) => sum + p.amount, 0),
    EUR: filteredPayments.filter(p => p.currency === 'EUR').reduce((sum, p) => sum + p.amount, 0),
    totalPayments: filteredPayments.length,
    avgCheck: filteredPayments.length > 0
      ? Math.round(filteredPayments.reduce((sum, p) => sum + p.amount, 0) / filteredPayments.length)
      : 0
  }), [filteredPayments])

  // Платежи клиента (для детальной карточки)
  const getClientPayments = (telegramId: number) => {
    return payments.filter(p => p.telegram_id === telegramId)
  }

  // Статистика клиента из платежей
  const getClientStats = (telegramId: number) => {
    const clientPayments = getClientPayments(telegramId)
    return {
      total_paid: clientPayments.reduce((sum, p) => sum + p.amount, 0),
      payments_count: clientPayments.length,
      last_payment_at: clientPayments.length > 0 ? clientPayments[0].paid_at : null,
      source: clientPayments.length > 0 ? clientPayments[0].source : null,
      payment_method: clientPayments.length > 0 ? clientPayments[0].payment_method : null
    }
  }

  // Создаём Map для быстрой проверки статусов
  const premiumMap = new Map<number, string>(premiumClients.map((c: PremiumClient) => [c.telegram_id, c.plan]))
  const usersMap = new Map<number, User>(users.map((u: User) => [u.telegram_id, u]))
  const usersMapById = new Map<string, User>(users.map((u: User) => [u.id, u]))

  // Фильтрация клиентов по поиску и тарифу
  const filteredPremiumClients = premiumClients.filter((client: PremiumClient) => {
    // Фильтр по тарифу
    if (filterPlan !== 'all' && client.plan?.toLowerCase() !== filterPlan.toLowerCase()) {
      return false
    }
    // Поиск
    if (!premiumSearch) return true
    const searchLower = premiumSearch.toLowerCase()
    const userInfo = usersMap.get(client.telegram_id)
    return (
      client.telegram_id.toString().includes(premiumSearch) ||
      userInfo?.username?.toLowerCase().includes(searchLower) ||
      userInfo?.first_name?.toLowerCase().includes(searchLower)
    )
  })

  // studentMap: telegram_id -> tariff_slug (нужно найти telegram_id через user_id)
  const studentMap = new Map<number, string>()
  students.forEach((s: Student) => {
    const user = usersMapById.get(s.user_id)
    if (user) {
      studentMap.set(user.telegram_id, s.tariff_slug)
    }
  })

  // Нет доступа
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Доступ запрещён</h1>
        <p className="text-zinc-400 text-center mb-6">
          У вас нет прав для просмотра этой страницы
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="px-6 py-3 bg-zinc-800 text-white rounded-lg"
        >
          Вернуться в профиль
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'users' as Tab, label: 'Пользователи', icon: Users },
    { id: 'add-client' as Tab, label: 'Клиенты', icon: CreditCard },
    { id: 'add-student' as Tab, label: 'Ученики', icon: GraduationCap },
    { id: 'analytics' as Tab, label: 'Статистика', icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-black text-white pb-24 pt-4">
      {/* Tabs */}
      <div className="bg-black border-b border-zinc-800">
        <div className="flex overflow-x-auto px-4 py-3 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400'
                }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* TAB: Пользователи */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Форма добавления пользователя */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus size={18} />
                Добавить пользователя
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Telegram ID"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
                <button
                  type="button"
                  disabled={!newUserId || addUser.isPending}
                  onClick={() => {
                    if (newUserId && !addUser.isPending) {
                      addUser.mutate(parseInt(newUserId))
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault()
                    if (newUserId && !addUser.isPending) {
                      addUser.mutate(parseInt(newUserId))
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 select-none touch-manipulation"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск по ID, username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500"
              />
            </div>

            {usersLoading ? (
              <div className="text-center py-8 text-zinc-500">Загрузка...</div>
            ) : (
              <div className="space-y-2">
                {filteredUsers.map((user: User) => {
                  const isPremium = premiumMap.has(user.telegram_id)
                  const isStudent = studentMap.has(user.telegram_id)
                  const online = isOnline(user.last_active_at)

                  return (
                    <div
                      key={user.id}
                      className={`p-4 rounded-lg border ${online
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-zinc-900 border-zinc-800'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium flex items-center gap-2">
                            {user.first_name || user.username || 'Без имени'}
                            {online && (
                              <span className="w-2 h-2 bg-green-500 rounded-full" />
                            )}
                          </div>
                          <div className="text-sm text-zinc-500 truncate">
                            {user.username ? `@${user.username}` : ''} • {user.telegram_id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">
                            {isPremium && (
                              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                {premiumMap.get(user.telegram_id)}
                              </span>
                            )}
                            {isStudent && (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                                {studentMap.get(user.telegram_id)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Удалить пользователя ${user.first_name || user.username || user.telegram_id}?`)) {
                                deleteUser.mutate(user.id)
                              }
                            }}
                            className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-zinc-600 mt-2">
                        Регистрация: {formatDate(user.created_at)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="text-center text-sm text-zinc-500">
              Всего: {users.length} пользователей
            </div>
          </div>
        )}

        {/* TAB: Платные клиенты */}
        {activeTab === 'add-client' && (
          <div className="space-y-4">
            {/* Статистика: заголовок + выбор месяца */}
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Статистика за:</span>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 pr-10 text-white cursor-pointer"
                >
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>

            {/* Статистика по валютам */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">RUB</div>
                <div className="text-xl font-bold text-white">{formatAmount(paymentStats.RUB)}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">USD</div>
                <div className="text-xl font-bold text-yellow-400">{formatAmount(paymentStats.USD)}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">USDT</div>
                <div className="text-xl font-bold text-green-400">{formatAmount(paymentStats.USDT)}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">EUR</div>
                <div className="text-xl font-bold text-yellow-400">{formatAmount(paymentStats.EUR)}</div>
              </div>
            </div>

            {/* Статистика: активных, оплат, ср. чек */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">Активных</div>
                <div className="text-2xl font-bold text-white">{premiumClients.length}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">Оплат</div>
                <div className="text-2xl font-bold text-green-400">{paymentStats.totalPayments}</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">Ср. чек</div>
                <div className="text-2xl font-bold text-green-400">{formatAmount(paymentStats.avgCheck)}</div>
              </div>
            </div>

            {/* Поиск + фильтр + кнопка добавления */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Поиск..."
                  value={premiumSearch}
                  onChange={(e) => setPremiumSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm"
              >
                <option value="all">Все</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="vip">VIP</option>
              </select>
              <button
                onClick={() => setShowAddClientModal(true)}
                className="w-12 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl flex items-center justify-center"
              >
                <Plus size={24} className="text-white" />
              </button>
            </div>

            {/* Список клиентов */}
            <div className="space-y-3">
              {filteredPremiumClients.map((client: PremiumClient) => {
                const userInfo = usersMap.get(client.telegram_id)
                const displayName = userInfo?.username ? `@${userInfo.username}` : (userInfo?.first_name || String(client.telegram_id))
                const daysRemaining = getDaysRemaining(client.expires_at)
                const expiresDate = client.expires_at ? formatDate(client.expires_at) : '—'
                const startDate = formatDateShort(client.created_at)
                const clientStats = getClientStats(client.telegram_id)

                return (
                  <div
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 cursor-pointer hover:border-zinc-600 transition-colors"
                  >
                    {/* Заголовок: аватар, имя, тариф */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                        {userInfo?.first_name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{displayName}</div>
                        <div className="text-sm text-zinc-500">{client.telegram_id}</div>
                      </div>
                      <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-medium">
                        {client.plan.toUpperCase()}
                      </span>
                    </div>

                    {/* Инфо: осталось, истекает */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <div className="text-xs text-zinc-500">Осталось</div>
                        <div className={`text-lg font-bold ${daysRemaining && daysRemaining > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {daysRemaining !== null ? `${daysRemaining} дн.` : '—'}
                        </div>
                      </div>
                      <div className="bg-zinc-800/50 rounded-lg p-2">
                        <div className="text-xs text-zinc-500">Истекает</div>
                        <div className="text-lg font-bold text-white">{expiresDate}</div>
                      </div>
                    </div>

                    {/* Инфо: оплачено, платежей, источник, начало */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Оплачено</span>
                        <span className="text-white">{formatAmount(clientStats.total_paid)} ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Платежей</span>
                        <span className="text-white">{clientStats.payments_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Источник</span>
                        <span className="text-white">{clientStats.source || client.source || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Начало</span>
                        <span className="text-white">{startDate}</span>
                      </div>
                    </div>

                    {/* Теги */}
                    <div className="flex items-center gap-2 mb-2">
                      {(clientStats.source || client.source) && (
                        <span className="px-2 py-1 bg-zinc-800 rounded-lg text-xs text-zinc-400">
                          💳 {clientStats.source || client.source}
                        </span>
                      )}
                    </div>

                    {/* Нажмите для деталей */}
                    <div className="flex items-center justify-center text-zinc-500 text-sm pt-2 border-t border-zinc-800">
                      Нажмите для деталей <ChevronRight size={16} />
                    </div>
                  </div>
                )
              })}

              {filteredPremiumClients.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  {premiumSearch ? 'Клиенты не найдены' : 'Нет платных клиентов'}
                </div>
              )}
            </div>

            {/* Модалка добавления клиента */}
            {showAddClientModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
                <div className="bg-zinc-900 rounded-t-2xl w-full max-w-lg p-4 space-y-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Добавить клиента</h3>
                    <button onClick={() => setShowAddClientModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Telegram ID</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="123456789"
                      value={newClientId}
                      onChange={(e) => setNewClientId(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Тариф</label>
                    <select
                      value={newClientPlan}
                      onChange={(e) => setNewClientPlan(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="basic">Basic</option>
                      <option value="classic">Classic</option>
                      <option value="pro">Pro</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!newClientId || addClient.isPending}
                    onClick={() => {
                      if (newClientId && !addClient.isPending) {
                        addClient.mutate({ telegram_id: parseInt(newClientId), plan: newClientPlan })
                        setShowAddClientModal(false)
                      }
                    }}
                    className="w-full py-4 bg-emerald-500 active:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {addClient.isPending ? 'Добавление...' : 'Добавить'}
                  </button>
                </div>
              </div>
            )}

            {/* Модалка деталей клиента */}
            {selectedClient && !showAddPaymentModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
                <div className="bg-zinc-900 rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                  {/* Заголовок */}
                  <div className="sticky top-0 bg-zinc-900 p-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center text-lg">
                        {usersMap.get(selectedClient.telegram_id)?.first_name?.[0] || '?'}
                      </div>
                      <div>
                        <div className="font-medium">
                          {usersMap.get(selectedClient.telegram_id)?.username
                            ? `@${usersMap.get(selectedClient.telegram_id)?.username}`
                            : usersMap.get(selectedClient.telegram_id)?.first_name || selectedClient.telegram_id}
                        </div>
                        <div className="text-sm text-zinc-500">{selectedClient.telegram_id}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-zinc-800 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Детальная информация */}
                    {(() => {
                      const stats = getClientStats(selectedClient.telegram_id)
                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Всего оплачено</span>
                            <span className="font-medium">{formatAmount(stats.total_paid)} ₽</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Платежей</span>
                            <span className="font-medium">{stats.payments_count}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Источник</span>
                            <span className="font-medium">{stats.source || selectedClient.source || '—'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Последний платёж</span>
                            <span className="font-medium">{stats.last_payment_at ? formatDate(stats.last_payment_at) : '—'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Метод оплаты</span>
                            <span className="font-medium">💳 {stats.payment_method || selectedClient.payment_method || 'Карта'}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b border-zinc-800">
                            <span className="text-zinc-500">Клиент с</span>
                            <span className="font-medium">{formatDate(selectedClient.created_at)}</span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Кнопки действий */}
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowAddPaymentModal(true)}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-medium flex items-center justify-center gap-2"
                      >
                        <CreditCard size={18} />
                        Добавить платёж
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Удалить клиента?')) {
                            deleteClient.mutate(selectedClient.id)
                            setSelectedClient(null)
                          }
                        }}
                        className="w-full py-4 bg-zinc-800 hover:bg-red-500/20 rounded-xl font-medium text-zinc-400 hover:text-red-400"
                      >
                        Удалить клиента
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Модалка добавления платежа */}
            {showAddPaymentModal && selectedClient && (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center">
                <div className="bg-zinc-900 rounded-t-2xl w-full max-w-lg p-4 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Добавить платёж</h3>
                    <button onClick={() => setShowAddPaymentModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="text-sm text-zinc-500 mb-2">
                    Клиент: {usersMap.get(selectedClient.telegram_id)?.username
                      ? `@${usersMap.get(selectedClient.telegram_id)?.username}`
                      : selectedClient.telegram_id}
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Сумма</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1000"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Валюта</label>
                    <select
                      value={newPaymentCurrency}
                      onChange={(e) => setNewPaymentCurrency(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="RUB">RUB (₽)</option>
                      <option value="USD">USD ($)</option>
                      <option value="USDT">USDT</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Источник</label>
                    <select
                      value={newPaymentSource}
                      onChange={(e) => setNewPaymentSource(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="manual">Вручную</option>
                      <option value="lava.top">lava.top</option>
                      <option value="stripe">Stripe</option>
                      <option value="crypto">Крипто</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-zinc-400 mb-1 block">Метод оплаты</label>
                    <select
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                    >
                      <option value="card">Карта</option>
                      <option value="crypto">Крипто</option>
                      <option value="cash">Наличные</option>
                      <option value="transfer">Перевод</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!newPaymentAmount || addPayment.isPending}
                    onClick={() => {
                      if (newPaymentAmount && selectedClient) {
                        addPayment.mutate({
                          telegram_id: selectedClient.telegram_id,
                          amount: parseFloat(newPaymentAmount),
                          currency: newPaymentCurrency,
                          source: newPaymentSource,
                          payment_method: newPaymentMethod
                        })
                      }
                    }}
                    className="w-full py-4 bg-emerald-500 active:bg-emerald-600 disabled:opacity-50 text-white rounded-lg font-medium"
                  >
                    {addPayment.isPending ? 'Добавление...' : 'Добавить платёж'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Ученики школы */}
        {activeTab === 'add-student' && (
          <div className="space-y-6">
            {/* Форма добавления */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <GraduationCap size={18} />
                Добавить ученика
              </h3>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Telegram ID</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456789"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Тариф</label>
                <select
                  value={newStudentTariff}
                  onChange={(e) => setNewStudentTariff(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <button
                type="button"
                disabled={!newStudentId || addStudent.isPending}
                onClick={() => {
                  if (newStudentId && !addStudent.isPending) {
                    addStudent.mutate({ telegram_id: parseInt(newStudentId), tariff: newStudentTariff })
                  }
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  if (newStudentId && !addStudent.isPending) {
                    addStudent.mutate({ telegram_id: parseInt(newStudentId), tariff: newStudentTariff })
                  }
                }}
                className="w-full py-4 bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2 select-none touch-manipulation"
              >
                <Plus size={18} />
                {addStudent.isPending ? 'Добавление...' : 'Добавить'}
              </button>
            </div>

            {/* Список учеников */}
            <div>
              <h3 className="font-semibold mb-3">Ученики лагеря ({students.length})</h3>
              <div className="space-y-2">
                {students.map((student: Student) => {
                  const userInfo = usersMapById.get(student.user_id)
                  const displayName = userInfo?.first_name || userInfo?.username || String(userInfo?.telegram_id || student.user_id)

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${student.tariff_slug === 'platinum'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {student.tariff_slug === 'platinum' ? 'PLATINUM' : 'STANDARD'}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-500">
                          {userInfo?.username ? `@${userInfo.username} • ` : ''}{userInfo?.telegram_id || '—'}
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">
                          Добавлен: {formatDate(student.created_at)}
                          {!student.is_active && (
                            <span className="text-red-400 ml-2">• неактивен</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить ученика ${displayName}?`)) {
                            deleteStudent.mutate(student.id)
                          }
                        }}
                        className="p-2 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Статистика */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-white">{users.length}</div>
                <div className="text-sm text-zinc-500">Всего пользователей</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-green-400">
                  {users.filter((u: User) => isOnline(u.last_active_at)).length}
                </div>
                <div className="text-sm text-zinc-500">Сейчас онлайн</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-yellow-400">{premiumClients.length}</div>
                <div className="text-sm text-zinc-500">Платных клиентов</div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-3xl font-bold text-blue-400">{students.length}</div>
                <div className="text-sm text-zinc-500">Учеников школы</div>
              </div>
            </div>

            {/* Активность за 24ч */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h3 className="font-semibold mb-3">За последние 24 часа</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Активных пользователей</span>
                  <span className="font-medium">
                    {users.filter((u: User) => {
                      if (!u.last_active_at) return false
                      return Date.now() - new Date(u.last_active_at).getTime() < 86400000
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Новых регистраций</span>
                  <span className="font-medium text-green-400">
                    {users.filter((u: User) => {
                      return Date.now() - new Date(u.created_at).getTime() < 86400000
                    }).length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
