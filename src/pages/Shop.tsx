import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { haptic } from '@/lib/haptic'
import { Coins, Crown, Star, User } from 'lucide-react'
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

// Пакеты подписок (4 тарифа)
const subscriptionPackages = [
  {
    id: 'basic',
    name: 'BASIC',
    price: 'Бесплатно',
    priceLabel: '0 ₽',
    features: ['Базовый доступ', 'Стандартные шаблоны', '10 запросов/день'],
    color: 'from-gray-400 to-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
  {
    id: 'starter',
    name: 'STARTER',
    price: '299 ₽/мес',
    priceLabel: '299 ₽',
    features: ['Расширенный доступ', 'Все шаблоны', '50 запросов/день', 'Приоритет поддержка'],
    color: 'from-cyan-400 to-cyan-500',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
  },
  {
    id: 'pro',
    name: 'PRO',
    price: '799 ₽/мес',
    priceLabel: '799 ₽',
    features: ['Расширенный доступ', 'Все шаблоны', '200 запросов/день', 'Приоритет генерации', 'Экспорт данных'],
    color: 'from-orange-400 to-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-400',
    popular: true,
  },
  {
    id: 'elite',
    name: 'ELITE',
    price: '9,999 ₽/мес',
    priceLabel: '9,999 ₽',
    features: ['Максимальный доступ', 'Все функции', 'Безлимит запросов', 'Персональный менеджер', 'Безлимит API', 'Приоритет разработка'],
    color: 'from-amber-400 to-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
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
    RUB: '~ 1000 ₽',
    USD: '$10',
    EUR: '~ €9'
  }

  const handleBuy = async (pkg: typeof coinPackages[0]) => {
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
      toast.error('Ошибка при создании платежа: ' + (error.message || 'Попробуйте позже'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBuySubscription = (_id: string) => {
    toast.info('Подписки скоро будут доступны!')
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
              <p className="text-xs text-gray-500 mb-4">Выберите валюту и пакет</p>
            </div>

            {/* Выбор валюты */}
            <div className="flex gap-2 mb-4">
              {(['RUB', 'USD', 'EUR'] as const).map((cur) => (
                <button
                  key={cur}
                  onClick={() => setCurrency(cur)}
                  className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${currency === cur
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {cur === 'RUB' ? '₽ Рубли' : cur === 'USD' ? '$ Доллары' : '€ Евро'}
                </button>
              ))}
            </div>

            {/* Пакеты монет */}
            <div className="space-y-3">
              {coinPackages.map((pkg) => {
                const Icon = pkg.icon
                return (
                  <button
                    key={pkg.id}
                    onClick={() => handleBuy(pkg)}
                    disabled={isProcessing}
                    className="w-full bg-white border-2 border-gray-200 rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-lg hover:border-orange-300 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-wait cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-md">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-gray-900">{pkg.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {isProcessing ? 'Создаём платёж...' : 'Пополнение баланса'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">{currencyPrices[currency]}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{pkg.coins} монет</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {activeTab === 'subscription' && (
          <>
            <p className="text-sm text-gray-600 text-center mb-6">Ежемесячная подписка</p>
            <div className="grid grid-cols-1 gap-6">
              {subscriptionPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleBuySubscription(pkg.id)}
                  className={`relative w-full bg-white border-2 ${pkg.borderColor} rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:border-opacity-100 active:scale-[0.99] cursor-pointer ${pkg.popular
                      ? 'border-orange-400 shadow-lg shadow-orange-500/20 ring-2 ring-orange-400/30'
                      : 'hover:border-opacity-60'
                    }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                        ХИТ
                      </span>
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg`}>
                        <Star className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-2xl mb-1">{pkg.name}</p>
                        <p className="text-base font-semibold text-gray-700">{pkg.price}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {pkg.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${pkg.popular
                            ? 'bg-orange-500'
                            : pkg.id === 'elite'
                              ? 'bg-amber-500'
                              : pkg.id === 'starter'
                                ? 'bg-cyan-500'
                                : 'bg-gray-400'
                          }`} />
                        <span className="text-sm text-gray-700 leading-relaxed flex-1">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBuySubscription(pkg.id)
                    }}
                    className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${pkg.popular
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/40 hover:scale-[1.02]'
                        : pkg.id === 'elite'
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:shadow-lg hover:shadow-amber-500/40 hover:scale-[1.02]'
                          : pkg.id === 'starter'
                            ? 'bg-gradient-to-r from-cyan-400 to-cyan-500 text-white hover:shadow-lg hover:shadow-cyan-500/40 hover:scale-[1.02]'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    {pkg.id === 'basic' ? 'Начать бесплатно' : 'Выбрать план'}
                  </button>
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
