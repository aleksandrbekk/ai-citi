import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { Wallet, TrendingUp, Users, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'
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

  // Количество генераций (10 монет = 1 генерация)
  const generationsCount = Math.floor(coinBalance / 10)

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Хедер с аватаром слева и именем справа */}
      <div className="bg-[#FFF8F5] pt-6 pb-4 px-4">
        <div className="flex items-center gap-4">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full p-1.5 bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg">
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
            {/* Зелёный индикатор онлайн - убран, статус будет в тексте */}
          </div>

          {/* Имя и статус */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              {firstName}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-lg font-medium text-green-600">Активен</span>
            </div>
          </div>
        </div>
      </div>

      {/* Баланс - большая оранжевая плашка */}
      <div className="px-4 mb-4">
        <div className="bg-white rounded-3xl shadow-lg p-1">
          <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 rounded-[22px] px-6 py-4 flex items-center gap-4">
            {/* Золотая монета */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 shadow-xl shadow-black/20 flex items-center justify-center relative overflow-hidden flex-shrink-0">
              {/* Внутреннее кольцо */}
              <div className="absolute inset-1.5 rounded-full border-3 border-yellow-300/30"></div>
              {/* Центральный символ */}
              <div className="text-2xl font-bold text-yellow-900/80">₽</div>
              {/* Блик */}
              <div className="absolute top-1 left-2 w-6 h-6 bg-white/40 rounded-full blur-sm"></div>
            </div>

            {/* Текст баланса */}
            <div className="flex-1">
              <p className="text-4xl font-bold text-gray-900">
                {isLoadingCoins ? '...' : coinBalance} <span className="text-2xl font-semibold">монет</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Плитка 2x2 */}
      <div className="px-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Купить монеты */}
          <Link to="/shop" className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start gap-3 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-semibold text-gray-900">Пополнить</p>
          </Link>

          {/* Генерации */}
          <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-semibold text-gray-900">Генерации ({generationsCount})</p>
          </div>

          {/* Рефералы */}
          <Link to="/referrals" className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start gap-3 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-semibold text-gray-900">Рефералы ({stats?.total_referrals || 0})</p>
          </Link>

          {/* Настройки */}
          <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <p className="text-xl font-semibold text-gray-900">Настройки</p>
          </div>
        </div>
      </div>
    </div>
  )
}
