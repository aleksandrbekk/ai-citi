import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'

interface PaywallProps {
  title: string
  description?: string
}

export default function Paywall({
  title,
  description = 'Эта функция доступна для пользователей с активной подпиской.'
}: PaywallProps) {
  const navigate = useNavigate() // для кнопки "Оформить подписку"

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
            <Lock size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-400">Требуется подписка</p>
          </div>
        </div>
      </div>

      {/* Locked content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Lock size={40} className="text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
          <p className="text-gray-500 mb-6">
            {description}
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
          >
            Оформить подписку
          </button>
        </div>
      </div>
    </div>
  )
}
