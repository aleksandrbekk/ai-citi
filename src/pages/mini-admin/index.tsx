import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import {
  Users,
  UserPlus,
  BarChart3,
  GraduationCap,
  CreditCard,
  Search,
  Trash2,
  Plus,
  Shield
} from 'lucide-react'

// Админские telegram ID
const ADMIN_IDS = [643763835, 190202791]

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

  // Проверяем доступ
  const isAdmin = Boolean(telegramUser?.id && ADMIN_IDS.includes(telegramUser.id))

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

  // Добавление платного клиента
  const addClient = useMutation({
    mutationFn: async ({ telegram_id, plan }: { telegram_id: number; plan: string }) => {
      const { data, error } = await supabase
        .from('premium_clients')
        .insert({ telegram_id, plan })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mini-admin-premium'] })
      setNewClientId('')
      setNewClientPlan('basic')
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

  // Создаём Map для быстрой проверки статусов
  const premiumMap = new Map<number, string>(premiumClients.map((c: PremiumClient) => [c.telegram_id, c.plan]))
  const usersMap = new Map<number, User>(users.map((u: User) => [u.telegram_id, u]))
  const usersMapById = new Map<string, User>(users.map((u: User) => [u.id, u]))

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
    <div className="min-h-screen bg-black text-white pb-24 pt-[100px]">
      {/* Tabs */}
      <div className="bg-black border-b border-zinc-800">
        <div className="flex overflow-x-auto px-4 py-3 gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
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
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Telegram ID"
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newUserId) {
                      addUser.mutate(parseInt(newUserId))
                    }
                  }}
                  disabled={!newUserId || addUser.isPending}
                  className="px-4 py-2 bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg flex items-center gap-2"
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
                      className={`p-4 rounded-lg border ${
                        online
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
          <div className="space-y-6">
            {/* Форма добавления */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <UserPlus size={18} />
                Добавить платного клиента
              </h3>
              <div>
                <label className="text-sm text-zinc-400 mb-1 block">Telegram ID</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (newClientId) {
                    addClient.mutate({ telegram_id: parseInt(newClientId), plan: newClientPlan })
                  }
                }}
                disabled={!newClientId || addClient.isPending}
                className="w-full py-3 bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                {addClient.isPending ? 'Добавление...' : 'Добавить'}
              </button>
            </div>

            {/* Список клиентов */}
            <div>
              <h3 className="font-semibold mb-3">Платные клиенты ({premiumClients.length})</h3>
              <div className="space-y-2">
                {premiumClients.map((client: PremiumClient) => {
                  const userInfo = usersMap.get(client.telegram_id)
                  const displayName = userInfo?.first_name || userInfo?.username || String(client.telegram_id)

                  return (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{displayName}</span>
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                            {client.plan.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm text-zinc-500">
                          {userInfo?.username ? `@${userInfo.username} • ` : ''}{client.telegram_id}
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">
                          Добавлен: {formatDate(client.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Удалить клиента ${displayName}?`)) {
                            deleteClient.mutate(client.id)
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
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                onClick={() => {
                  if (newStudentId) {
                    addStudent.mutate({ telegram_id: parseInt(newStudentId), tariff: newStudentTariff })
                  }
                }}
                disabled={!newStudentId || addStudent.isPending}
                className="w-full py-3 bg-blue-600 active:bg-blue-800 disabled:opacity-50 text-white rounded-lg flex items-center justify-center gap-2"
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
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            student.tariff_slug === 'platinum'
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
