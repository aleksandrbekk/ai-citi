
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getCoinBalance, addCoins } from '../../../lib/supabase'
import {
  Search, X, ChevronDown, CreditCard, Calendar, Gift, Loader2,
  Coins, Globe, User as UserIcon, Check, Star, Palette, ArrowUpCircle, ArrowDownCircle, Crown, Clock, Zap, Plus, Minus, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../../lib/utils'

interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  language_code: string | null
  photo_url: string | null
  created_at: string
  last_active_at: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
}

interface PremiumClient {
  telegram_id: number
  plan: string
}

interface CoinTransaction {
  id: string
  amount: number
  balance_after: number
  type: string
  description: string
  created_at: string
}

interface UserFullStats {
  subscription: {
    id: string
    plan: string
    status: string
    started_at: string
    expires_at: string | null
    next_charge_at: string | null
    amount_rub: number
    neurons_per_month: number
    days_remaining: number | null
  } | null
  purchased_styles: Array<{
    style_id: string
    price_paid: number
    purchased_at: string
  }>
  coin_stats: {
    balance: number
    total_spent: number
    total_earned: number
    spent_on_generations: number
    spent_on_styles: number
    earned_from_referrals: number
    earned_from_purchases: number
    earned_from_bonuses: number
    transactions_count: number
  }
  payment_stats: {
    total_paid_rub: number
    total_paid_usd: number
    payments_count: number
    last_payment_at: string | null
  }
}

