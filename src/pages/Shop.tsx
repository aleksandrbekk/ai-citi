import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance, supabase } from '@/lib/supabase'
import { Coins, Sparkles, Zap, Crown, Rocket, Star, Palette, Mail, CheckCircle } from 'lucide-react'

// Ссылка на продукт в Lava.top
const LAVA_PRODUCT_URL = 'https://app.lava.top/products/bcc55515-b779-47cd-83aa-5306575e6d95'

// Пакеты монет
const coinPackages = [
  {
    id: 'starter',
    name: 'Старт',
    coins: 5,
    price: 99,
    priceLabel: '99 ₽',
    icon: Zap,
    color: 'from-blue-400 to-blue-500',
    shadow: 'shadow-blue-500/30',
    available: false,
  },
  {
    id: 'basic',
    name: 'Базовый',
    coins: 15,
    price: 249,
    priceLabel: '249 ₽',
    bonus: 2,
    icon: Sparkles,
    color: 'from-purple-400 to-purple-500',
    shadow: 'shadow-purple-500/30',
    available: false,
  },
  {
    id: 'pro',
    name: 'Про',
    coins: 35,
    price: 499,
    priceLabel: '499 ₽',
    bonus: 5,
    icon: Rocket,
    color: 'from-orange-400 to-orange-500',
    shadow: 'shadow-orange-500/30',
    available: false,
  },
  {
    id: 'premium',
    name: 'Премиум',
    coins: 100,
    price: 10,
    priceLabel: '$10',
    bonus: 0,
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

// Наборы стилей (скины персонажей)
const stylePackages = [
  {
    id: 'style_1',
    name: 'Ассистент',
    description: 'Классический помощник',
    image: '/images/skins/skin_1.png',
    price: 199,
    color: 'from-cyan-400 to-cyan-500',
  },
  {
    id: 'style_2',
    name: 'Дизайнер',
    description: 'Креативный создатель',
    image: '/images/skins/skin_2.png',
    price: 299,
    color: 'from-purple-400 to-purple-500',
  },
  {
    id: 'style_3',
    name: 'Учитель',
    description: 'Мудрый наставник',
    image: '/images/skins/skin_3.png',
    price: 299,
    color: 'from-green-400 to-green-500',
  },
  {
    id: 'style_premium',
    name: 'VIP Набор',
    description: 'Все стили + эксклюзивы',
    image: '/images/skins/skin_0.png',
    price: 599,
    color: 'from-yellow-400 to-amber-500',
    premium: true,
  },
]

export function Shop() {
  const telegramUser = getTelegramUser()
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [activeTab, setActiveTab] = useState<'coins' | 'subscription' | 'styles'>('coins')
  const [email, setEmail] = useState('')
  const [savedEmail, setSavedEmail] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        // Загружаем баланс
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)

        // Загружаем сохранённый email
        const { data } = await supabase
          .from('payment_emails')
          .select('email')
          .eq('telegram_id', telegramUser.id)
          .single()

        if (data?.email) {
          setSavedEmail(data.email)
          setEmail(data.email)
        }
      }
      setIsLoadingCoins(false)
    }
    loadData()
  }, [telegramUser?.id])

  const handleSaveEmail = async () => {
    if (!email || !telegramUser?.id) return

    // Простая валидация email
    if (!email.includes('@')) {
      alert('Введите корректный email')
      return
    }

    setIsSaving(true)

    const { error } = await supabase
      .from('payment_emails')
      .upsert({
        telegram_id: telegramUser.id,
        email: email.toLowerCase().trim()
      }, { onConflict: 'telegram_id' })

    if (error) {
      console.error('Error saving email:', error)
      alert('Ошибка сохранения email')
    } else {
      setSavedEmail(email.toLowerCase().trim())
    }

    setIsSaving(false)
  }

  const handleBuy = (pkg: typeof coinPackages[0]) => {
    if (pkg.available && pkg.lavaUrl) {
      if (!savedEmail) {
        alert('Сначала сохраните email для оплаты')
        return
      }
      window.open(pkg.lavaUrl, '_blank')
    } else {
      alert('Скоро будет доступно!')
    }
  }

  const handleBuySubscription = (_id: string) => {
    alert('Подписки скоро будут доступны!')
  }

  const handleBuyStyle = (_id: string) => {
    alert('Стили скоро будут доступны!')
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

      {/* Email для оплаты - ОБЯЗАТЕЛЬНАЯ ПЛАШКА */}
      <div className="px-4 pb-3">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-orange-500" />
            <p className="text-xs font-medium text-orange-700">Email для оплаты (обязательно)</p>
          </div>

          {savedEmail ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">{savedEmail}</span>
              </div>
              <button
                onClick={() => setSavedEmail(null)}
                className="text-xs text-gray-500 underline px-2"
              >
                Изменить
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 p-2 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400"
              />
              <button
                onClick={handleSaveEmail}
                disabled={isSaving || !email}
                className="px-4 py-2 bg-orange-500 text-white rounded-xl font-medium text-sm disabled:opacity-50"
              >
                {isSaving ? '...' : 'Сохранить'}
              </button>
            </div>
          )}
          <p className="text-[10px] text-orange-600 mt-1.5">
            Используйте этот же email при оплате на Lava.top
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('coins')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'coins'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-1" />
            МОНЕТЫ
          </button>
          <button
            onClick={() => setActiveTab('subscription')}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-xs transition-all ${
              activeTab === 'subscription'
                ? 'bg-white text-orange-500 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            <Star className="w-4 h-4 inline mr-1" />
            ПОДПИСКА
          </button>
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
        </div>
      </div>

      {/* Баланс */}
      <div className="px-4 py-3">
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
                  onClick={() => handleBuy(pkg)}
                  className={`w-full bg-white border-2 rounded-2xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.98] ${
                    pkg.available ? 'border-orange-400' : 'border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pkg.color} flex items-center justify-center shadow-lg ${pkg.shadow}`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{pkg.name}</p>
                          {pkg.available && (
                            <span className="bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                              ДОСТУПНО
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Coins className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-600">
                            {pkg.coins} монет
                            {pkg.bonus ? (
                              <span className="text-green-500 font-medium"> +{pkg.bonus}</span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{pkg.priceLabel}</p>
                      {!pkg.available && (
                        <p className="text-xs text-gray-400">скоро</p>
                      )}
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
                onClick={() => handleBuySubscription(pkg.id)}
                className={`w-full bg-white border-2 rounded-2xl p-4 text-left transition-all hover:shadow-lg active:scale-[0.98] opacity-60 ${
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
                <p className="text-xs text-gray-400 mt-2 text-center">Скоро</p>
              </button>
            ))}
          </>
        )}

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
                  <p className="text-xs text-gray-500 mb-2">{style.description}</p>
                  <p className="text-lg font-bold text-orange-500">{style.price} ₽</p>
                  <p className="text-xs text-gray-400">Скоро</p>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Footer info */}
      <div className="px-4 pt-6">
        <p className="text-center text-xs text-gray-400">
          Монеты не сгорают • Безопасная оплата
        </p>
      </div>
    </div>
  )
}
