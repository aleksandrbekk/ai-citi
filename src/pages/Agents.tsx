import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CarouselIcon, CalendarIcon, SparkleIcon, LockIcon } from '@/components/ui/icons'
import { useAuthStore } from '@/store/authStore'
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode'
import { toast } from 'sonner'

const OWNER_TELEGRAM_ID = 643763835

export function Agents() {
  const navigate = useNavigate()
  const [isOwner, setIsOwner] = useState(false)
  const tariffs = useAuthStore((state) => state.tariffs)
  const { isMaintenanceMode, message } = useMaintenanceMode()

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
      <div className="sticky top-0 z-20 nav-glass px-4 py-4 flex items-center gap-2">
        <SparkleIcon size={24} className="text-orange-500" />
        <h1 className="text-xl font-bold text-gray-900">AI Агенты</h1>
      </div>

      <div className="relative z-10 p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Карусели - только для платных пользователей */}
          <div
            onClick={() => {
              if (isMaintenanceMode) {
                toast.info(message || 'Технические работы. Скоро всё заработает!')
                return
              }
              if (hasPaidAccess) navigate('/agents/carousel')
            }}
            className={`glass-card p-5 transition-all group relative ${isMaintenanceMode
              ? 'opacity-60 cursor-pointer'
              : hasPaidAccess ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
              }`}
          >
            {(isMaintenanceMode || !hasPaidAccess) && (
              <div className="absolute top-3 right-3">
                <LockIcon className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow">
              <CarouselIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-gray-900 font-semibold mb-1">Карусели</h3>
            <p className="text-gray-500 text-sm">
              {isMaintenanceMode ? 'Тех. работы' : hasPaidAccess ? 'AI-генератор для Instagram' : 'Требуется подписка'}
            </p>
          </div>

          {/* ИИ КОУЧ */}
          <div
            onClick={() => {
              if (isMaintenanceMode) {
                toast.info(message || 'Технические работы. Скоро всё заработает!')
                return
              }
              navigate('/agents/karmalogik')
            }}
            className={`glass-card p-5 transition-all group ${isMaintenanceMode ? 'opacity-60 cursor-pointer' : 'cursor-pointer hover:scale-[1.02]'
              }`}
          >
            {isMaintenanceMode && (
              <div className="absolute top-3 right-3">
                <LockIcon className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <img
              src="/images/ai-coach-avatar.png"
              alt="AI-Coach"
              className="w-14 h-14 rounded-2xl object-cover mb-4 shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/40 transition-shadow"
            />
            <h3 className="text-gray-900 font-semibold mb-1">AI-Coach</h3>
            <p className="text-gray-500 text-sm">{isMaintenanceMode ? 'Тех. работы' : 'Твой внутренний компас'}</p>
          </div>

          {/* Нейропостер - только для владельца */}
          {isOwner && (
            <Link
              to="/tools/poster"
              className="glass-card p-5 hover:scale-[1.02] transition-all group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/30 transition-shadow">
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
