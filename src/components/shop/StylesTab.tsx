import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Palette, Check } from 'lucide-react'
import { haptic } from '@/lib/haptic'
import {
  getShopStyles,
  getUserPurchasedStyles,
  purchaseStyle,
  type ShopStyle,
  type PurchasedStyle
} from '@/lib/carouselStylesApi'

interface StylesTabProps {
  telegramId: number | undefined
  coinBalance: number
  onBalanceChange: (newBalance: number) => void
}

export function StylesTab({ telegramId, coinBalance, onBalanceChange }: StylesTabProps) {
  const [shopStyles, setShopStyles] = useState<ShopStyle[]>([])
  const [purchasedStyles, setPurchasedStyles] = useState<PurchasedStyle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const loadStyles = async () => {
      if (telegramId) {
        const [styles, purchased] = await Promise.all([
          getShopStyles(),
          getUserPurchasedStyles(telegramId)
        ])
        setShopStyles(styles)
        setPurchasedStyles(purchased)
      }
      setIsLoading(false)
    }
    loadStyles()
  }, [telegramId])

  const ownsStyle = (styleId: string) => {
    const style = shopStyles.find(s => s.style_id === styleId)
    if (style?.is_free) return true
    return purchasedStyles.some(p => p.style_id === styleId)
  }

  const handleBuyStyle = async (style: ShopStyle) => {
    haptic.action()

    if (!telegramId) {
      haptic.error()
      toast.error('Не удалось определить пользователя')
      return
    }

    if (ownsStyle(style.style_id)) {
      toast.info('Этот стиль уже у вас!')
      return
    }

    if (coinBalance < style.price_neurons) {
      haptic.warning()
      toast.error(`Недостаточно нейронов. Нужно: ${style.price_neurons}, у вас: ${coinBalance}`)
      return
    }

    setIsProcessing(true)

    try {
      const result = await purchaseStyle(telegramId, style.style_id, style.price_neurons)

      if (result.success) {
        haptic.success()
        toast.success(`🎨 Стиль "${style.name}" куплен!`)

        if (result.newBalance !== undefined) {
          onBalanceChange(result.newBalance)
        }
        setPurchasedStyles([...purchasedStyles, {
          id: crypto.randomUUID(),
          telegram_id: telegramId,
          style_id: style.style_id,
          price_paid: style.price_neurons,
          purchased_at: new Date().toISOString()
        }])
      } else {
        haptic.error()
        toast.error(result.error || 'Ошибка при покупке')
      }
    } catch (error) {
      console.error('Purchase error:', error)
      haptic.error()
      toast.error('Ошибка при покупке стиля')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-gray-500 text-sm">Загрузка стилей...</p>
      </div>
    )
  }

  if (shopStyles.length === 0) {
    return (
      <div className="text-center py-8 bg-white rounded-2xl border border-gray-200">
        <Palette className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Стили скоро появятся!</p>
      </div>
    )
  }

  return (
    <>
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 mb-1">🎨 Стили каруселей</h2>
        <p className="text-sm text-gray-500">Уникальный дизайн для ваших постов</p>
      </div>

      <div className="space-y-3">
        {shopStyles.map((style) => {
          const owned = ownsStyle(style.style_id)
          return (
            <button
              key={style.style_id}
              onClick={() => !owned && handleBuyStyle(style)}
              disabled={isProcessing || owned}
              className={`relative w-full bg-white border-2 rounded-2xl p-4 text-left transition-all duration-200 cursor-pointer ${
                owned
                  ? 'border-green-400 bg-green-50/50'
                  : 'border-gray-200 hover:border-orange-300 hover:shadow-lg active:scale-[0.99]'
              } ${isProcessing ? 'opacity-70' : ''}`}
            >
              {style.is_free && (
                <div className="absolute -top-2.5 left-4 z-10">
                  <span className="bg-cyan-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                    БЕСПЛАТНО
                  </span>
                </div>
              )}
              {owned && !style.is_free && (
                <div className="absolute -top-2.5 left-4 z-10">
                  <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                    КУПЛЕНО
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0"
                  style={{ backgroundColor: style.preview_color + '20' }}
                >
                  {style.preview_image ? (
                    <img
                      src={style.preview_image}
                      alt={style.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    style.emoji
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{style.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {style.description || 'Уникальный стиль дизайна'}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  {owned ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Есть</span>
                    </div>
                  ) : style.is_free ? (
                    <span className="text-cyan-600 font-bold">0 🪙</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xl font-bold text-orange-500">
                        {style.price_neurons}
                      </span>
                      <img src="/neirocoin.png" alt="нейро" className="w-5 h-5" />
                    </div>
                  )}
                </div>
              </div>

              {style.example_images && style.example_images.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {style.example_images.slice(0, 4).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Пример ${i + 1}`}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                  {style.example_images.length > 4 && (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                      +{style.example_images.length - 4}
                    </div>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
        <p className="text-sm text-orange-700">
          💡 Купленные стили появятся в выборе при создании карусели
        </p>
      </div>
    </>
  )
}
