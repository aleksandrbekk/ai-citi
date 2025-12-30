import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bot, Calendar } from 'lucide-react'

const OWNER_TELEGRAM_ID = 190202791

export function Agents() {
  const navigate = useNavigate()
  const [isOwner, setIsOwner] = useState(false)
  
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
        } catch {}
      }
    }
    
    setIsOwner(telegramId === OWNER_TELEGRAM_ID)
  }, [])

  return (
    <div className="min-h-screen bg-black p-4">
      <h1 className="text-2xl font-bold text-white mb-6">🤖 AI Агенты</h1>
      
      <div className="grid grid-cols-2 gap-4">
        {/* AI FERMA - заглушка */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 opacity-50">
          <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-white font-semibold mb-1">AI FERMA</h3>
          <p className="text-zinc-500 text-sm">Скоро</p>
        </div>
        
        {/* Карусели - доступны всем */}
        <div
          onClick={() => navigate('/agents/carousel')}
          className="bg-white/10 backdrop-blur rounded-2xl p-6 cursor-pointer hover:bg-white/20 transition-all"
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-4">
            <span className="text-3xl">🎠</span>
          </div>
          <h3 className="text-white font-semibold text-lg">Карусели</h3>
          <p className="text-gray-400 text-sm mt-1">AI-генератор для Instagram</p>
        </div>
        
        {/* Нейропостер - только для владельца */}
        {isOwner && (
          <Link 
            to="/tools/poster"
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-white font-semibold mb-1">Нейропостер</h3>
            <p className="text-zinc-500 text-sm">Планировщик Instagram</p>
          </Link>
        )}
      </div>
    </div>
  )
}
