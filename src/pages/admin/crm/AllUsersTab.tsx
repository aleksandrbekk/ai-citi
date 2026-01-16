import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Search, Trash2, CreditCard } from 'lucide-react'

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-xl font-bold text-white">{users?.length || 0}</div>
          <div className="text-xs text-zinc-500">Всего</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-xl font-bold text-blue-400">
            {users?.filter(u => {
              const lastActive = u.last_active_at ? new Date(u.last_active_at) : null
              if (!lastActive) return false
              const now = new Date()
              return now.getTime() - lastActive.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs text-zinc-500">За 24ч</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-xl font-bold text-green-400">
            {users?.filter(u => {
              const created = new Date(u.created_at)
              const now = new Date()
              return now.getTime() - created.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-xs text-zinc-500">Новых</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <div className="text-xl font-bold text-yellow-400">
            {premiumClients?.length || 0}
          </div>
          <div className="text-xs text-zinc-500">Платных</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
        />
      </div>

      {/* Список пользователей - карточки */}
      {isLoading ? (
        <div className="text-center py-8 text-zinc-500">Загрузка...</div>
      ) : filteredUsers?.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
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
                className={`bg-zinc-900 border border-zinc-800 rounded-xl p-3 ${
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
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                          {user.first_name?.[0] || user.username?.[0] || '?'}
                        </div>
                      )}
                      {online && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-white truncate flex items-center gap-1">
                        {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Без имени'}
                        {isPremium && <CreditCard size={12} className="text-yellow-500 flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {user.username ? `@${user.username}` : user.telegram_id}
                      </div>
                    </div>
                  </div>

                  {/* Действия */}
                  <button
                    onClick={() => handleDelete(user)}
                    disabled={deleteUser.isPending}
                    className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Детали */}
                <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                  <span className={`px-2 py-1 rounded ${
                    online ? 'bg-green-500/20 text-green-400' : recentlyActive ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {getRelativeTime(user.last_active_at)}
                  </span>
                  {isPremium && (
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">{plan}</span>
                  )}
                  {user.utm_source && (
                    <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded">{user.utm_source}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Счётчик */}
      {filteredUsers && (
        <div className="text-xs text-zinc-500 text-center">
          {filteredUsers.length} из {users?.length || 0}
        </div>
      )}
    </div>
  )
}
