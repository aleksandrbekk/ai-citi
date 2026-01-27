import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'
import { getTelegramUser } from '../../lib/telegram'
import { isAdmin } from '../../config/admins'
import { ArrowLeft, Shield, AlertCircle } from 'lucide-react'

export function AdminLogin() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loginByTelegramId, isLoading } = useAdminAuth()
  const navigate = useNavigate()

  // Проверяем Telegram авторизацию при загрузке
  useEffect(() => {
    const tgUser = getTelegramUser()
    if (tgUser?.id && isAdmin(tgUser.id)) {
      // Автоматический вход по Telegram ID
      if (loginByTelegramId()) {
        navigate('/admin')
      }
    }
  }, [loginByTelegramId, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Сначала пробуем Telegram
    const tgUser = getTelegramUser()
    if (tgUser?.id && isAdmin(tgUser.id)) {
      if (loginByTelegramId()) {
        navigate('/admin')
        return
      }
    }

    // Форма только для dev режима
    const success = await login(username, password)
    if (success) {
      navigate('/admin')
    } else {
      setError('Доступ только для администраторов через Telegram')
    }
  }

  const tgUser = getTelegramUser()
  const isTelegramAdmin = isAdmin(tgUser?.id)
  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      {/* Кнопка назад */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Назад</span>
      </button>

      <div className="bg-zinc-800 rounded-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="text-amber-500" size={28} />
          <h1 className="text-2xl font-bold text-center text-white">AI CITI</h1>
        </div>
        <p className="text-zinc-400 text-center mb-8">Админ-панель</p>

        {/* Если есть Telegram и это админ - показываем кнопку входа */}
        {isTelegramAdmin && (
          <div className="mb-6">
            <button
              onClick={() => {
                if (loginByTelegramId()) {
                  navigate('/admin')
                }
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-500/20"
            >
              Войти как {tgUser?.first_name || 'Администратор'}
            </button>
            <p className="text-green-400 text-sm text-center mt-2">
              ✓ Вы авторизованы через Telegram
            </p>
          </div>
        )}

        {/* Если нет Telegram или не админ */}
        {!isTelegramAdmin && (
          <div className="bg-zinc-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-zinc-300 text-sm">
                  Вход в админ-панель доступен только через Telegram Mini App для авторизованных администраторов.
                </p>
                {tgUser && (
                  <p className="text-zinc-500 text-xs mt-2">
                    Ваш ID: {tgUser.id} — не в списке админов
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dev форма - только в dev режиме */}
        {isDev && (
          <>
            <div className="border-t border-zinc-700 pt-6 mt-6">
              <p className="text-zinc-500 text-xs text-center mb-4">DEV MODE</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="dev"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="dev"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Вход...' : 'Dev Login'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
