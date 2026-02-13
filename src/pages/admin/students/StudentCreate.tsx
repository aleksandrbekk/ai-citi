import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateStudent } from '../../../hooks/admin/useStudents'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export function StudentCreate() {
  const navigate = useNavigate()
  const createStudent = useCreateStudent()

  const [telegramId, setTelegramId] = useState('')
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [tariffSlug, setTariffSlug] = useState('standard')
  const [expiresAt, setExpiresAt] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!telegramId.trim()) {
      toast.error('Telegram ID обязателен')
      return
    }

    const telegramIdNum = parseInt(telegramId)
    if (isNaN(telegramIdNum)) {
      toast.error('Telegram ID должен быть числом')
      return
    }

    try {
      const result = await createStudent.mutateAsync({
        telegram_id: telegramIdNum,
        username: username.trim() || null,
        first_name: firstName.trim() || null,
        tariff_slug: tariffSlug,
        expires_at: expiresAt || null,
      })

      navigate(`/admin/mlm/students/${result.user.id}`)
    } catch (error: any) {
      console.error('Ошибка создания ученика:', error)
      toast.error(error.message || 'Ошибка создания ученика')
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/admin/mlm/students')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        Назад к ученикам
      </button>

      <h1 className="text-2xl font-bold mb-6 text-gray-900">Создать ученика</h1>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 max-w-2xl shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-2">
              Telegram ID <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              value={telegramId}
              onChange={(e) => setTelegramId(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="123456789"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="@username"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Имя</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Имя"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Тариф</label>
            <select
              value={tariffSlug}
              onChange={(e) => setTariffSlug(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="standard">Standard</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-2">Дата окончания подписки</label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={createStudent.isPending}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 hover:shadow-lg text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              {createStudent.isPending ? 'Создание...' : 'Создать'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/mlm/students')}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
