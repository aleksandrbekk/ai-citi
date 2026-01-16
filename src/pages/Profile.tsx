import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { Coins, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ReferralSection } from '@/components/ReferralSection'

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
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      <div className="px-4 pt-8 pb-6 space-y-6">
        {/* Приветствие */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Привет, <span className="text-orange-500">{firstName}</span>!
          </h1>
        </div>

        {/* Баланс монет */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl px-6 py-4 shadow-sm border border-orange-100">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs text-gray-500">Ваш баланс</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">
                  {isLoadingCoins ? '...' : coinBalance}
                </span>
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Текст про генерацию */}
          <p className="text-sm text-gray-500 mt-3">
            {coinBalance > 0
              ? `Вам доступно ${Math.floor(coinBalance / 10)} генераций`
              : 'Вам доступна 1 бесплатная генерация'
            }
          </p>

          {/* Кнопка купить */}
          <Link
            to="/shop"
            className="inline-block mt-3 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-semibold rounded-full shadow-lg"
          >
            Купить монеты
          </Link>
        </div>

        {/* Карточка пользователя */}
        {telegramUser && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
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

        {/* Реферальная программа */}
        <ReferralSection />

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
