import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase, getCoinBalance } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { LoaderIcon } from '@/components/ui/icons'
import { Sparkles, Image, Palette, Zap } from 'lucide-react'

// Стоимость генерации
const GENERATION_COST = 30

export default function CarouselIndex() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()

  // Проверка подписки
  const { data: hasSubscription, isLoading: isCheckingSubscription } = useQuery({
    queryKey: ['carousel-subscription', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return false
      const { data } = await supabase
        .from('premium_clients')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .maybeSingle()
      return !!data
    },
    enabled: !!telegramUser?.id,
  })

  // Баланс монет
  const { data: coinBalance = 0, isLoading: isLoadingCoins } = useQuery({
    queryKey: ['coin-balance', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return 0
      return await getCoinBalance(telegramUser.id)
    },
    enabled: !!telegramUser?.id,
  })

  const hasAccess = hasSubscription || coinBalance >= GENERATION_COST
  const isLoading = isCheckingSubscription || isLoadingCoins

  const handleStart = () => {
    navigate('/agents/carousel/settings')
  }

  // Загрузка
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoaderIcon size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-gray-500">Проверка доступа...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="px-4 pt-6 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Карусель</h1>
          <p className="text-gray-500">9 слайдов для Instagram за 2 минуты</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Image className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Твоё фото на слайдах</h3>
              <p className="text-sm text-gray-500">AI добавит тебя в карусель</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Palette className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">5 стилей дизайна</h3>
              <p className="text-sm text-gray-500">От минимализма до градиентов</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Готово за 2-3 минуты</h3>
              <p className="text-sm text-gray-500">Слайды придут в Telegram</p>
            </div>
          </div>
        </div>

        {/* Access Info */}
        {!hasSubscription && (
          <div className="mb-6 p-4 rounded-2xl bg-orange-50 border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Ваш баланс:</span>
              <span className="font-bold text-orange-600">{coinBalance} монет</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Стоимость генерации:</span>
              <span className="font-bold text-gray-900">{GENERATION_COST} монет</span>
            </div>
            {!hasAccess && (
              <p className="text-sm text-red-500 mt-3">
                Недостаточно монет. Пополните баланс в магазине.
              </p>
            )}
          </div>
        )}

        {hasSubscription && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-100">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-semibold">✓ Подписка активна</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Генерация каруселей бесплатна</p>
          </div>
        )}

        {/* CTA Button */}
        {hasAccess ? (
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform"
          >
            Создать карусель
          </button>
        ) : (
          <button
            onClick={() => navigate('/shop')}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-gray-400 to-gray-500 text-white font-bold text-lg"
          >
            Пополнить баланс
          </button>
        )}
      </div>
    </div>
  )
}
