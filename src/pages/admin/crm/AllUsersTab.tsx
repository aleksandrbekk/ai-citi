import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, getCoinBalance, addCoins } from '../../../lib/supabase'
import { Search, Trash2, CreditCard, X, Coins, Calendar, Globe, User as UserIcon, Send } from 'lucide-react'
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

export function AllUsersTab() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [coinsAmount, setCoinsAmount] = useState('')
  const [coinsReason, setCoinsReason] = useState('')
  const [isAddingCoins, setIsAddingCoins] = useState(false)

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

  // Создаём Set для быстрой проверки платных клиентов
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

  // Профиль выбранного юзера (для будущего расширения)
  const { data: _userProfile } = useQuery({
    queryKey: ['user-profile', selectedUser?.telegram_id],
    queryFn: async () => {
      if (!selectedUser) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('telegram_id', selectedUser.telegram_id)
        .single()
      if (error) return null
      return data
    },
    enabled: !!selectedUser
  })
  void _userProfile // используется для будущего расширения

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
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректное количество монет')
      return
    }

    setIsAddingCoins(true)
    try {
      const result = await addCoins(
        selectedUser.telegram_id,
        amount,
        'bonus',
        coinsReason || 'Начислено администратором'
      )

      if (result.success) {
        toast.success(`Начислено ${amount} монет`)
        setCoinsAmount('')
        setCoinsReason('')
        refetchCoins()
      } else {
        toast.error(result.error || 'Ошибка начисления')
      }
    } catch (error) {
      toast.error('Ошибка начисления монет')
    } finally {
      setIsAddingCoins(false)
    }
  }

  // Открыть карточку юзера
  const handleOpenUserCard = (user: User) => {
    setSelectedUser(user)
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
                className={`bg-white border border-gray-200 rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                  online ? 'border-l-2 border-l-green-500' : recentlyActive ? 'border-l-2 border-l-blue-500' : ''
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

                  {/* Действия */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(user)
                    }}
                    disabled={deleteUser.isPending}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Детали */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span className={`px-2 py-1 rounded ${
                    online ? 'bg-green-100 text-green-600' : recentlyActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
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

      {/* Модальное окно - Карточка юзера */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleCloseUserCard}>
          <div
            className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Шапка */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Карточка пользователя</h2>
              <button
                onClick={handleCloseUserCard}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Контент */}
            <div className="p-4 space-y-4">
              {/* Аватар и имя */}
              <div className="flex items-center gap-4">
                {selectedUser.photo_url ? (
                  <img
                    src={selectedUser.photo_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                    {selectedUser.first_name?.[0] || selectedUser.username?.[0] || '?'}
                  </div>
                )}
                <div>
                  <div className="text-xl font-semibold text-gray-900">
                    {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Без имени'}
                  </div>
                  <div className="text-gray-500">
                    {selectedUser.username ? `@${selectedUser.username}` : `ID: ${selectedUser.telegram_id}`}
                  </div>
                  {premiumMap.has(selectedUser.telegram_id) && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-orange-100 text-orange-600 text-xs rounded-full">
                      <CreditCard size={12} />
                      {premiumMap.get(selectedUser.telegram_id)}
                    </span>
                  )}
                </div>
              </div>

              {/* Баланс монет */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Coins size={20} />
                  <span className="font-medium">Баланс монет</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {userCoins ?? '...'} <span className="text-lg text-gray-500">монет</span>
                </div>
              </div>

              {/* Информация */}
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

              {/* Начисление монет */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Начислить монеты</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    placeholder="Количество монет"
                    value={coinsAmount}
                    onChange={(e) => setCoinsAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                  <input
                    type="text"
                    placeholder="Причина (необязательно)"
                    value={coinsReason}
                    onChange={(e) => setCoinsReason(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleAddCoins}
                    disabled={isAddingCoins || !coinsAmount}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isAddingCoins ? (
                      'Начисляю...'
                    ) : (
                      <>
                        <Coins size={18} />
                        Начислить
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Действия */}
              <div className="border-t border-gray-100 pt-4 flex gap-2">
                <button
                  onClick={() => {
                    handleCloseUserCard()
                    handleDelete(selectedUser)
                  }}
                  className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
