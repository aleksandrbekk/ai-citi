import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Palette, Check, X, ShoppingBag } from 'lucide-react'
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
  // Модалка подтверждения
  const [confirmModal, setConfirmModal] = useState<ShopStyle | null>(null)

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

  // Открыть модалку подтверждения
  const handleBuyClick = (style: ShopStyle) => {
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

    // Показываем модалку подтверждения
    setConfirmModal(style)
  }

  // Подтвердить покупку
  const confirmPurchase = async () => {
    if (!confirmModal || !telegramId) return

    setIsProcessing(true)

    try {
      const result = await purchaseStyle(telegramId, confirmModal.style_id, confirmModal.price_neurons)

      if (result.success) {
        haptic.success()
        toast.success(`🎨 Стиль "${confirmModal.name}" куплен!`)

        if (result.newBalance !== undefined) {
          onBalanceChange(result.newBalance)
        }
        setPurchasedStyles([...purchasedStyles, {
          id: crypto.randomUUID(),
          telegram_id: telegramId,
          style_id: confirmModal.style_id,
          price_paid: confirmModal.price_neurons,
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
      setConfirmModal(null)
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
              onClick={() => !owned && handleBuyClick(style)}
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

      {/* Модалка подтверждения покупки */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-orange-400 to-orange-500 p-6 text-center">
              <button
                onClick={() => setConfirmModal(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/20 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Подтвердите покупку</h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Стиль */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: confirmModal.preview_color + '20' }}
                >
                  {confirmModal.preview_image ? (
                    <img
                      src={confirmModal.preview_image}
                      alt={confirmModal.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    confirmModal.emoji
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{confirmModal.name}</p>
                  <p className="text-sm text-gray-500 truncate">{confirmModal.description}</p>
                </div>
              </div>

              {/* Детали */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Вы получите</span>
                  <span className="font-semibold text-gray-900">Стиль "{confirmModal.name}"</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Спишется с баланса</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-orange-500 text-lg">{confirmModal.price_neurons}</span>
                    <img src="/neirocoin.png" alt="нейро" className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Баланс после покупки</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900">{coinBalance - confirmModal.price_neurons}</span>
                    <img src="/neirocoin.png" alt="нейро" className="w-4 h-4 opacity-70" />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 pt-0 space-y-2">
              <button
                onClick={confirmPurchase}
                disabled={isProcessing}
                className="w-full py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all active:scale-[0.98] disabled:opacity-70"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Покупка...
                  </span>
                ) : (
                  'Подтвердить покупку'
                )}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                disabled={isProcessing}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
