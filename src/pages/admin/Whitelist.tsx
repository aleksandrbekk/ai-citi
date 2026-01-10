import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Trash2, Plus } from 'lucide-react'

export default function Whitelist() {
  const queryClient = useQueryClient()
  const [telegramId, setTelegramId] = useState('')
  const [comment, setComment] = useState('')

  // Загрузить список
  const { data: users, isLoading } = useQuery({
    queryKey: ['whitelist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Добавить пользователя
  const addUser = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('allowed_users')
        .insert({ telegram_id: parseInt(telegramId), comment: comment || null })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] })
      setTelegramId('')
      setComment('')
    }
  })

  // Удалить пользователя
  const removeUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('allowed_users')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whitelist'] })
    }
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Доступ к платформе</h1>

      {/* Форма добавления */}
      <div className="bg-zinc-800 rounded-xl p-4 mb-6">
        <h2 className="font-medium mb-3">Добавить пользователя</h2>
        <div className="flex gap-3">
          <input
            type="number"
            value={telegramId}
            onChange={(e) => setTelegramId(e.target.value)}
            placeholder="Telegram ID"
            className="flex-1 px-4 py-2 bg-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Комментарий (необязательно)"
            className="flex-1 px-4 py-2 bg-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={() => addUser.mutate()}
            disabled={!telegramId || addUser.isPending}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg flex items-center gap-2 text-white transition-colors"
          >
            <Plus size={18} />
            Добавить
          </button>
        </div>
      </div>

      {/* Список пользователей */}
      {isLoading ? (
        <p className="text-zinc-400">Загрузка...</p>
      ) : (
        <div className="bg-zinc-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-700">
              <tr>
                <th className="text-left px-4 py-3">Telegram ID</th>
                <th className="text-left px-4 py-3">Комментарий</th>
                <th className="text-left px-4 py-3">Добавлен</th>
                <th className="w-16"></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: any) => (
                <tr key={user.id} className="border-t border-zinc-700">
                  <td className="px-4 py-3 font-mono">{user.telegram_id}</td>
                  <td className="px-4 py-3 text-zinc-400">{user.comment || '—'}</td>
                  <td className="px-4 py-3 text-zinc-500 text-sm">
                    {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('Удалить пользователя?')) {
                          removeUser.mutate(user.id)
                        }
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users?.length === 0 && (
            <p className="text-center py-8 text-zinc-500">Список пуст</p>
          )}
        </div>
      )}
    </div>
  )
}
