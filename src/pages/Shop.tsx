import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { haptic } from '@/lib/haptic'
import { Star, User, Palette, Coins } from 'lucide-react'
import { StylesTab } from '@/components/shop/StylesTab'

// Типы для пакетов
interface CoinPackage {
  id: string
  name: string
  coins: number
  generations: number
  priceRub: number
  oldPriceRub: number // Перечёркнутая "старая" цена
  pricePerCoin: number
  savings: number
  popular?: boolean
  available: boolean
  maxPerUser: number // Лимит покупок на человека
}

// Пакеты монет (нейронов) — 5 уровней
// Со скидками (перечёркнутые цены)
const coinPackages: CoinPackage[] = [
  {
    id: 'light',
    name: 'Light',
    coins: 30,
    generations: 1,
    priceRub: 290,
    oldPriceRub: 490,
    pricePerCoin: 9.67,
    savings: 41,
    available: true,
    maxPerUser: 10,
  },
  {
    id: 'starter',
    name: 'Starter',
    coins: 100,
    generations: 3,
    priceRub: 890,
    oldPriceRub: 1490,
    pricePerCoin: 8.90,
    savings: 40,
    available: true,
    maxPerUser: 10,
  },
  {
    id: 'standard',
    name: 'Standard',
    coins: 300,
    generations: 10,
    priceRub: 2490,
    oldPriceRub: 3990,
    pricePerCoin: 8.30,
    savings: 38,
    available: true,
    maxPerUser: 10,
  },
  {
    id: 'pro',
    name: 'PRO',
    coins: 500,
    generations: 17,
    priceRub: 3990,
    oldPriceRub: 5990,
    pricePerCoin: 7.98,
    savings: 33,
    popular: true,
    available: true,
    maxPerUser: 10,
  },
  {
    id: 'elite',
    name: 'Business',
    coins: 1000,
    generations: 33,
    priceRub: 7500,
    oldPriceRub: 11990,
    pricePerCoin: 7.50,
    savings: 37,
    available: true,
    maxPerUser: 10,
  },
]

// Типы для подписок
interface SubscriptionPackage {
  id: string
  name: string
  priceRub: number
  priceLabel: string
  neuronsPerMonth: number
  generationsPerMonth: number
  features: string[]
  color: string
  bgColor: string
  borderColor: string
  popular?: boolean
}

// Пакеты подписок (3 тарифа: FREE, PRO, ELITE)
const subscriptionPackages: SubscriptionPackage[] = [
  {
    id: 'free',
    name: 'FREE',
    priceRub: 0,
    priceLabel: 'Бесплатно',
    neuronsPerMonth: 0,
    generationsPerMonth: 0,
    features: [
      '5 базовых стилей',
      '10% на баланс от генераций друзей'
    ],
    color: 'from-gray-300 to-gray-400',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    id: 'pro',
    name: 'PRO',
    priceRub: 2900,
    priceLabel: '2 900 ₽/мес',
    neuronsPerMonth: 150,
    generationsPerMonth: 0,
    features: [
      '7 стилей для генерации',
      '10% на баланс от генераций друзей',
      'Доступ к AI академии',
      'Доступ к закрытому клубу',
      '+150 нейронов на баланс',
      'Скидка 30% на все стили',
      'Бот-транскрибатор (видео/аудио в текст)'
    ],
    color: 'from-cyan-400 to-cyan-500',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-400',
    popular: true,
  },
  {
    id: 'elite',
    name: 'ELITE',
    priceRub: 9900,
    priceLabel: '9 900 ₽/мес',
    neuronsPerMonth: 600,
    generationsPerMonth: 0,
    features: [
      '10 стилей для генерации',
      '10% на баланс от генераций друзей',
      'Доступ к AI академии',
      'Доступ к закрытому клубу',
      '+600 нейронов на баланс',
      'Скидка 30% на все стили',
      'Бот-транскрибатор (видео/аудио в текст)',
      'Купон на любой стиль из магазина'
    ],
    color: 'from-orange-400 to-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
  },
]

// Временно скрыто
// const stylePackages = [
//   {
//     id: 'style_1',
//     name: 'Ассистент',
//     description: 'Классический помощник',
//     image: '/images/skins/skin_1.png',
//     color: 'from-cyan-400 to-cyan-500',
//   },
//   {
//     id: 'style_2',
//     name: 'Дизайнер',
//     description: 'Креативный создатель',
//     image: '/images/skins/skin_2.png',
//     color: 'from-purple-400 to-purple-500',
//   },
//   {
//     id: 'style_3',
//     name: 'Учитель',
//     description: 'Мудрый наставник',
//     image: '/images/skins/skin_3.png',
//     color: 'from-green-400 to-green-500',
//   },
//   {
//     id: 'style_premium',
//     name: 'VIP Набор',
//     description: 'Все стили + эксклюзивы',
//     image: '/images/skins/skin_0.png',
//     color: 'from-yellow-400 to-amber-500',
//     premium: true,
//   },
// ]

