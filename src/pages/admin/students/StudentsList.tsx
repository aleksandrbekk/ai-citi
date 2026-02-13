import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Trash2, UserPlus, Pause, Play, ChevronRight } from 'lucide-react'

export function StudentsList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newIdentifier, setNewIdentifier] = useState('')
  const [newComment, setNewComment] = useState('')
  const [newTariff, setNewTariff] = useState('standard')
  const [newDays, setNewDays] = useState('')

  // Загрузить всех пользователей с доступом и тарифами
  const { data: students, isLoading } = useQuery({
    queryKey: ['students-full'],
    queryFn: async () => {
      // Получаем whitelist с данными пользователей и тарифами
      const { data: allowed, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error

      // Для каждого в whitelist получаем данные из users и тарифы
      const enriched = await Promise.all(allowed.map(async (a: any) => {
        const { data: user } = await supabase
          .from('users')
          .select('id, first_name, last_name, username, avatar_url')
          .eq('telegram_id', a.telegram_id)
          .single()
        
        let tariffs: any[] = []
        if (user) {
          const { data: t } = await supabase
            .from('user_tariffs')
            .select('*')
            .eq('user_id', user.id)
          tariffs = t || []
        }

        return {
          ...a,
          user,
          tariffs
        }
      }))

      return enriched
    }
  })

  // Загрузить список тарифов
  const { data: tariffsList } = useQuery({
    queryKey: ['tariffs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tariffs')
        .select('slug, title')
        .order('title')
      return data || []
    }
  })

  // Добавить пользователя в whitelist + тариф
  const addUser = useMutation({
    mutationFn: async () => {
      const input = newIdentifier.trim()
      if (!input) throw new Error('Введите Telegram ID или @username')

      let telegramId: number | null = null
      let userId: string | null = null

      if (input.startsWith('@')) {
        // Поиск по username
        const username = input.slice(1)
        const { data: foundUser } = await supabase
          .from('users')
          .select('id, telegram_id')
          .eq('username', username)
          .single()

        if (!foundUser) throw new Error(`Пользователь @${username} не найден в системе`)
        telegramId = foundUser.telegram_id
        userId = foundUser.id
      } else {
        const parsed = parseInt(input)
        if (isNaN(parsed)) throw new Error('Введите число (Telegram ID) или @username')
        telegramId = parsed

        // Пробуем найти пользователя по telegram_id
        const { data: foundUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()
        if (foundUser) userId = foundUser.id
      }

      // Добавляем в whitelist (upsert)
      const { error: wlError } = await supabase
        .from('allowed_users')
        .upsert(
          { telegram_id: telegramId, comment: newComment || null },
          { onConflict: 'telegram_id' }
        )
      if (wlError) throw wlError

      // Если пользователь найден — назначаем тариф
      if (userId) {
        const expiresAt = newDays
          ? new Date(Date.now() + parseInt(newDays) * 86400000).toISOString()
          : null

        // Upsert тариф
        const { data: existing } = await supabase
          .from('user_tariffs')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (existing) {
          await supabase
            .from('user_tariffs')
            .update({ tariff_slug: newTariff, expires_at: expiresAt, is_active: true })
            .eq('id', existing.id)
        } else {
          await supabase
            .from('user_tariffs')
            .insert({ user_id: userId, tariff_slug: newTariff, expires_at: expiresAt, is_active: true })
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
      setNewIdentifier('')
      setNewComment('')
      setNewTariff('standard')
      setNewDays('')
      setShowAddForm(false)
    }
  })

  // Удалить пользователя (whitelist + тариф)
  const removeUser = useMutation({
    mutationFn: async ({ telegramId, userId }: { telegramId: number; userId?: string }) => {
      // Удаляем из whitelist
      await supabase
        .from('allowed_users')
        .delete()
        .eq('telegram_id', telegramId)

      // Удаляем тарифы если есть user
      if (userId) {
        await supabase
          .from('user_tariffs')
          .delete()
          .eq('user_id', userId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
    }
  })

  // Добавить тариф пользователю
  const addTariff = useMutation({
    mutationFn: async ({ userId, tariffSlug }: { userId: string, tariffSlug: string }) => {
      const { error } = await supabase
        .from('user_tariffs')
        .insert({ user_id: userId, tariff_slug: tariffSlug, is_active: true })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
    }
  })

  // Переключить активность тарифа
  const toggleTariffActive = useMutation({
    mutationFn: async ({ tariffId, currentActive }: { tariffId: string, currentActive: boolean }) => {
      const { error } = await supabase
        .from('user_tariffs')
        .update({ is_active: !currentActive })
        .eq('id', tariffId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
    }
  })

  // Удалить тариф
  const removeTariff = useMutation({
    mutationFn: async (tariffId: string) => {
      await supabase.from('user_tariffs').delete().eq('id', tariffId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
    }
  })

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ученики</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg flex items-center gap-2 text-gray-900 transition-colors"
        >
          <UserPlus size={18} />
          Добавить
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <h2 className="font-medium mb-3 text-gray-900">Новый ученик</h2>
          {addUser.isError && (
            <p className="text-sm text-red-500 mb-3">{(addUser.error as Error).message}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              value={newIdentifier}
              onChange={(e) => setNewIdentifier(e.target.value)}
              placeholder="Telegram ID или @username"
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Имя"
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={newTariff}
              onChange={(e) => setNewTariff(e.target.value)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="standard">Standard</option>
              <option value="platinum">Platinum</option>
            </select>
            <input
              type="number"
              value={newDays}
              onChange={(e) => setNewDays(e.target.value)}
              placeholder="Дней (пусто = бессрочно)"
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => addUser.mutate()}
              disabled={!newIdentifier.trim() || addUser.isPending}
              className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg disabled:opacity-50 rounded-lg text-white font-medium transition-all cursor-pointer"
            >
              {addUser.isPending ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Список учеников */}
      {isLoading ? (
        <p className="text-gray-500">Загрузка...</p>
      ) : (
        <div className="space-y-3">
          {students?.map((student: any) => (
            <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div
                  className={`flex items-center gap-3 flex-1 min-w-0 ${student.user ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={() => student.user && navigate(`/admin/mlm/students/${student.user.id}`)}
                >
                  {student.user?.avatar_url ? (
                    <img src={student.user.avatar_url} className="w-12 h-12 rounded-full" alt="Avatar" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg text-gray-900">
                      {student.user?.first_name?.[0] || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {student.user ? `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim() : student.comment || 'Не зарегистрирован'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {student.user?.username ? `@${student.user.username}` : ''}
                      <span className="text-gray-400 ml-2">ID: {student.telegram_id}</span>
                    </p>
                    {!student.user && (
                      <p className="text-xs text-yellow-500">Ещё не заходил в приложение</p>
                    )}
                  </div>
                  {student.user && (
                    <ChevronRight size={18} className="text-gray-400 shrink-0" />
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm('Удалить ученика? Он потеряет доступ к платформе.')) {
                      removeUser.mutate({ telegramId: student.telegram_id, userId: student.user?.id })
                    }
                  }}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors ml-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Тарифы */}
              {student.user && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-2">Тарифы:</p>
                  <div className="flex flex-wrap gap-2">
                    {student.tariffs?.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-1">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                          t.is_active 
                            ? 'bg-orange-500/20 text-orange-400' 
                            : 'bg-gray-100/50 text-gray-400 opacity-50'
                        }`}>
                          <span>{t.tariff_slug}</span>
                          
                          {/* Переключатель */}
                          <button 
                            onClick={() => toggleTariffActive.mutate({ tariffId: t.id, currentActive: t.is_active })}
                            disabled={toggleTariffActive.isPending}
                            className="hover:opacity-80 transition-opacity disabled:opacity-50"
                            title={t.is_active ? 'Приостановить' : 'Возобновить'}
                          >
                            {t.is_active ? (
                              <Pause size={14} className="text-current" />
                            ) : (
                              <Play size={14} className="text-current" />
                            )}
                          </button>
                          
                          {/* Удалить */}
                          <button 
                            onClick={() => {
                              if (confirm(`Удалить тариф ${t.tariff_slug}?`)) {
                                removeTariff.mutate(t.id)
                              }
                            }}
                            className="hover:text-red-400 transition-colors"
                            title="Удалить тариф"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {!t.is_active && (
                          <span className="text-xs text-gray-400 ml-1">приостановлен</span>
                        )}
                      </div>
                    ))}
                    
                    {/* Добавить тариф */}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addTariff.mutate({ userId: student.user.id, tariffSlug: e.target.value })
                          e.target.value = ''
                        }
                      }}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      defaultValue=""
                    >
                      <option value="">+ Добавить тариф</option>
                      {tariffsList?.filter((t: any) => 
                        !student.tariffs?.some((st: any) => st.tariff_slug === t.slug)
                      ).map((t: any) => (
                        <option key={t.slug} value={t.slug}>{t.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ))}

          {students?.length === 0 && (
            <p className="text-center py-8 text-gray-400">Нет учеников</p>
          )}
        </div>
      )}
    </div>
  )
}
