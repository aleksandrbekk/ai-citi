import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { checkIsCurator } from '@/lib/supabase'
import { CityIcon, SparkleIcon } from '@/components/ui/icons'

export default function Home() {
  const [isCurator, setIsCurator] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    // Получаем имя из Telegram или localStorage
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.first_name) {
      setUserName(tg.initDataUnsafe.user.first_name)
    } else {
      const savedUser = localStorage.getItem('tg_user')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setUserName(user.first_name || 'Гость')
        } catch {
          setUserName('Гость')
        }
      } else {
        setUserName('Гость')
      }
    }
  }, [])

  useEffect(() => {
    const checkCurator = async () => {
      const tg = window.Telegram?.WebApp
      const savedUser = localStorage.getItem('tg_user')
      let telegramId = tg?.initDataUnsafe?.user?.id
      if (!telegramId && savedUser) {
        telegramId = JSON.parse(savedUser).id
      }

      if (telegramId) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (userData) {
          const curator = await checkIsCurator(userData.id)
          setIsCurator(curator)
        }
      }
    }
    checkCurator()
  }, [])

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
          Привет, {userName || 'Гость'}!
        </h1>
        <p className="text-gray-500 mb-8 flex items-center justify-center gap-2">
          <SparkleIcon size={18} className="text-orange-500" />
          Добро пожаловать в НЕЙРОГОРОД
          <SparkleIcon size={18} className="text-orange-500" />
        </p>

        {/* Кнопка проверки ДЗ только для кураторов */}
        {isCurator && (
          <Link
            to="/curator"
            className="btn-primary px-8 py-4 inline-flex items-center gap-2 text-lg"
          >
            📋 Проверка ДЗ
          </Link>
        )}
      </div>

      {/* Карточки быстрого доступа */}
      <div className="relative z-10 mt-12 w-full max-w-sm">
        <Link to="/agents" className="glass-card block p-6 hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <SparkleIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">AI Агенты</h3>
              <p className="text-gray-500 text-sm">Создавай контент с AI</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
