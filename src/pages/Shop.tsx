import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { Coins, Crown, Star } from 'lucide-react'
// import { Palette } from 'lucide-react' // Временно скрыто

// Ссылка на продукт в Lava.top
const LAVA_PRODUCT_URL = 'https://app.lava.top/products/bcc55515-b779-47cd-83aa-5306575e6d95'

// Пакеты монет
const coinPackages = [
  {
    id: 'premium',
    name: '100 монет',
    coins: 100,
    priceLabel: '$10',
    icon: Crown,
    color: 'from-yellow-400 to-amber-500',
    shadow: 'shadow-amber-500/30',
    available: true,
    lavaUrl: LAVA_PRODUCT_URL,
  },
]

// Пакеты подписок
const subscriptionPackages = [
  {
    id: 'basic',
    name: 'BASIC',
    price: 'Бесплатно',
    features: ['Базовый доступ', 'Стандартные шаблоны', '10 запросов/день'],
    color: 'from-gray-400 to-gray-500',
    icon: '⭐',
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: '299 ₽/мес',
    features: ['Расширенный доступ', 'Все шаблоны', '50 запросов/день', 'Приоритет поддержка'],
    color: 'from-blue-400 to-blue-500',
    icon: '🚀',
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '799 ₽/мес',
    features: ['Расширенный доступ', 'Все шаблоны', '200 запросов/день', 'Приоритет генерации', 'Экспорт данных'],
    color: 'from-purple-400 to-purple-500',
    popular: true,
    icon: '💎',
  },
  {
    id: 'business',
    name: 'BUSINESS',
    price: '1,999 ₽/мес',
    features: ['Бизнес доступ', 'Все шаблоны', '500 запросов/день', 'API доступ', 'Приоритет поддержка', 'Аналитика'],
    color: 'from-indigo-400 to-indigo-500',
    icon: '🏢',
  },
  {
    id: 'vip',
    name: 'VIP',
    price: '3,999 ₽/мес',
    features: ['VIP доступ', 'Все шаблоны', '1,000 запросов/день', 'VIP поддержка', 'Эксклюзивный контент', 'Персональный менеджер'],
    color: 'from-orange-400 to-orange-500',
    icon: '👑',
  },
  {
    id: 'premium',
    name: 'PREMIUM',
    price: '5,999 ₽/мес',
    features: ['Премиум доступ', 'Все функции', '2,500 запросов/день', 'Приоритет API', 'White-label', 'Кастомные интеграции'],
    color: 'from-pink-400 to-pink-500',
    icon: '✨',
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: '9,999 ₽/мес',
    features: ['Максимальный доступ', 'Все функции', 'Безлимит запросов', 'Персональный менеджер', 'Безлимит API', 'Приоритет разработка'],
    color: 'from-yellow-400 to-amber-500',
    icon: '🌟',
  },
  {
    id: 'enterprise',
    name: 'ENTERPRISE',
    price: 'По запросу',
    features: ['Корпоративный доступ', 'Все функции', 'Безлимит', 'Dedicated сервер', 'SLA 99.9%', 'Кастомные решения', 'Обучение команды'],
    color: 'from-slate-600 to-slate-700',
    icon: '🏛️',
    enterprise: true,
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
  const [currency, setCurrency] = useState<'RUB' | 'USD' | 'EUR'>('RUB')

  const currencyPrices = {
    RUB: '377 ₽',
    USD: '$5',
    EUR: '€4'
  }

  const handleBuy = async (pkg: typeof coinPackages[0]) => {
    console.log('handleBuy called', { telegramUser, pkg })

    if (!telegramUser?.id) {
      console.error('No telegramUser.id')
      alert('Ошибка: не удалось определить пользователя. Откройте магазин через Telegram бота.')
      return
    }

    if (!pkg.available) {
      alert('Скоро будет доступно!')
      return
    }

    setIsProcessing(true)

    try {
      // Вызываем наш бэкенд для создания инвойса с UTM
      const response = await fetch(
        'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/lava-create-invoice',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telegramId: telegramUser.id, currency })
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
      alert('Ошибка при создании платежа: ' + (error.message || 'Попробуйте позже'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBuySubscription = (_id: string) => {
    alert('Подписки скоро будут доступны!')
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
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer ${
              activeTab === 'coins'
                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            МОНЕТЫ
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all duration-200 cursor-pointer ${
              activeTab === 'subscription'
                ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            ПОДПИСКА
          </button>
          {/* Временно скрыто
          <button
            onClick={() => setActiveTab('styles')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'styles'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Palette className="w-4 h-4 inline mr-1" />
            СТИЛИ
          </button>
          */}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4">
        {activeTab === 'coins' && (
          <>
            {/* Баланс - только в разделе Монеты */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Ваш баланс</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      {isLoadingCoins ? '...' : coinBalance}
                    </span>
                    <span className="text-gray-600">монет</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Выбор валюты */}
            <div className="flex gap-2">
              {(['RUB', 'USD', 'EUR'] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                    currency === cur
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {cur === 'RUB' ? '₽ Рубли' : cur === 'USD' ? '$ Доллары' : '€ Евро'}
                </button>
              ))}
            </div>

            {coinPackages.map((pkg) => {
              const Icon = pkg.icon
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleBuy(pkg)}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-xl font-bold text-white">{pkg.name}</p>
                        <p className="text-white/80 text-sm">
                          {isProcessing ? 'Создаём платёж...' : 'Пополнение баланса'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">{currencyPrices[currency]}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {activeTab === 'subscription' && (
          <>
            <p className="text-xs text-[#4C1D95]/70 text-center mb-1">Ежемесячная подписка</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subscriptionPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuySubscription(pkg.id)}
                  className={`relative w-full bg-white border-2 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                    pkg.popular 
                      ? 'border-orange-400 shadow-lg shadow-orange-500/20' 
                      : pkg.enterprise
                        ? 'border-slate-400'
                        : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                        ХИТ
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-md`}>
                        {pkg.icon ? (
                          <span className="text-2xl">{pkg.icon}</span>
                        ) : (
                          <Star className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{pkg.name}</p>
                        <p className="text-sm font-semibold text-orange-500 mt-1">{pkg.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {pkg.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                        <span className="text-xs text-gray-700 leading-relaxed">{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 cursor-pointer ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:shadow-md'
                      : pkg.enterprise
                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        : 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-white hover:shadow-md'
                  }`}>
                    {pkg.enterprise ? 'Связаться с нами' : 'Выбрать план'}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Временно скрыто
        {activeTab === 'styles' && (
          <>
            <p className="text-xs text-gray-500 text-center">Персонализируй своих помощников</p>
            <div className="grid grid-cols-2 gap-3">
              {stylePackages.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleBuyStyle(style.id)}
                  className={`bg-white border-2 rounded-2xl p-3 text-center transition-all hover:shadow-lg active:scale-[0.98] opacity-60 ${
                    style.premium ? 'border-amber-400 col-span-2' : 'border-gray-200'
                  }`}
                >
                  {style.premium && (
                    <div className="flex justify-center mb-2">
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                        VIP
                      </span>
                    </div>
                  )}
                  <div className={`mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br ${style.color} p-2 mb-3 ${style.premium ? 'w-24 h-24' : ''}`}>
                    <img
                      src={style.image}
                      alt={style.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{style.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{style.description}</p>
                  <p className="text-xs text-gray-400">Скоро</p>
                </button>
              ))}
            </div>
          </>
        )}
        */}
      </div>

      {/* Footer info */}
      <div className="px-4 pt-6 pb-4">
        <p className="text-center text-xs text-gray-500">
          Монеты не сгорают • Безопасная оплата • Отмена в любой момент
        </p>
      </div>
    </div>
  )
}
