import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BotIcon, CarouselIcon, CalendarIcon, SparkleIcon, BackIcon, LockIcon } from '@/components/ui/icons'
import { BookOpen } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const OWNER_TELEGRAM_ID = 190202791

export function Agents() {
  const navigate = useNavigate()
  const [isOwner, setIsOwner] = useState(false)
  const tariffs = useAuthStore((state) => state.tariffs)

  // Проверяем есть ли платный тариф
  const hasPaidAccess = tariffs.length > 0

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    let telegramId: number | null = null

    if (tg?.initDataUnsafe?.user?.id) {
      telegramId = tg.initDataUnsafe.user.id
    } else {
      const stored = localStorage.getItem('telegram_user')
      if (stored) {
        try {
          telegramId = JSON.parse(stored).id
        } catch { }
      }
    }

    setIsOwner(telegramId === OWNER_TELEGRAM_ID)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      {/* Декоративные элементы */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-0 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" />

      {/* Header */}
      <div className="sticky top-0 z-20 nav-glass px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <BackIcon size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <SparkleIcon size={24} className="text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">AI Агенты</h1>
        </div>
      </div>

      <div className="relative z-10 p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* AI FERMA - заглушка */}
          <div className="glass-card p-5 opacity-50">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
              <BotIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">AI FERMA</h3>
            <p className="text-gray-400 text-sm">Скоро</p>
          </div>

          {/* Карусели - только для платных пользователей */}
          <div
            onClick={() => hasPaidAccess && navigate('/agents/carousel')}
            className={`glass-card p-5 transition-all group relative ${
              hasPaidAccess ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
            }`}
          >
            {!hasPaidAccess && (
              <div className="absolute top-3 right-3">
                <LockIcon className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow">
              <CarouselIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">Карусели</h3>
            <p className="text-gray-500 text-sm">
              {hasPaidAccess ? 'AI-генератор для Instagram' : 'Требуется подписка'}
            </p>
          </div>

          {/* Кармалогик Коуч */}
          <Link
            to="/agents/karmalogik"
            className="glass-card p-5 hover:scale-[1.02] transition-all group"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">Кармалогик</h3>
            <p className="text-gray-500 text-sm">AI-коуч по 6 Сутрам</p>
          </Link>

          {/* Нейропостер - только для владельца */}
          {isOwner && (
            <Link
              to="/tools/poster"
              className="glass-card p-5 hover:scale-[1.02] transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/30 transition-shadow">
                <CalendarIcon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-gray-900 font-semibold mb-1">Нейропостер</h3>
              <p className="text-gray-500 text-sm">Планировщик Instagram</p>
            </Link>
          )}
        </div>

        {/* Промо-баннер */}
        <div className="mt-6 glass-card-strong p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <SparkleIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold mb-1">Создавай с AI</h3>
              <p className="text-gray-500 text-sm">
                Генерируй карусели для Instagram за секунды.
                Выбирай стиль и получай готовый контент.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
