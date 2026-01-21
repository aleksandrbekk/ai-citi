import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Trash2, UserPlus, Pause, Play } from 'lucide-react'

export function StudentsList() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTelegramId, setNewTelegramId] = useState('')
  const [newComment, setNewComment] = useState('')

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

  // Добавить пользователя в whitelist
  const addUser = useMutation({
    mutationFn: async () => {
      // Добавляем в whitelist
      const { error: wlError } = await supabase
        .from('allowed_users')
        .insert({ 
          telegram_id: parseInt(newTelegramId), 
          comment: newComment || null 
        })
      if (wlError) throw wlError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-full'] })
      setNewTelegramId('')
      setNewComment('')
      setShowAddForm(false)
    }
  })

  // Удалить пользователя
  const removeUser = useMutation({
    mutationFn: async (telegramId: number) => {
      // Удаляем из whitelist
      await supabase
        .from('allowed_users')
        .delete()
        .eq('telegram_id', telegramId)
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="number"
              value={newTelegramId}
              onChange={(e) => setNewTelegramId(e.target.value)}
              placeholder="Telegram ID *"
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Имя / комментарий"
              className="px-4 py-2 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => addUser.mutate()}
              disabled={!newTelegramId || addUser.isPending}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-gray-900 transition-colors"
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
                <div className="flex items-center gap-3">
                  {student.user?.avatar_url ? (
                    <img src={student.user.avatar_url} className="w-12 h-12 rounded-full" alt="Avatar" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg text-gray-900">
                      {student.user?.first_name?.[0] || '?'}
                    </div>
                  )}
                  <div>
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
                </div>
                <button
                  onClick={() => {
                    if (confirm('Удалить ученика? Он потеряет доступ к платформе.')) {
                      removeUser.mutate(student.telegram_id)
                    }
                  }}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
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
