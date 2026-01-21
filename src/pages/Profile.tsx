import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { Wallet, ShoppingCart, Network, Settings, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Profile() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Пользователь'
  const photoUrl = telegramUser?.photo_url
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)

  const { stats } = useReferrals()

  useEffect(() => {
    const loadCoins = async () => {
      if (telegramUser?.id) {
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)
      }
      setIsLoadingCoins(false)
    }
    loadCoins()
  }, [telegramUser?.id])

  // Количество генераций (30 монет = 1 генерация)
  const generationsCount = Math.floor(coinBalance / 30)

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Профиль пользователя */}
      <div className="px-4 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-orange-400 to-orange-600">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-orange-500">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-white" />
          </div>

          {/* Имя и статус */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {firstName}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-lg text-green-600 font-medium">Активен</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Большая карточка с балансом */}
        <div className="bg-white rounded-3xl shadow-lg p-1 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-400 rounded-[22px] px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-5xl font-bold text-white">
                {isLoadingCoins ? '...' : coinBalance}
              </p>
              <p className="text-white/90 text-lg mt-1">монет</p>
            </div>
          </div>
        </div>

        {/* Сетка с 4 плитками */}
        <div className="grid grid-cols-2 gap-3">
          {/* Купить монеты */}
          <Link
            to="/shop"
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Купить монеты</p>
          </Link>

          {/* Генерации */}
          <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
              <Network className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Генерации</p>
            <p className="text-sm text-gray-500 mt-1">{generationsCount} доступно</p>
          </div>

          {/* Рефералы */}
          <button
            onClick={() => navigate('/referrals')}
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Рефералы</p>
            <p className="text-sm text-gray-500 mt-1">{stats?.total_referrals || 0} партнеров</p>
          </button>

          {/* Настройки */}
          <button
            onClick={() => navigate('/settings')}
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Настройки</p>
          </button>
        </div>
      </div>
    </div>
  )
}
