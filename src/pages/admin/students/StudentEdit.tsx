import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStudent, useUpdateStudent, useStudentProgress } from '../../../hooks/admin/useStudents'
import { supabase } from '../../../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

export function StudentEdit() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useStudent(id || '')
  const { data: progress, isLoading: progressLoading } = useStudentProgress(id || '')
  const updateStudent = useUpdateStudent()

  const [tariffSlug, setTariffSlug] = useState('standard')
  const [expiresAt, setExpiresAt] = useState('')

  useEffect(() => {
    if (data?.tariff) {
      setTariffSlug(data.tariff.tariff_slug)
      setExpiresAt(
        data.tariff.expires_at
          ? format(new Date(data.tariff.expires_at), 'yyyy-MM-dd')
          : ''
      )
    } else {
      // Если тарифа нет, устанавливаем значения по умолчанию
      setTariffSlug('standard')
      setExpiresAt('')
    }
  }, [data])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!id || !data) return

    if (!tariffSlug) {
      alert('Выберите тариф')
      return
    }

    try {
      // Проверить есть ли уже тариф у пользователя
      const { data: existingTariff } = await supabase
        .from('user_tariffs')
        .select('id')
        .eq('user_id', id)
        .maybeSingle()

      let error

      if (existingTariff) {
        // Обновить существующий
        const { error: updateError } = await supabase
          .from('user_tariffs')
          .update({ 
            tariff_slug: tariffSlug,
            expires_at: expiresAt || null
          })
          .eq('id', existingTariff.id)
        error = updateError
      } else {
        // Создать новый
        const { error: insertError } = await supabase
          .from('user_tariffs')
          .insert({
            user_id: id,
            tariff_slug: tariffSlug,
            expires_at: expiresAt || null,
            is_active: true
          })
        error = insertError
      }

      if (error) {
        alert('Ошибка: ' + error.message)
        return
      }

      // Обновить кэш
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      
      alert('Тариф сохранён')
      refetch()
    } catch (error: any) {
      console.error('Ошибка сохранения:', error)
      alert('Ошибка сохранения данных: ' + (error?.message || error))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Загрузка...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ученик не найден</div>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/mlm/students')}
        className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Назад к ученикам
      </button>

      <h1 className="text-2xl font-bold mb-6 text-white">Редактировать ученика</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Форма редактирования */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Информация</h2>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Telegram ID</label>
              <input
                type="text"
                value={data.telegram_id}
                disabled
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Username</label>
              <input
                type="text"
                value={data.username || ''}
                disabled
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Имя</label>
              <input
                type="text"
                value={data.first_name || ''}
                disabled
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Тариф</label>
              <select
                value={tariffSlug}
                onChange={(e) => setTariffSlug(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Дата окончания подписки</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={updateStudent.isPending}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {updateStudent.isPending ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/mlm/students')}
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>

        {/* Прогресс по курсу */}
        <div className="bg-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <BookOpen size={20} />
            Прогресс по курсу
          </h2>

          {progressLoading ? (
            <div className="text-center py-8 text-zinc-400">Загрузка...</div>
          ) : progress && progress.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {progress.map((item) => (
                <div
                  key={item.lesson_id}
                  className="bg-zinc-700 rounded-lg p-4"
                >
                  <div className="font-semibold text-white">{item.lesson_title || 'Урок'}</div>
                  {item.module_title && (
                    <div className="text-sm text-zinc-400 mt-1">{item.module_title}</div>
                  )}
                  <div className="text-xs text-zinc-500 mt-2">
                    Пройден: {format(new Date(item.completed_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-400">
              Прогресс отсутствует
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
