import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { Coins, Sparkles, Zap, Crown, Rocket, Gift } from 'lucide-react'

// Пакеты монет (цены - заглушки, потом заменим)
const coinPackages = [
  {
    id: 'starter',
    name: 'Старт',
    coins: 5,
    price: 99,
    icon: Zap,
    color: 'from-blue-400 to-blue-500',
    shadow: 'shadow-blue-500/30',
    popular: false,
  },
  {
    id: 'basic',
    name: 'Базовый',
    coins: 15,
    price: 249,
    bonus: 2,
    icon: Sparkles,
    color: 'from-purple-400 to-purple-500',
    shadow: 'shadow-purple-500/30',
    popular: true,
  },
  {
    id: 'pro',
    name: 'Про',
    coins: 35,
    price: 499,
    bonus: 5,
    icon: Rocket,
    color: 'from-orange-400 to-orange-500',
    shadow: 'shadow-orange-500/30',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Премиум',
    coins: 100,
    price: 999,
    bonus: 20,
    icon: Crown,
    color: 'from-yellow-400 to-amber-500',
    shadow: 'shadow-amber-500/30',
    popular: false,
  },
]

export function Shop() {
  const telegramUser = getTelegramUser()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

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

  const handleBuyPackage = (packageId: string) => {
    setSelectedPackage(packageId)
    // TODO: Интеграция с платёжной системой
    alert('Оплата скоро будет доступна!')
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 px-6 py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Магазин
          </h1>
          <p className="text-white/80 text-xs mt-1">Купи монеты для генерации</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Текущий баланс */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Ваш баланс</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {isLoadingCoins ? '...' : coinBalance}
                </span>
                <span className="text-gray-500">монет</span>
              </div>
            </div>
          </div>
        </div>

        {/* Заголовок пакетов */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">Выберите пакет</h2>
          <p className="text-xs text-gray-500 mt-1">1 монета = 1 генерация карусели</p>
        </div>

        {/* Пакеты монет */}
        <div className="space-y-3">
          {coinPackages.map((pkg) => {
            const Icon = pkg.icon
            return (
              <button
                key={pkg.id}
                onClick={() => handleBuyPackage(pkg.id)}
                className={`w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-left transition-all hover:shadow-lg ${selectedPackage === pkg.id ? 'ring-2 ring-orange-500' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg ${pkg.shadow}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{pkg.name}</p>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">
                          {pkg.coins} монет
                          {pkg.bonus && (
                            <span className="text-green-500 font-medium"> +{pkg.bonus} бонус</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{pkg.price} ₽</p>
                    <p className="text-xs text-gray-400">
                      {Math.round(pkg.price / (pkg.coins + (pkg.bonus || 0)))} ₽/монета
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Бонус за подписку */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Подписка PRO</p>
              <p className="text-xs text-gray-500">50 монет/месяц + эксклюзивные шаблоны</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">999 ₽</p>
              <p className="text-xs text-gray-400">/месяц</p>
            </div>
          </div>
          <button
            onClick={() => alert('Подписка скоро будет доступна!')}
            className="w-full mt-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl"
          >
            Оформить подписку
          </button>
        </div>

        {/* Информация */}
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p>Монеты не сгорают и действуют бессрочно</p>
          <p>Оплата через Telegram Stars или карту</p>
        </div>
      </div>
    </div>
  )
}
