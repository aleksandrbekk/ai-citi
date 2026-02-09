import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Instagram, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function PosterSettings() {
  const navigate = useNavigate()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    setIsConnecting(true)
    // TODO: Реальный OAuth flow через Facebook
    // Пока имитация для скринкаста
    setTimeout(() => {
      setIsConnecting(false)
      setIsConnected(true)
      toast.success('Instagram аккаунт подключен!')
    }, 2000)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    toast.success('Аккаунт отключен')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tools/poster')}
          className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Настройки Instagram</h1>
      </div>

      {/* Подключённый аккаунт */}
      {isConnected ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 mb-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-semibold text-gray-900">@instagram_user</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">Instagram Business</p>
            </div>
          </div>

          {/* Статус токена */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800 font-medium">Токен активен</span>
            </div>
            <p className="text-xs text-green-600 mt-1">Действителен до 10 апреля 2026</p>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors cursor-pointer"
          >
            Отключить аккаунт
          </button>
        </motion.div>
      ) : (
        /* Нет подключения */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 text-center mb-4"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/20">
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Подключите Instagram</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Для автоматической публикации постов подключите свой Instagram Business аккаунт
          </p>

          {/* Кнопка подключения */}
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-60 cursor-pointer"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Подключение...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <ExternalLink className="w-5 h-5" />
                Подключить через Facebook
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* Требования */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-5 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-cyan-500" />
          Требования
        </h3>
        <ul className="text-sm text-gray-600 space-y-2.5">
          <li className="flex items-start gap-2">
            <span className="text-cyan-500 mt-0.5">•</span>
            <span>Instagram <strong>Business</strong> или <strong>Creator</strong> аккаунт</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-500 mt-0.5">•</span>
            <span>Привязанная Facebook страница</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-cyan-500 mt-0.5">•</span>
            <span>Права администратора на странице Facebook</span>
          </li>
        </ul>
      </div>

      {/* Инфо */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-900 mb-2">Как это работает</h3>
        <ul className="text-sm text-gray-600 space-y-1.5">
          <li>📅 Создаёте пост и выбираете время</li>
          <li>🤖 Нейропостер публикует автоматически</li>
          <li>🔑 Токен обновляется каждые 60 дней</li>
          <li>🔒 Данные хранятся безопасно на сервере</li>
        </ul>
      </div>
    </div>
  )
}