export function Shop() {
  const telegramUser = getTelegramUser()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [activeTab, setActiveTab] = useState<'coins' | 'subscription' | 'styles'>('coins')

  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)
      }
      setIsLoadingCoins(false)
    }
    loadData()
  }, [telegramUser?.id])

  const [isProcessing, setIsProcessing] = useState(false)

  const handleBuy = async (pkg: CoinPackage) => {
    haptic.action() // Вибрация при покупке
    console.log('handleBuy called', { telegramUser, pkg })

    if (!telegramUser?.id) {
      console.error('No telegramUser.id')
      haptic.error()
      toast.error('Не удалось определить пользователя. Откройте магазин через Telegram бота.')
      return
    }

    if (!pkg.available) {
      haptic.warning()
      toast.info('Скоро будет доступно!')
      return
    }

    setIsProcessing(true)

    try {
      // Вызываем бэкенд для создания инвойса (только RUB)
      const response = await fetch(
        'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/lava-create-invoice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramUser.id,
            currency: 'RUB',
            packageId: pkg.id,
            amount: pkg.priceRub,
            coins: pkg.coins,
          })
        }
      )

      const result = await response.json()

      if (!result.ok || !result.paymentUrl) {
        throw new Error(result.error || 'Не удалось создать платёж')
      }

      // Открываем страницу оплаты
      const tg = window.Telegram?.WebApp
      if (tg?.openLink) {
        tg.openLink(result.paymentUrl)
      } else {
        window.open(result.paymentUrl, '_blank')
      }

    } catch (error: any) {
      console.error('Payment error:', error)
      toast.error('Ошибка при создании платежа: ' + (error.message || 'Попробуйте позже'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBuySubscription = async (planId: string) => {
    haptic.action()

    // FREE план — просто информируем
    if (planId === 'free') {
      toast.info('Вы уже используете бесплатный тариф')
      return
    }

    if (!telegramUser?.id) {
      haptic.error()
      toast.error('Не удалось определить пользователя')
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch(
        'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/lava-create-subscription',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            telegramId: telegramUser.id,
            planId,
          })
        }
      )

      const result = await response.json()
      console.log('Subscription response:', result)

      if (!result.ok || !result.paymentUrl) {
        // Показываем более понятную ошибку
        if (result.error?.includes('not configured')) {
          throw new Error('Подписки временно недоступны. Скоро будут!')
        }
        throw new Error(result.error || 'Не удалось создать подписку')
      }

      // Открываем страницу оплаты
      const tg = window.Telegram?.WebApp
      if (tg?.openLink) {
        tg.openLink(result.paymentUrl)
      } else {
        window.open(result.paymentUrl, '_blank')
      }

    } catch (error: unknown) {
      console.error('Subscription error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Попробуйте позже'
      toast.error('Ошибка: ' + errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }

  // Временно скрыто
  // const handleBuyStyle = (_id: string) => {
  //   alert('Стили скоро будут доступны!')
  // }

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          МАГАЗИН
        </h1>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3">
        <div className="flex gap-1.5 bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200/50">
          <button
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer ${activeTab === 'coins'
              ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            МОНЕТЫ
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer ${activeTab === 'subscription'
              ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            ПОДПИСКА
          </button>
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer ${activeTab === 'styles'
              ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Palette className="w-4 h-4 inline mr-1" />
            СТИЛИ
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4">
        {activeTab === 'coins' && (
          <>
            {/* Профиль в стиле Telegram - компактный */}
            <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
              <div className="flex items-center gap-3">
                {/* Аватарка */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {telegramUser?.photo_url ? (
                    <img
                      src={telegramUser.photo_url}
                      alt={telegramUser.first_name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>

                {/* Имя и монеты */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {telegramUser?.first_name || 'Пользователь'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <img src="/neirocoin.png" alt="Нейро" className="w-5 h-5 object-contain flex-shrink-0" />
                    <span className="text-base font-bold text-gray-900">
                      {isLoadingCoins ? '...' : coinBalance}
                    </span>
                    <span className="text-xs text-gray-500">монет</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Заголовок пакетов */}
            <div className="pt-2">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Пополнить баланс</h2>
              <p className="text-xs text-gray-500 mb-4">Выберите пакет нейронов</p>
            </div>

            {/* Пакеты монет */}
            <div className="space-y-3">
              {coinPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuy(pkg)}
                  disabled={isProcessing}
                  className={`relative w-full bg-white border-2 rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait cursor-pointer ${pkg.popular
                    ? 'border-orange-400 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/30'
                    : 'border-gray-200 hover:border-orange-300'
                    }`}
                >
                  {/* Popular Badge */}
                  {pkg.popular && (
                    <div className="absolute -top-2.5 left-4 z-10">
                      <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                        ПОПУЛЯРНЫЙ
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md ${pkg.popular
                        ? 'bg-gradient-to-br from-orange-400 to-orange-500'
                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                        }`}>
                        <img src="/neirocoin.png" alt="Нейро" className="w-7 h-7 object-contain" />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-base font-bold text-gray-900">{pkg.name}</p>
                          {pkg.savings > 0 && (
                            <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                              -{pkg.savings}%
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-sm text-gray-700 font-medium">{pkg.coins} нейронов</span>
                          <span className="text-xs text-gray-400">• {pkg.pricePerCoin}₽/шт</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {isProcessing ? 'Создаём платёж...' : `~${pkg.generations} карусел${pkg.generations === 1 ? 'ь' : pkg.generations < 5 ? 'и' : 'ей'}`}
                        </p>
                      </div>
                    </div>

                    {/* Price с перечёркнутой старой ценой */}
                    <div className="text-right">
                      <p className="text-sm text-gray-400 line-through">
                        {pkg.oldPriceRub.toLocaleString('ru-RU')} ₽
                      </p>
                      <p className={`text-xl font-bold ${pkg.popular ? 'text-orange-500' : 'text-gray-900'}`}>
                        {pkg.priceRub.toLocaleString('ru-RU')} ₽
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'subscription' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Выберите тариф</h2>
              <p className="text-sm text-gray-500">Ежемесячная подписка с бонусами</p>
            </div>

            {/* FREE - Текущий тариф */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Star className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">FREE</p>
                    <p className="text-xs text-gray-400">Ваш текущий тариф</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-medium text-gray-600">Активен</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {subscriptionPackages[0].features.map((feature, i) => (
                    <span key={i} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* PRO - Бирюзовый */}
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl shadow-cyan-500/10 border-2 border-cyan-400 mb-4 mt-4">
              {/* Бейдж ХИТ */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-white text-cyan-600 text-xs font-bold px-5 py-1.5 rounded-full shadow-md border-2 border-cyan-400">
                  ХИТ
                </span>
              </div>

              {/* Градиентный хедер */}
              <div className="bg-gradient-to-br from-cyan-400 via-cyan-500 to-teal-500 px-5 pt-8 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-2xl">PRO</p>
                    <p className="text-cyan-100 font-medium">2 900 ₽/мес</p>
                  </div>
                </div>
              </div>

              {/* Контент */}
              <div className="p-5">
                <div className="space-y-2.5 mb-5">
                  {subscriptionPackages[1].features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-cyan-600 text-xs">✓</span>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleBuySubscription('pro')}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-cyan-400 to-cyan-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 hover:scale-[1.02] transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-70"
                >
                  Оформить PRO
                </button>
              </div>
            </div>

            {/* ELITE - Оранжевый */}
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-xl shadow-orange-500/10 border-2 border-orange-400 mt-4">
              {/* Бейдж ELITE */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-white text-orange-600 text-xs font-bold px-5 py-1.5 rounded-full shadow-md border-2 border-orange-400">
                  ELITE
                </span>
              </div>

              {/* Градиентный хедер */}
              <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 px-5 pt-8 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-2xl">ELITE</p>
                    <p className="text-orange-100 font-medium">9 900 ₽/мес</p>
                  </div>
                </div>
              </div>

              {/* Контент */}
              <div className="p-5">
                <div className="space-y-2.5 mb-5">
                  {subscriptionPackages[2].features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-orange-600 text-xs">✓</span>
                      </div>
                      <span className="text-sm text-gray-700 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleBuySubscription('elite')}
                  disabled={isProcessing}
                  className="w-full py-3.5 rounded-2xl font-bold text-base bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-200 cursor-pointer active:scale-[0.98] disabled:opacity-70"
                >
                  Оформить ELITE
                </button>
              </div>
            </div>
          </>
        )}

        {activeTab === 'styles' && (
          <StylesTab
            telegramId={telegramUser?.id}
            coinBalance={coinBalance}
            onBalanceChange={setCoinBalance}
          />
        )}
      </div>

      {/* Footer info */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-center text-[11px] text-gray-400">
          Монеты не сгорают · Отмена в любой момент
        </p>
      </div>
    </div>
  )
}
