import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CityIcon, SparkleIcon, LoaderIcon } from '@/components/ui/icons'

// ID администраторов — им показываем обычную главную
const ADMIN_IDS = [643763835, 190202791, 1762872372]

export default function Home() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Получаем данные пользователя
    const tg = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    let telegramId = tg?.initDataUnsafe?.user?.id
    let firstName = tg?.initDataUnsafe?.user?.first_name

    if (!telegramId && savedUser) {
      try {
        const user = JSON.parse(savedUser)
        telegramId = user.id
        firstName = user.first_name
      } catch {
        // ignore
      }
    }

    setUserName(firstName || 'Гость')

    // Если НЕ админ — редирект на карусели
    if (telegramId && !ADMIN_IDS.includes(telegramId)) {
      navigate('/agents/carousel', { replace: true })
      return
    }

    setIsChecking(false)
  }, [navigate])

  // Пока проверяем — показываем лоадер
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <LoaderIcon size={48} className="text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col items-center justify-center px-4">
      {/* Декоративные элементы */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-100/40 rounded-full blur-3xl" />

      {/* Контент */}
      <div className="relative z-10 text-center">
        {/* Логотип */}
        <div className="mb-6 inline-flex">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-xl shadow-orange-500/30 animate-float">
            <CityIcon className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Приветствие */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Привет, {userName}!
        </h1>
        <p className="text-gray-500 mb-8 flex items-center justify-center gap-2">
          <SparkleIcon size={18} className="text-orange-500" />
          Добро пожаловать в НЕЙРОГОРОД
          <SparkleIcon size={18} className="text-orange-500" />
        </p>

        {/* Админ-панель */}
        <p className="text-sm text-gray-400">Панель администратора</p>
      </div>
    </div>
  )
}