export function AllUsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [coinsAmount, setCoinsAmount] = useState('')
  const [coinsReason, setCoinsReason] = useState('')
  const [isAddingCoins, setIsAddingCoins] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'coins' | 'subscription' | 'styles'>('info')
  const [subscriptionPlan, setSubscriptionPlan] = useState<'pro' | 'elite'>('pro')
  const [subscriptionMonths, setSubscriptionMonths] = useState(1)

  // Загрузка всех пользователей
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as User[]
    }
  })

  // Загрузка платных клиентов
  const { data: premiumClients } = useQuery({
    queryKey: ['premium-clients-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premium_clients')
        .select('telegram_id, plan')
      if (error) throw error
      return data as PremiumClient[]
    }
  })

  // Создаём Map для быстрой проверки платных клиентов
  const premiumMap = new Map(
    premiumClients?.map(c => [c.telegram_id, c.plan]) || []
  )

  // Баланс монет выбранного юзера
  const { data: userCoins, refetch: refetchCoins } = useQuery({
    queryKey: ['user-coins', selectedUser?.telegram_id],
    queryFn: async () => {
      if (!selectedUser) return 0
      return await getCoinBalance(selectedUser.telegram_id)
    },
    enabled: !!selectedUser
  })

  // Полная статистика пользователя
  const { data: userStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['user-full-stats', selectedUser?.telegram_id],
    queryFn: async () => {
      if (!selectedUser) return null
      const { data, error } = await supabase.rpc('admin_get_user_full_stats', {
        p_telegram_id: selectedUser.telegram_id
      })
      if (error) {
        console.error('Error fetching user stats:', error)
        return null
      }
      return data as UserFullStats
    },
    enabled: !!selectedUser
  })

  // Транзакции монет пользователя
  const { data: coinTransactions } = useQuery({
    queryKey: ['user-coin-transactions', selectedUser?.telegram_id],
    queryFn: async () => {
      if (!selectedUser) return []
      const { data, error } = await supabase.rpc('admin_get_user_coin_transactions', {
        p_telegram_id: selectedUser.telegram_id,
        p_limit: 20
      })
      if (error) {
        console.error('Error fetching transactions:', error)
        return []
      }
      return data as CoinTransaction[]
    },
    enabled: !!selectedUser && activeTab === 'coins'
  })

  // Удаление пользователя
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      toast.success('Пользователь удалён')
    }
  })

  // Активация подписки
  const activateSubscription = useMutation({
    mutationFn: async ({ telegramId, plan, months }: { telegramId: number; plan: string; months: number }) => {
      const { data, error } = await supabase.rpc('admin_activate_subscription', {
        p_telegram_id: telegramId,
        p_plan: plan,
        p_months: months
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Подписка ${data.plan.toUpperCase()} активирована! Начислено ${data.neurons_added} нейронов`)
        refetchStats()
        refetchCoins()
      } else {
        toast.error(data.error || 'Ошибка активации')
      }
    },
    onError: () => {
      toast.error('Ошибка активации подписки')
    }
  })

  // Деактивация подписки
  const deactivateSubscription = useMutation({
    mutationFn: async (telegramId: number) => {
      const { data, error } = await supabase.rpc('admin_deactivate_subscription', {
        p_telegram_id: telegramId
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Подписка деактивирована')
        refetchStats()
      }
    },
    onError: () => {
      toast.error('Ошибка деактивации')
    }
  })

  // Продление подписки
  const extendSubscription = useMutation({
    mutationFn: async ({ telegramId, months }: { telegramId: number; months: number }) => {
      const { data, error } = await supabase.rpc('admin_extend_subscription', {
        p_telegram_id: telegramId,
        p_months: months
      })
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Подписка продлена')
        refetchStats()
      } else {
        toast.error(data.error || 'Ошибка продления')
      }
    }
  })

  const handleDelete = (user: User) => {
    const name = user.first_name || user.username || user.telegram_id
    if (confirm(`Удалить пользователя "${name}" из базы ? `)) {
      deleteUser.mutate(user.id)
    }
  }

  // Начисление монет
  const handleAddCoins = async () => {
    if (!selectedUser || !coinsAmount) return

    const amount = parseInt(coinsAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Введите корректное количество монет')
      return
    }

    setIsAddingCoins(true)
    try {
      const result = await addCoins(
        selectedUser.telegram_id,
        Math.abs(amount),
        'bonus',
        coinsReason || 'Начислено администратором'
      )

      if (result.success) {
        toast.success(`Начислено ${Math.abs(amount)} монет`)
        setCoinsAmount('')
        setCoinsReason('')
        refetchCoins()
        refetchStats()
        queryClient.invalidateQueries({ queryKey: ['user-coin-transactions', selectedUser.telegram_id] })
      } else {
        toast.error(result.error || 'Ошибка операции')
      }
    } catch {
      toast.error('Ошибка операции с монетами')
    } finally {
      setIsAddingCoins(false)
    }
  }

  const handleSpendCoins = async () => {
    if (!selectedUser || !coinsAmount) return

    const amount = parseInt(coinsAmount)
    if (isNaN(amount) || amount === 0) {
      toast.error('Введите корректное количество монет')
      return
    }

    setIsAddingCoins(true)
    try {
      const { data, error } = await supabase.rpc('spend_coins', {
        p_telegram_id: selectedUser.telegram_id,
        p_amount: Math.abs(amount),
        p_type: 'correction',
        p_description: coinsReason || 'Списано администратором'
      })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data?.success) {
        toast.success(`Списано ${Math.abs(amount)} монет`)
        setCoinsAmount('')
        setCoinsReason('')
        refetchCoins()
        refetchStats()
        queryClient.invalidateQueries({ queryKey: ['user-coin-transactions', selectedUser.telegram_id] })
      } else {
        toast.error(data?.error || 'Недостаточно монет')
      }
    } catch {
      toast.error('Ошибка списания монет')
    } finally {
      setIsAddingCoins(false)
    }
  }

  // Открыть карточку юзера
  const handleOpenUserCard = (user: User) => {
    setSelectedUser(user)
    setActiveTab('info')
    setCoinsAmount('')
    setCoinsReason('')
  }

  // Закрыть карточку
  const handleCloseUserCard = () => {
    setSelectedUser(null)
    setCoinsAmount('')
    setCoinsReason('')
  }

  // Фильтрация по поиску
  const filteredUsers = users?.filter(user => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      user.telegram_id.toString().includes(search) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower)
    )
  })

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Проверка активности (онлайн за последние 5 минут)
  const isOnline = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const now = new Date()
    return now.getTime() - date.getTime() < 300000 // 5 минут
  }

  // Проверка недавней активности (за последний час)
  const isRecentlyActive = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const now = new Date()
    return now.getTime() - date.getTime() < 3600000 // 1 час
  }

  // Относительное время
  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Сейчас онлайн'
    if (diffMins < 60) return `${diffMins} мин.назад`
    if (diffHours < 24) return `${diffHours} ч.назад`
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дн.назад`
    return formatDate(dateStr)
  }

  // Форматирование типа транзакции
  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      generation: 'Генерация',
      purchase: 'Покупка',
      subscription: 'Подписка',
      referral: 'Реферал',
      bonus: 'Бонус',
      style_purchase: 'Стиль',
      admin_deduct: 'Списание'
    }
    return types[type] || type
  }

  return (
    <div className="space-y-4">
      {/* Статистика */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-gray-900 tracking-tight">{users?.length || 0}</div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Всего</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-blue-600 tracking-tight">
            {users?.filter(u => {
              const lastActive = u.last_active_at ? new Date(u.last_active_at) : null
              if (!lastActive) return false
              const now = new Date()
              return now.getTime() - lastActive.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Онлайн 24ч</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-green-600 tracking-tight">
            {users?.filter(u => {
              const created = new Date(u.created_at)
              const now = new Date()
              return now.getTime() - created.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Новых 24ч</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm shadow-sm border border-gray-100 rounded-2xl p-4">
          <div className="text-2xl font-bold text-orange-500 tracking-tight">
            {premiumClients?.length || 0}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">PRO</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
        <input
          type="text"
          placeholder="Поиск по ID, @username или имени..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white shadow-sm border border-gray-100 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-200 transition-all font-medium"
        />
      </div>

      {/* Список пользователей - карточки */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-orange-500" />
          <p className="font-medium animate-pulse">Загрузка базы пользователей...</p>
        </div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
          <Search size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{users?.length === 0 ? 'База пуста' : 'Пользователь не найден'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers?.map((user) => {
            const isPremium = premiumMap.has(user.telegram_id)
            const plan = premiumMap.get(user.telegram_id)
            const online = isOnline(user.last_active_at)
            const recentlyActive = isRecentlyActive(user.last_active_at)

            return (
              <div
                key={user.id}
                onClick={() => handleOpenUserCard(user)}
                className={cn(
                  "bg-white border text-left border-gray-100 rounded-2xl p-4 cursor-pointer hover:shadow-lg hover:border-orange-100 hover:translate-y-[-2px] transition-all duration-200 relative group",
                  online && "ring-2 ring-green-100 border-green-200",
                )}
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Аватар и имя */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt="" className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:shadow transition-shadow" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                          {user.first_name?.[0] || user.username?.[0] || '?'}
                        </div>
                      )}
                      {online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm ring-1 ring-green-100" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-gray-900 truncate flex items-center gap-2 text-base">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Без имени'}
                        {isPremium && (
                          <div className="flex-shrink-0 bg-gradient-to-r from-orange-400 to-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                            <Crown size={10} fill="currentColor" />
                            {plan}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 truncate mt-0.5">
                        {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
                      </div>
                    </div>
                  </div>

                  {/* Дата и стрелка */}
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium",
                      online ? "bg-green-100 text-green-700" :
                        recentlyActive ? "bg-blue-50 text-blue-600" :
                          "bg-gray-100 text-gray-500"
                    )}>
                      {getRelativeTime(user.last_active_at)}
                    </span>
                    {user.utm_source && (
                      <span className="text-[10px] text-gray-400 px-2 bg-gray-50 rounded-full">
                        {user.utm_source}
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
      {filteredUsers && (
        <div className="text-xs text-gray-400 font-medium text-center uppercase tracking-widest pt-4 opacity-60">
          Показано {filteredUsers.length} из {users?.length || 0}
        </div>
      )}

      {/* Модальное окно - Расширенная карточка юзера (Liquid Glass) */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={handleCloseUserCard}>
          <div
            className="bg-white/90 backdrop-blur-md rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col scale-100 animate-in zoom-in-95 duration-200 border border-white/20 ring-1 ring-black/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with background pattern */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 p-6 relative overflow-hidden flex-shrink-0">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex items-start justify-between relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {selectedUser.photo_url ? (
                      <img
                        src={selectedUser.photo_url}
                        alt=""
                        className="w-16 h-16 rounded-2xl object-cover shadow-lg ring-4 ring-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg ring-4 ring-white flex items-center justify-center text-white text-2xl font-bold">
                        {selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?'}
                      </div>
                    )}
                    {isOnline(selectedUser.last_active_at) && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full" />}
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Без имени'}
                    </h3>
                    <div className="text-gray-500 font-medium mt-1">
                      {selectedUser.username ? `@${selectedUser.username}` : `ID: ${selectedUser.telegram_id}`}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        ID: {selectedUser.telegram_id}
                      </span>
                      {selectedUser.utm_source && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {selectedUser.utm_source}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleCloseUserCard}
                  className="p-2 bg-gray-100/50 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Scrollable Tabs */}
            <div className="border-b border-gray-100 px-6 py-2 overflow-x-auto scrollbar-hide flex-shrink-0 bg-white/50">
              <div className="flex gap-2 min-w-max">
                {[
                  { id: 'info', label: 'Инфо', icon: UserIcon },
                  { id: 'coins', label: 'Монеты', icon: Coins },
                  { id: 'subscription', label: 'Подписка', icon: Crown },
                  { id: 'styles', label: 'Стили', icon: Palette }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                      activeTab === tab.id
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

            {/* Scrollable Content Area */}
            <div className="p-6 overflow-y-auto flex-1 bg-white/50 relative">
              {isLoadingStats ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
                  <span className="text-sm font-medium">Загружаем данные...</span>
                </div>
              ) : (
                <div className="animate-in slide-in-from-bottom-2 duration-300 space-y-6">
                  {/* Таб: Информация */}
                  {activeTab === 'info' && (
                    <div className="space-y-6">
                      {/* Основная статистика */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                          <div className="flex items-center gap-2 text-orange-100 mb-2 font-medium">
                            <Coins size={18} />
                            <span>Баланс</span>
                          </div>
                          <div className="text-3xl font-bold tracking-tight">
                            {userCoins ?? userStats?.coin_stats?.balance ?? 0}
                          </div>
                          <div className="text-xs text-orange-100 mt-1 opacity-80">монет доступно</div>
                        </div>
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                          <div className="flex items-center gap-2 text-gray-500 mb-2 font-medium">
                            <CreditCard size={18} className="text-blue-500" />
                            <span>LTV (Руб)</span>
                          </div>
                          <div className="text-3xl font-bold text-gray-900 tracking-tight">
                            {(userStats?.payment_stats?.total_paid_rub || 0).toLocaleString('ru-RU')}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">всего оплачено</div>
                        </div>
                      </div>

                      {/* Статистика монетизации */}
                      <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                          <Zap size={18} className="text-orange-500 fill-orange-500" />
                          Экономика пользователя
                        </h4>
                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                            <span className="text-sm text-gray-500">Потрачено всего</span>
                            <span className="font-medium text-red-600 bg-red-50 px-2 py-1 rounded text-sm">-{userStats?.coin_stats?.total_spent || 0}</span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200/50">
                            <span className="text-sm text-gray-500">Заработано всего</span>
                            <span className="font-medium text-green-600 bg-green-50 px-2 py-1 rounded text-sm">+{userStats?.coin_stats?.total_earned || 0}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-2">
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <div className="text-xs text-gray-400 mb-1">На генерации</div>
                              <div className="font-semibold text-gray-900">{userStats?.coin_stats?.spent_on_generations || 0}</div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-gray-100">
                              <div className="text-xs text-gray-400 mb-1">На стили</div>
                              <div className="font-semibold text-gray-900">{userStats?.coin_stats?.spent_on_styles || 0}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Метаданные */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                            <Calendar size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 font-medium uppercase">Дата регистрации</div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(selectedUser.created_at)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                            <Globe size={20} />
                          </div>
                          <div>
                            <div className="text-xs text-gray-400 font-medium uppercase">Последний онлайн</div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(selectedUser.last_active_at || '')} ({getRelativeTime(selectedUser.last_active_at)})</div>
                          </div>
                        </div>
                      </div>

                      {/* Опасная зона */}
                      <div className="pt-4">
                        <button
                          onClick={() => {
                            handleCloseUserCard()
                            handleDelete(selectedUser)
                          }}
                          className="w-full py-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold rounded-2xl transition-all border border-red-100 hover:shadow-lg hover:shadow-red-500/10 flex items-center justify-center gap-2 group"
                        >
                          <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                          Удалить пользователя навсегда
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Таб: Монеты */}
                  {activeTab === 'coins' && (
                    <div className="space-y-6">
                      {/* Баланс Hero */}
                      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 text-white text-center shadow-xl shadow-gray-900/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                        <div className="relative z-10">
                          <div className="text-gray-400 font-medium mb-1">Текущий баланс</div>
                          <div className="text-5xl font-bold tracking-tight mb-2">
                            {userCoins ?? '...'}
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium backdrop-blur-md border border-white/10">
                            <Coins size={12} className="text-yellow-400 fill-yellow-400" />
                            AI Neurons
                          </div>
                        </div>
                      </div>

                      {/* Начисление/списание */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-gray-900">Управление балансом</h3>
                          <div className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">Admin Action</div>
                        </div>

                        <div className="space-y-3">
                          <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                              <span className="text-gray-500 font-bold">∑</span>
                            </div>
                            <input
                              type="number"
                              placeholder="0"
                              value={coinsAmount}
                              onChange={(e) => setCoinsAmount(e.target.value)}
                              className="w-full pl-10 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-mono text-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                            />
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                              <span className="text-gray-400 text-sm">монет</span>
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Комментарий (например: Бонус за конкурс)"
                            value={coinsReason}
                            onChange={(e) => setCoinsReason(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-sm"
                          />

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                              onClick={handleAddCoins}
                              disabled={isAddingCoins || !coinsAmount}
                              className="py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Plus size={20} />
                              Начислить
                            </button>
                            <button
                              onClick={handleSpendCoins}
                              disabled={isAddingCoins || !coinsAmount}
                              className="py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                              <Minus size={20} />
                              Списать
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* История переработанная */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-4 px-1">История транзакций</h4>
                        <div className="space-y-3">
                          {coinTransactions && coinTransactions.length > 0 ? (
                            coinTransactions.map((tx) => (
                              <div key={tx.id} className="group bg-white hover:bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-colors flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center border",
                                    tx.amount > 0 ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"
                                  )}>
                                    {tx.amount > 0 ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                  </div>
                                  <div>
                                    <div className="font-medium text-gray-900 text-sm">
                                      {formatTransactionType(tx.type)}
                                      <span className="text-gray-400 font-normal ml-2 text-xs">{new Date(tx.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 max-w-[180px] truncate">
                                      {tx.description || 'Без описания'}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={cn("font-bold", tx.amount > 0 ? "text-green-600" : "text-red-600")}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                  </div>
                                  <div className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                    Bal: {tx.balance_after}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                              <p className="text-gray-400 text-sm">История транзакций пуста</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таб: Подписка */}
                  {activeTab === 'subscription' && (
                    <div className="space-y-6">
                      {/* Карточка подписки */}
                      {userStats?.subscription ? (
                        <div className={cn(
                          "relative overflow-hidden rounded-2xl p-6 border transition-all",
                          userStats.subscription.plan === 'elite'
                            ? "bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 text-white"
                            : "bg-white border-blue-100 shadow-xl shadow-blue-500/5"
                        )}>
                          {userStats.subscription.plan === 'elite' && (
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                          )}

                          <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
                                  userStats.subscription.plan === 'elite' ? "bg-gradient-to-br from-orange-400 to-amber-500" : "bg-blue-100 text-blue-600"
                                )}>
                                  <Crown size={24} className={userStats.subscription.plan === 'elite' ? 'text-white' : 'text-blue-600'} />
                                </div>
                                <div>
                                  <div className="font-bold text-lg leading-none mb-1">
                                    {userStats.subscription.plan.toUpperCase()}
                                  </div>
                                  <div className={cn("text-xs font-medium", userStats.subscription.plan === 'elite' ? "text-gray-400" : "text-gray-500")}>
                                    Premium Plan
                                  </div>
                                </div>
                              </div>
                              <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                userStats.subscription.status === 'active'
                                  ? "bg-green-500/20 text-green-500 ring-1 ring-green-500/40"
                                  : userStats.subscription.status === 'cancelled'
                                  ? "bg-amber-500/20 text-amber-600 ring-1 ring-amber-500/40"
                                  : "bg-red-500/20 text-red-500"
                              )}>
                                {userStats.subscription.status === 'active'
                                  ? 'Active'
                                  : userStats.subscription.status === 'cancelled'
                                  ? 'Отменена'
                                  : 'Expired'}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className={cn("p-4 rounded-xl", userStats.subscription.plan === 'elite' ? "bg-white/5" : "bg-gray-50")}>
                                <div className={cn("text-xs mb-1", userStats.subscription.plan === 'elite' ? "text-gray-400" : "text-gray-500")}>Истекает</div>
                                <div className="font-mono font-medium">
                                  {userStats.subscription.expires_at ? new Date(userStats.subscription.expires_at).toLocaleDateString() : '—'}
                                </div>
                              </div>
                              <div className={cn("p-4 rounded-xl", userStats.subscription.plan === 'elite' ? "bg-white/5" : "bg-gray-50")}>
                                <div className={cn("text-xs mb-1", userStats.subscription.plan === 'elite' ? "text-gray-400" : "text-gray-500")}>Лимит нейронов</div>
                                <div className="font-mono font-medium">
                                  {userStats.subscription.neurons_per_month} / мес
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={() => extendSubscription.mutate({
                                  telegramId: selectedUser.telegram_id,
                                  months: 1
                                })}
                                disabled={extendSubscription.isPending}
                                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-500/20 active:scale-95 flex items-center justify-center gap-2"
                              >
                                <Clock size={16} />
                                +1 Месяц
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Деактивировать подписку?')) {
                                    deactivateSubscription.mutate(selectedUser.telegram_id)
                                  }
                                }}
                                disabled={deactivateSubscription.isPending}
                                className={cn(
                                  "flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95",
                                  userStats.subscription.plan === 'elite' ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-50 hover:bg-red-100 text-red-600"
                                )}
                              >
                                Отключить
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                            <Crown size={32} />
                          </div>
                          <h4 className="text-gray-900 font-medium mb-1">Нет активной подписки</h4>
                          <p className="text-gray-500 text-sm">Выберите план ниже для активации</p>
                        </div>
                      )}

                      {/* Активация */}
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4">Ручная активация</h4>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <button
                            onClick={() => setSubscriptionPlan('pro')}
                            className={cn(
                              "relative p-4 rounded-xl border-2 text-left transition-all",
                              subscriptionPlan === 'pro' ? "border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-200" : "border-gray-100 hover:border-gray-200"
                            )}
                          >
                            {subscriptionPlan === 'pro' && <div className="absolute top-3 right-3 text-cyan-500"><Check size={16} /></div>}
                            <div className="font-bold text-gray-900 mb-1">PRO</div>
                            <div className="text-xs text-gray-500">2,900 ₽</div>
                          </button>
                          <button
                            onClick={() => setSubscriptionPlan('elite')}
                            className={cn(
                              "relative p-4 rounded-xl border-2 text-left transition-all",
                              subscriptionPlan === 'elite' ? "border-orange-500 bg-orange-50/50 ring-1 ring-orange-200" : "border-gray-100 hover:border-gray-200"
                            )}
                          >
                            {subscriptionPlan === 'elite' && <div className="absolute top-3 right-3 text-orange-500"><Check size={16} /></div>}
                            <div className="font-bold text-gray-900 mb-1">ELITE</div>
                            <div className="text-xs text-gray-500">9,900 ₽</div>
                          </button>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase ml-1 mb-1.5 block">Длительность</label>
                            <select
                              value={subscriptionMonths}
                              onChange={(e) => setSubscriptionMonths(parseInt(e.target.value))}
                              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            >
                              {[1, 2, 3, 6, 12].map(m => (
                                <option key={m} value={m}>{m} мес.</option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={() => {
                              if (confirm(`Активировать ${subscriptionPlan.toUpperCase()} на ${subscriptionMonths} мес.?`)) {
                                activateSubscription.mutate({
                                  telegramId: selectedUser.telegram_id,
                                  plan: subscriptionPlan,
                                  months: subscriptionMonths
                                })
                              }
                            }}
                            disabled={activateSubscription.isPending}
                            className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                          >
                            {activateSubscription.isPending ? <Loader2 className="animate-spin" /> : <Star size={18} fill="currentColor" />}
                            Активировать сейчас
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таб: Стили */}
                  {activeTab === 'styles' && (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100/50">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-500 shrink-0">
                            <Gift size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">Grant Premium Style</h4>
                            <p className="text-xs text-gray-600 mb-3 leading-relaxed">Admin override to unlock specific styles for free.</p>
                            <GrantStyleSelector
                              telegramId={selectedUser.telegram_id}
                              ownedStyleIds={userStats?.purchased_styles.map(s => s.style_id) || []}
                              onSuccess={() => refetchStats()}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-gray-900">Библиотека стилей</h4>
                          <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-md">{userStats?.purchased_styles?.length || 0} шт</span>
                        </div>

                        {userStats?.purchased_styles && userStats.purchased_styles.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                            {userStats.purchased_styles.map((style, index) => (
                              <div
                                key={index}
                                className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow"
                              >
                                <div className="w-10 h-10 rounded-lg bg-gray-900 flex items-center justify-center text-white shrink-0">
                                  <Palette size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 truncate">{style.style_id}</div>
                                  <div className="text-xs text-gray-400">{new Date(style.purchased_at).toLocaleDateString()}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-gray-900">{style.price_paid}</div>
                                  <div className="text-[10px] text-gray-400">монет</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <Palette size={32} className="mx-auto text-gray-300 mb-2" />
                            <div className="text-gray-400 text-sm">Нет купленных стилей</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Компонент выбора стиля для выдачи
function GrantStyleSelector({ telegramId, ownedStyleIds, onSuccess }: { telegramId: number, ownedStyleIds: string[], onSuccess: () => void }) {
  const [selectedStyleId, setSelectedStyleId] = useState('')
  const [isGranting, setIsGranting] = useState(false)

  // Load styles
  const { data: styles } = useQuery({
    queryKey: ['admin-grant-styles'],
    queryFn: async () => {
      const { data } = await supabase.from('carousel_styles').select('style_id, name').order('name')
      return data || []
    }
  })

  const availableStyles = styles?.filter(s => !ownedStyleIds.includes(s.style_id)) || []
  const hasAvailableStyles = availableStyles.length > 0

  const handleGrant = async () => {
    if (!selectedStyleId) return

    setIsGranting(true)
    try {
      const { error } = await supabase.from('user_purchased_styles').insert({
        telegram_id: telegramId,
        style_id: selectedStyleId,
        price_paid: 0,
        purchased_at: new Date().toISOString()
      })

      if (error) throw error

      toast.success('Стиль успешно выдан!', {
        icon: '🎁',
        style: { borderRadius: '16px', background: '#FFF8F5', border: '1px solid #FFEDD5' }
      })
      setSelectedStyleId('')
      onSuccess()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка выдачи стиля')
    } finally {
      setIsGranting(false)
    }
  }

  if (!hasAvailableStyles) {
    return (
      <div className="text-green-600 text-xs font-medium flex items-center gap-1.5 bg-green-50 px-3 py-2 rounded-lg border border-green-100">
        <Check size={14} />
        Все доступные стили уже выданы
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full mt-2">
      <div className="relative group w-full">
        <select
          value={selectedStyleId}
          onChange={(e) => setSelectedStyleId(e.target.value)}
          className="w-full appearance-none bg-white border border-orange-200 rounded-xl pl-3 pr-8 py-2.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all cursor-pointer shadow-sm"
        >
          <option value="">Выберите стиль...</option>
          {availableStyles.map(s => (
            <option key={s.style_id} value={s.style_id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300 pointer-events-none" />
      </div>

      <button
        onClick={handleGrant}
        disabled={!selectedStyleId || isGranting}
        className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isGranting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
        Выдать
      </button>
    </div>
  )
}
