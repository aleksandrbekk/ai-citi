import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { Coins, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)

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
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 px-6 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            AI CITI
          </h1>
          <p className="text-white/80 text-xs mt-1">Твой AI-помощник</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Приветствие */}
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Привет, <span className="text-orange-500">{firstName}</span>! 👋
          </h2>
        </div>

        {/* Баланс монет */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Монеты для генерации</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {isLoadingCoins ? '...' : coinBalance}
                  </span>
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                </div>
              </div>
            </div>
            <Link
              to="/shop"
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-semibold rounded-full shadow-lg"
            >
              Купить
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            1 монета = 1 генерация карусели
          </p>
        </div>

        {/* Карточка пользователя */}
        {telegramUser && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {telegramUser.first_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </h3>
                {telegramUser.username && (
                  <p className="text-gray-500 text-sm">@{telegramUser.username}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Статус</p>
                <p className="text-orange-500 text-sm font-medium">Активен</p>
              </div>
            </div>
          </div>
        )}

        {/* Персонаж */}
        <div className="flex justify-center pt-4">
          <img
            src="/images/neurochik.png"
            alt="Нейрончик"
            className="w-32 h-auto"
          />
        </div>
      </div>
    </div>
  )
}
