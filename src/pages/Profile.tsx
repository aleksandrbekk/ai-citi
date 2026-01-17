import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { Wallet, TrendingUp, Sparkles, Users } from 'lucide-react'
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
  const referralEarnings = stats?.total_coins_earned || 0

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Тёмный градиентный хедер */}
      <div className="relative bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] pt-8 pb-8 px-4">
        {/* Декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/2 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-4xl font-bold text-orange-400">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-[3px] border-[#16213e] shadow-lg" />
          </div>

          {/* Имя пользователя */}
          <h1 className="mt-4 text-2xl font-bold text-white">
            {firstName}
          </h1>

          {/* Статус */}
          <div className="mt-3 flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-orange-400 font-semibold">Активен</span>
          </div>
        </div>
      </div>

      {/* Белая карточка с балансом */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-3xl shadow-xl p-5">
          {/* Баланс монет */}
          <div className="text-center mb-5">
            <div className="text-5xl font-bold text-gray-900">
              {isLoadingCoins ? '...' : coinBalance}
            </div>
            <p className="text-gray-500 text-sm mt-1">МОНЕТ</p>
          </div>

          {/* Прогресс бар */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((coinBalance % 100) + 10, 100)}%` }}
            />
          </div>

          {/* Плитка 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {/* Баланс */}
            <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-yellow-900" />
              </div>
              <p className="text-sm font-medium text-gray-700">Баланс</p>
            </div>

            {/* Генерации */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-700">Генерации</p>
              <p className="text-lg font-bold text-gray-900">{generationsCount}</p>
            </div>

            {/* Рефералы */}
            <Link to="/referrals" className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center relative">
                <Users className="w-6 h-6 text-white" />
                {stats && stats.total_referrals > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{stats.total_referrals}</span>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-gray-700">Рефералы</p>
              {referralEarnings > 0 && (
                <p className="text-xs text-orange-600 font-semibold">+{referralEarnings}</p>
              )}
            </Link>

            {/* Пополнить */}
            <Link to="/shop" className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-700">Пополнить</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
