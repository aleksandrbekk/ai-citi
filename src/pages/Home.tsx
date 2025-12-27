import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { checkIsCurator } from '@/lib/supabase'
import { Map } from 'lucide-react'

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
    // Получить user_id текущего пользователя и проверить
    const checkCurator = async () => {
      // Получаем user по telegram_id
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      {/* Приветствие */}
      <h1 className="text-3xl font-bold text-white mb-2">
        Привет, {userName || 'Гость'}! 👋
      </h1>
      <p className="text-zinc-400 mb-8">
        Добро пожаловать в НЕЙРОГОРОД
      </p>
      
      {/* Логотип */}
      <div className="w-32 h-32 mb-8 flex items-center justify-center">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
          <Map className="w-16 h-16 text-white" />
        </div>
      </div>
      
      {/* Кнопка проверки ДЗ только для кураторов */}
      {isCurator && (
        <Link 
          to="/curator"
          className="bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
        >
          📋 Проверка ДЗ
        </Link>
      )}
    </div>
  )
}

