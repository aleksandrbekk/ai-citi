import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getCoinBalance, addCoins } from '../../../lib/supabase'
import {
  Search, Trash2, CreditCard, X, Coins, Calendar, Globe, User as UserIcon,
  Send, ChevronRight, Star, Palette, ArrowUpCircle, ArrowDownCircle,
  Crown, Clock, Zap, ShoppingBag, Plus, Minus
} from 'lucide-react'
import { toast } from 'sonner'

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
    if (confirm(`Удалить пользователя "${name}" из базы?`)) {
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
        coinsReason || (amount > 0 ? 'Начислено администратором' : 'Списано администратором')
      )

      if (result.success) {
        toast.success(amount > 0 ? `Начислено ${amount} монет` : `Списано ${Math.abs(amount)} монет`)
        setCoinsAmount('')
        setCoinsReason('')
        refetchCoins()
        refetchStats()
      } else {
        toast.error(result.error || 'Ошибка операции')
      }
    } catch {
      toast.error('Ошибка операции с монетами')
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
    if (diffMins < 60) return `${diffMins} мин. назад`
    if (diffHours < 24) return `${diffHours} ч. назад`
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дн. назад`
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
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="text-xl font-bold text-gray-900">{users?.length || 0}</div>
          <div className="text-xs text-gray-500">Всего</div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="text-xl font-bold text-blue-600">
            {users?.filter(u => {
              const lastActive = u.last_active_at ? new Date(u.last_active_at) : null
              if (!lastActive) return false
              const now = new Date()
              return now.getTime() - lastActive.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs text-gray-500">За 24ч</div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="text-xl font-bold text-green-600">
            {users?.filter(u => {
              const created = new Date(u.created_at)
              const now = new Date()
              return now.getTime() - created.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs text-gray-500">Новых</div>
        </div>
        <div className="bg-gray-100 rounded-xl p-3">
          <div className="text-xl font-bold text-orange-500">
            {premiumClients?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Платных</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Список пользователей - карточки */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Загрузка...</div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {users?.length === 0 ? 'Нет пользователей' : 'Ничего не найдено'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers?.map((user) => {
            const isPremium = premiumMap.has(user.telegram_id)
            const plan = premiumMap.get(user.telegram_id)
            const online = isOnline(user.last_active_at)
            const recentlyActive = isRecentlyActive(user.last_active_at)

            return (
              <div
                key={user.id}
                onClick={() => handleOpenUserCard(user)}
                className={`bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors ${online ? 'border-l-2 border-l-green-500' : recentlyActive ? 'border-l-2 border-l-blue-500' : ''
                  }`}
              >
                <div className="flex items-center justify-between gap-2">
                  {/* Аватар и имя */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      {user.photo_url ? (
                        <img src={user.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                          {user.first_name?.[0] || user.username?.[0] || '?'}
                        </div>
                      )}
                      {online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 truncate flex items-center gap-1">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Без имени'}
                        {isPremium && <CreditCard size={12} className="text-orange-500 flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {user.username ? `@${user.username}` : user.telegram_id}
                      </div>
                    </div>
                  </div>

                  {/* Стрелка */}
                  <ChevronRight size={18} className="text-gray-400 flex-shrink-0" />
                </div>

                {/* Детали */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span className={`px-2 py-1 rounded ${online ? 'bg-green-100 text-green-600' : recentlyActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                    {getRelativeTime(user.last_active_at)}
                  </span>
                  {isPremium && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded">{plan}</span>
                  )}
                  {user.utm_source && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded">{user.utm_source}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Счётчик */}
      {filteredUsers && (
        <div className="text-xs text-gray-500 text-center">
          {filteredUsers.length} из {users?.length || 0}
        </div>
      )}

      {/* Модальное окно - Расширенная карточка юзера */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleCloseUserCard}>
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {selectedUser.photo_url ? (
                  <img
                    src={selectedUser.photo_url}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                    {selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?'}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Без имени'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedUser.username ? `@${selectedUser.username}` : `ID: ${selectedUser.telegram_id}`}
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseUserCard}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Табы */}
            <div className="flex border-b border-gray-100 px-4">
              {[
                { id: 'info', label: 'Инфо', icon: UserIcon },
                { id: 'coins', label: 'Монеты', icon: Coins },
                { id: 'subscription', label: 'Подписка', icon: Crown },
                { id: 'styles', label: 'Стили', icon: Palette }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Контент табов */}
            <div className="p-4 space-y-4">
              {isLoadingStats ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                  Загрузка...
                </div>
              ) : (
                <>
                  {/* Таб: Информация */}
                  {activeTab === 'info' && (
                    <div className="space-y-4">
                      {/* Основная статистика */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-orange-600 mb-1">
                            <Coins size={16} />
                            <span className="text-xs">Баланс</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {userCoins ?? userStats?.coin_stats?.balance ?? 0}
                          </div>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 border border-cyan-200 rounded-xl p-3">
                          <div className="flex items-center gap-2 text-cyan-600 mb-1">
                            <CreditCard size={16} />
                            <span className="text-xs">Оплачено</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {(userStats?.payment_stats?.total_paid_rub || 0).toLocaleString('ru-RU')}₽
                          </div>
                        </div>
                      </div>

                      {/* Статистика монет */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Zap size={16} className="text-orange-500" />
                          Статистика монет
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Потрачено всего:</span>
                            <span className="text-red-600 font-medium">-{userStats?.coin_stats?.total_spent || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Заработано:</span>
                            <span className="text-green-600 font-medium">+{userStats?.coin_stats?.total_earned || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">На генерации:</span>
                            <span className="text-gray-700">{userStats?.coin_stats?.spent_on_generations || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">На стили:</span>
                            <span className="text-gray-700">{userStats?.coin_stats?.spent_on_styles || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">От рефералов:</span>
                            <span className="text-gray-700">{userStats?.coin_stats?.earned_from_referrals || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">От покупок:</span>
                            <span className="text-gray-700">{userStats?.coin_stats?.earned_from_purchases || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Информация о пользователе */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-gray-600">
                          <UserIcon size={18} className="text-gray-400" />
                          <span className="text-sm">Telegram ID:</span>
                          <span className="font-mono text-sm">{selectedUser.telegram_id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Calendar size={18} className="text-gray-400" />
                          <span className="text-sm">Регистрация:</span>
                          <span className="text-sm">{formatDate(selectedUser.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-gray-600">
                          <Globe size={18} className="text-gray-400" />
                          <span className="text-sm">Последняя активность:</span>
                          <span className="text-sm">{getRelativeTime(selectedUser.last_active_at)}</span>
                        </div>
                        {selectedUser.utm_source && (
                          <div className="flex items-center gap-3 text-gray-600">
                            <Send size={18} className="text-gray-400" />
                            <span className="text-sm">Источник:</span>
                            <span className="text-sm">{selectedUser.utm_source}</span>
                          </div>
                        )}
                      </div>

                      {/* Действия */}
                      <div className="border-t border-gray-100 pt-4">
                        <button
                          onClick={() => {
                            handleCloseUserCard()
                            handleDelete(selectedUser)
                          }}
                          className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 size={18} />
                          Удалить пользователя
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Таб: Монеты */}
                  {activeTab === 'coins' && (
                    <div className="space-y-4">
                      {/* Баланс */}
                      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-orange-600 mb-1">
                          <Coins size={20} />
                          <span className="font-medium">Текущий баланс</span>
                        </div>
                        <div className="text-3xl font-bold text-gray-900">
                          {userCoins ?? '...'} <span className="text-lg text-gray-500">монет</span>
                        </div>
                      </div>

                      {/* Начисление/списание монет */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-medium text-gray-900 mb-3">Операции с монетами</h3>
                        <div className="space-y-3">
                          <input
                            type="number"
                            placeholder="Количество (- для списания)"
                            value={coinsAmount}
                            onChange={(e) => setCoinsAmount(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                          />
                          <input
                            type="text"
                            placeholder="Причина (необязательно)"
                            value={coinsReason}
                            onChange={(e) => setCoinsReason(e.target.value)}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleAddCoins}
                              disabled={isAddingCoins || !coinsAmount}
                              className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                              <Plus size={18} />
                              Начислить
                            </button>
                            <button
                              onClick={() => {
                                if (coinsAmount && !coinsAmount.startsWith('-')) {
                                  setCoinsAmount('-' + coinsAmount)
                                }
                                handleAddCoins()
                              }}
                              disabled={isAddingCoins || !coinsAmount}
                              className="flex-1 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                              <Minus size={18} />
                              Списать
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* История транзакций */}
                      <div className="border-t border-gray-100 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">История операций</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {coinTransactions && coinTransactions.length > 0 ? (
                            coinTransactions.map((tx) => (
                              <div key={tx.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {tx.amount > 0 ? (
                                    <ArrowUpCircle size={20} className="text-green-500" />
                                  ) : (
                                    <ArrowDownCircle size={20} className="text-red-500" />
                                  )}
                                  <div>
                                    <div className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {formatTransactionType(tx.type)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">= {tx.balance_after}</div>
                                  <div className="text-xs text-gray-400">
                                    {new Date(tx.created_at).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">Нет транзакций</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таб: Подписка */}
                  {activeTab === 'subscription' && (
                    <div className="space-y-4">
                      {/* Текущая подписка */}
                      {userStats?.subscription ? (
                        <div className={`rounded-xl p-4 border ${userStats.subscription.plan === 'elite'
                          ? 'bg-gradient-to-br from-orange-50 to-yellow-50 border-orange-200'
                          : 'bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200'
                          }`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Crown size={20} className={userStats.subscription.plan === 'elite' ? 'text-orange-500' : 'text-cyan-500'} />
                              <span className="font-bold text-lg text-gray-900">
                                {userStats.subscription.plan.toUpperCase()}
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${userStats.subscription.status === 'active'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-red-100 text-red-600'
                              }`}>
                              {userStats.subscription.status === 'active' ? 'Активна' : 'Неактивна'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">Осталось:</span>
                              <div className={`font-medium ${(userStats.subscription.days_remaining || 0) <= 7 ? 'text-red-500' : 'text-gray-900'
                                }`}>
                                {userStats.subscription.days_remaining !== null
                                  ? `${userStats.subscription.days_remaining} дн.`
                                  : '∞'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Истекает:</span>
                              <div className="font-medium text-gray-900">
                                {userStats.subscription.expires_at
                                  ? new Date(userStats.subscription.expires_at).toLocaleDateString('ru-RU')
                                  : '—'
                                }
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Нейронов/мес:</span>
                              <div className="font-medium text-gray-900">{userStats.subscription.neurons_per_month}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Стоимость:</span>
                              <div className="font-medium text-gray-900">{userStats.subscription.amount_rub}₽</div>
                            </div>
                          </div>

                          {/* Действия с подпиской */}
                          <div className="flex gap-2 mt-4">
                            <button
                              onClick={() => extendSubscription.mutate({
                                telegramId: selectedUser.telegram_id,
                                months: 1
                              })}
                              disabled={extendSubscription.isPending}
                              className="flex-1 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1"
                            >
                              <Clock size={16} />
                              +1 мес
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Деактивировать подписку?')) {
                                  deactivateSubscription.mutate(selectedUser.telegram_id)
                                }
                              }}
                              disabled={deactivateSubscription.isPending}
                              className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-colors"
                            >
                              Деактивировать
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                          <Crown size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Нет активной подписки</p>
                        </div>
                      )}

                      {/* Активация подписки */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-medium text-gray-900 mb-3">Активировать подписку</h4>

                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setSubscriptionPlan('pro')}
                              className={`p-3 rounded-xl border-2 text-left transition-colors ${subscriptionPlan === 'pro'
                                ? 'border-cyan-500 bg-cyan-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <div className="font-bold text-gray-900">PRO</div>
                              <div className="text-sm text-gray-500">2 900 ₽/мес</div>
                              <div className="text-xs text-cyan-600">+150 нейронов</div>
                            </button>
                            <button
                              onClick={() => setSubscriptionPlan('elite')}
                              className={`p-3 rounded-xl border-2 text-left transition-colors ${subscriptionPlan === 'elite'
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <div className="font-bold text-gray-900">ELITE</div>
                              <div className="text-sm text-gray-500">9 900 ₽/мес</div>
                              <div className="text-xs text-orange-600">+600 нейронов</div>
                            </button>
                          </div>

                          <div>
                            <label className="text-sm text-gray-600 mb-1 block">Срок (месяцев)</label>
                            <select
                              value={subscriptionMonths}
                              onChange={(e) => setSubscriptionMonths(parseInt(e.target.value))}
                              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900"
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
                            className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            <Star size={18} />
                            {activateSubscription.isPending ? 'Активация...' : 'Активировать подписку'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таб: Стили */}
                  {activeTab === 'styles' && (
                    <div className="space-y-4">
                      {/* Грант стиля */}
                      <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                        <h4 className="font-medium text-gray-900 mb-3">Выдать стиль (Бесплатно)</h4>
                        <div className="flex gap-2">
                          <GrantStyleSelector
                            telegramId={selectedUser.telegram_id}
                            ownedStyleIds={userStats?.purchased_styles.map(s => s.style_id) || []}
                            onSuccess={() => refetchStats()}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <ShoppingBag size={18} />
                        <span className="font-medium">Купленные стили</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                          {userStats?.purchased_styles?.length || 0}
                        </span>
                      </div>

                      {userStats?.purchased_styles && userStats.purchased_styles.length > 0 ? (
                        <div className="space-y-2">
                          {userStats.purchased_styles.map((style, index) => (
                            <div
                              key={index}
                              className="bg-gray-50 rounded-xl p-3 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                                  <Palette size={20} className="text-white" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900">{style.style_id}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(style.purchased_at).toLocaleDateString('ru-RU')}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-orange-600">{style.price_paid}</div>
                                <div className="text-xs text-gray-500">монет</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-xl p-8 text-center">
                          <Palette size={40} className="text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">Нет купленных стилей</p>
                        </div>
                      )}

                      {/* Итого потрачено на стили */}
                      {(userStats?.coin_stats?.spent_on_styles ?? 0) > 0 && (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center justify-between">
                          <span className="text-gray-600">Всего потрачено на стили:</span>
                          <span className="font-bold text-orange-600">{userStats?.coin_stats?.spent_on_styles ?? 0} монет</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
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
      // Fetch directly from DB to allow more options if needed
      const { data } = await supabase.from('carousel_styles').select('style_id, name').order('name')
      return data || []
    }
  })

  const availableStyles = styles?.filter(s => !ownedStyleIds.includes(s.style_id)) || []

  const handleGrant = async () => {
    if (!selectedStyleId) return
    if (!confirm(`Выдать стиль ${selectedStyleId} бесплатно?`)) return

    setIsGranting(true)
    try {
      const { error } = await supabase.from('user_purchased_styles').insert({
        telegram_id: telegramId,
        style_id: selectedStyleId,
        price_paid: 0,
        purchased_at: new Date().toISOString()
      })

      if (error) throw error

      toast.success('Стиль выдан!')
      setSelectedStyleId('')
      onSuccess()
    } catch (e) {
      console.error(e)
      toast.error('Ошибка выдачи стиля')
    } finally {
      setIsGranting(false)
    }
  }

  return (
    <div className="flex w-full gap-2">
      <select
        value={selectedStyleId}
        onChange={(e) => setSelectedStyleId(e.target.value)}
        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm"
      >
        <option value="">Выберите стиль...</option>
        {availableStyles.map(s => (
          <option key={s.style_id} value={s.style_id}>{s.name} ({s.style_id})</option>
        ))}
      </select>
      <button
        onClick={handleGrant}
        disabled={!selectedStyleId || isGranting}
        className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 transition-colors"
      >
        {isGranting ? '...' : 'Выдать'}
      </button>
    </div>
  )
}
