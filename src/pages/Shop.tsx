import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { Coins, Sparkles, Zap, Crown, Rocket, Star } from 'lucide-react'

// Пакеты монет (цены - заглушки)
const coinPackages = [
  {
    id: 'starter',
    name: 'Старт',
    coins: 5,
    price: 99,
    icon: Zap,
    color: 'from-blue-400 to-blue-500',
    shadow: 'shadow-blue-500/30',
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
  },
]

// Пакеты подписок (заглушки)
const subscriptionPackages = [
  {
    id: 'lite',
    name: 'Lite',
    coins: 30,
    price: 499,
    period: 'месяц',
    features: ['30 монет/месяц', 'Базовые шаблоны'],
    color: 'from-blue-400 to-blue-500',
  },
  {
    id: 'pro',
    name: 'Pro',
    coins: 50,
    price: 799,
    period: 'месяц',
    features: ['50 монет/месяц', 'Все шаблоны', 'Приоритет генерации'],
    color: 'from-purple-400 to-purple-500',
    popular: true,
  },
  {
    id: 'business',
    name: 'Business',
    coins: 150,
    price: 1990,
    period: 'месяц',
    features: ['150 монет/месяц', 'Все шаблоны', 'VIP поддержка', 'Персональный менеджер'],
    color: 'from-orange-400 to-orange-500',
  },
]

export function Shop() {
  const telegramUser = getTelegramUser()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [activeTab, setActiveTab] = useState<'coins' | 'subscription'>('coins')

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

  const handleBuy = (_id: string) => {
    // TODO: Интеграция с платёжной системой
    alert('Оплата скоро будет доступна!')
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-2xl font-bold text-center">
          <span className="text-gray-900">МАГАЗИН </span>
          <span className="text-orange-500">AI CITI</span>
        </h1>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'coins'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-2" />
            МОНЕТЫ
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'subscription'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Star className="w-4 h-4 inline mr-2" />
            ПОДПИСКА
          </button>
        </div>
      </div>

      {/* Баланс */}
      <div className="px-4 pb-4">
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
      </div>

      {/* Content */}
      <div className="px-4 space-y-3">
        {activeTab === 'coins' && (
          <>
            <p className="text-xs text-gray-500 text-center">1 монета = 1 слайд</p>
            {coinPackages.map((pkg) => {
              const Icon = pkg.icon
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleBuy(pkg.id)}
                  className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.98]"
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
                              <span className="text-green-500 font-medium"> +{pkg.bonus}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{pkg.price} ₽</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {activeTab === 'subscription' && (
          <>
            <p className="text-xs text-gray-500 text-center">Ежемесячное пополнение монет + бонусы</p>
            {subscriptionPackages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleBuy(pkg.id)}
                className={`w-full bg-white border-2 rounded-2xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.98] ${
                  pkg.popular ? 'border-orange-400' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg`}>
                      <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{pkg.name}</p>
                        {pkg.popular && (
                          <span className="bg-orange-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            ХИТ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">{pkg.coins} монет/мес</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{pkg.price} ₽</p>
                    <p className="text-xs text-gray-400">/{pkg.period}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pkg.features.map((feature, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                      {feature}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 pt-6">
        <p className="text-center text-xs text-gray-400">
          Монеты не сгорают • Оплата через Telegram
        </p>
      </div>
    </div>
  )
}
