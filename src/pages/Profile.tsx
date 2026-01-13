import { useNavigate } from 'react-router-dom'
import { getTelegramUser } from '@/lib/telegram'
import { Settings } from 'lucide-react'

// Админские telegram ID
const ADMIN_IDS = [643763835, 190202791, 1762872372]

export default function Profile() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const isAdmin = telegramUser?.id && ADMIN_IDS.includes(telegramUser.id)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Профиль</h1>
          {isAdmin && (
            <button
              onClick={() => navigate('/mini-admin')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Settings size={18} />
              Админка
            </button>
          )}
        </div>

        {/* Информация о пользователе */}
        {telegramUser && (
          <div className="glass-card/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">
                {telegramUser.first_name?.[0] || '?'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </h2>
                {telegramUser.username && (
                  <p className="text-gray-500">@{telegramUser.username}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
