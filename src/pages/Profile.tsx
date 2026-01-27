import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { Wallet, ShoppingCart, Users, Settings, Star, TrendingUp, ChevronRight } from 'lucide-react'
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white pb-24">
      {/* Header с профилем */}
      <div className="px-4 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Аватар с градиентным кольцом */}
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/20">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover border-2 border-white"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-orange-500">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white shadow-sm" />
          </div>

          {/* Имя и статус */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">
              {firstName}
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 font-medium">Активен</span>
            </div>
          </div>

          {/* Кнопка настроек */}
          <button
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow-md transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Карточка баланса */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Wallet className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white/80 text-sm font-medium">Ваш баланс</p>
                <p className="text-4xl font-bold text-white mt-0.5">
                  {isLoadingCoins ? '...' : coinBalance.toLocaleString()}
                  <span className="text-lg font-normal text-white/80 ml-2">монет</span>
                </p>
              </div>
            </div>
          </div>

          {/* Быстрая статистика под балансом */}
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 py-3 px-4 text-center">
              <p className="text-xs text-gray-500">Потрачено</p>
              <p className="text-lg font-semibold text-gray-900">0</p>
            </div>
            <div className="flex-1 py-3 px-4 text-center">
              <p className="text-xs text-gray-500">Заработано</p>
              <p className="text-lg font-semibold text-cyan-600">{stats?.total_coins_earned || 0}</p>
            </div>
          </div>
        </div>

        {/* Сетка действий */}
        <div className="grid grid-cols-2 gap-3">
          {/* Купить монеты */}
          <Link
            to="/shop"
            className="group bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex flex-col hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-200 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-3 shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <p className="text-base font-semibold text-gray-900">Купить монеты</p>
            <p className="text-xs text-gray-500 mt-0.5">Пополнить баланс</p>
          </Link>

          {/* Рефералы */}
          <button
            onClick={() => navigate('/referrals')}
            className="group bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-5 flex flex-col text-left hover:shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-200 transition-all duration-200 cursor-pointer active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center mb-3 shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform duration-200">
              <Users className="w-6 h-6 text-white" />
            </div>
            <p className="text-base font-semibold text-gray-900">Партнёры</p>
            <p className="text-xs text-gray-500 mt-0.5">{stats?.total_referrals || 0} приглашённых</p>
          </button>
        </div>

        {/* Секция достижений */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Достижения</h2>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Скоро</span>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3 opacity-60">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-200 flex items-center justify-center"
                >
                  <span className="text-gray-300 text-lg">?</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">Выполняй задания и получай награды</p>
          </div>
        </div>

        {/* Статистика активности */}
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm">
          <button
            onClick={() => navigate('/referrals')}
            className="w-full px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors duration-200 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900">Партнёрский доход</p>
                <p className="text-xs text-gray-500">Заработано с рефералов</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-green-600">+{stats?.total_coins_earned || 0}</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
