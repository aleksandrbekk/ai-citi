import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Search } from 'lucide-react'

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

export function AllUsersTab() {
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

  // Относительное время
  const getRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return 'Никогда'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Только что'
    if (diffMins < 60) return `${diffMins} мин. назад`
    if (diffHours < 24) return `${diffHours} ч. назад`
    if (diffDays === 1) return 'Вчера'
    if (diffDays < 7) return `${diffDays} дн. назад`
    return formatDate(dateStr)
  }

  return (
    <div>
      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-white">{users?.length || 0}</div>
          <div className="text-sm text-zinc-500">Всего пользователей</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">
            {users?.filter(u => {
              const lastActive = u.last_active_at ? new Date(u.last_active_at) : null
              if (!lastActive) return false
              const now = new Date()
              return now.getTime() - lastActive.getTime() < 86400000 // 24 часа
            }).length || 0}
          </div>
          <div className="text-sm text-zinc-500">Активных за 24ч</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">
            {users?.filter(u => {
              const created = new Date(u.created_at)
              const now = new Date()
              return now.getTime() - created.getTime() < 86400000
            }).length || 0}
          </div>
          <div className="text-sm text-zinc-500">Новых за 24ч</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {users?.filter(u => u.utm_source).length || 0}
          </div>
          <div className="text-sm text-zinc-500">С UTM-метками</div>
        </div>
      </div>

      {/* Поиск */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по ID, username, имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Пользователь</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Telegram ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">UTM</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Регистрация</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Последняя активность</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  Загрузка...
                </td>
              </tr>
            ) : filteredUsers?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                  {users?.length === 0 ? 'Нет пользователей' : 'Ничего не найдено'}
                </td>
              </tr>
            ) : (
              filteredUsers?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-800 hover:bg-zinc-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.photo_url ? (
                        <img
                          src={user.photo_url}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-zinc-400 text-sm">
                          {user.first_name?.[0] || user.username?.[0] || '?'}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-white">
                          {[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Без имени'}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {user.username ? `@${user.username}` : '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-sm text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                      {user.telegram_id}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 text-sm">
                    {user.utm_source ? (
                      <div>
                        <div className="text-blue-400">{user.utm_source}</div>
                        {user.utm_campaign && (
                          <div className="text-xs text-zinc-500">{user.utm_campaign}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {getRelativeTime(user.last_active_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Счётчик результатов */}
      {filteredUsers && (
        <div className="mt-4 text-sm text-zinc-500 text-center">
          Показано {filteredUsers.length} из {users?.length || 0} пользователей
        </div>
      )}
    </div>
  )
}
