import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Instagram, CheckCircle, Link2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function PosterSettings() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [connectedUsername, setConnectedUsername] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    if (!username.trim()) {
      toast.error('Введите имя аккаунта')
      return
    }

    setIsConnecting(true)
    // TODO: Реальное подключение
    setTimeout(() => {
      setIsConnecting(false)
      setConnectedUsername(username.replace('@', ''))
      setIsConnected(true)
      setUsername('')
      toast.success('Instagram подключён!')
    }, 1500)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    setConnectedUsername('')
    toast.success('Аккаунт отключён')
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
        <h1 className="text-xl font-bold text-gray-900">Подключить Instagram</h1>
      </div>

      {/* Подключённый аккаунт */}
      {isConnected ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 mb-4"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-semibold text-gray-900">@{connectedUsername}</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-green-600 font-medium">Подключён</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-green-800">
              Посты будут публиковаться в этот аккаунт автоматически
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors cursor-pointer text-sm"
          >
            Отключить
          </button>
        </motion.div>
      ) : (
        /* Форма подключения */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 mb-4"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/20">
            <Instagram className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Укажите ваш Instagram</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Введите имя аккаунта для публикации постов
          </p>

          {/* Поле ввода */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ваш_аккаунт"
              className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition-all text-base"
            />
          </div>

          {/* Кнопка */}
          <button
            onClick={handleConnect}
            disabled={isConnecting || !username.trim()}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isConnecting ? (
              <span className="flex items-center justify-center gap-2">
                <motion.div
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Подключаю...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Link2 className="w-5 h-5" />
                Подключить
              </span>
            )}
          </button>
        </motion.div>
      )}

      {/* Как работает */}
      <div className="bg-cyan-50/80 border border-cyan-200/60 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Как это работает</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">1</div>
            <p className="text-sm text-gray-700">Укажите ваш Instagram аккаунт</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">2</div>
            <p className="text-sm text-gray-700">Создайте пост и выберите время</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">3</div>
            <p className="text-sm text-gray-700">Нейропостер опубликует автоматически</p>
          </div>
        </div>
      </div>
    </div>
  )
}
