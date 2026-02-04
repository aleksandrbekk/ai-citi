import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Palette, Check, X, ShoppingBag, Eye } from 'lucide-react'
import { haptic } from '@/lib/haptic'
import {
  getShopStyles,
  getUserPurchasedStyles,
  purchaseStyle,
  type ShopStyle,
  type PurchasedStyle
} from '@/lib/carouselStylesApi'
import { getUserTariffInfo } from '@/lib/supabase'

const DISCOUNT_PERCENT = 30

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
  // Модалка предпросмотра
  const [previewStyle, setPreviewStyle] = useState<ShopStyle | null>(null)

  // Скидка для подписчиков
  const [discountActive, setDiscountActive] = useState(false)

  useEffect(() => {
    const loadStyles = async () => {
      if (telegramId) {
        const [styles, purchased, tariffInfo] = await Promise.all([
          getShopStyles(),
          getUserPurchasedStyles(telegramId),
          getUserTariffInfo(telegramId)
        ])
        setShopStyles(styles)
        setPurchasedStyles(purchased)

        // Проверяем скидку (PRO или BUSINESS)
        if (tariffInfo?.is_active && ['pro', 'business'].includes(tariffInfo.tariff_slug)) {
          setDiscountActive(true)
        }
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
  const handleBuyClick = (style: ShopStyle, e?: React.MouseEvent) => {
    e?.stopPropagation()
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

    const finalPrice = discountActive && !style.is_free
      ? Math.ceil(style.price_neurons * (1 - DISCOUNT_PERCENT / 100))
      : style.price_neurons

    if (coinBalance < finalPrice) {
      haptic.warning()
      toast.error(`Недостаточно нейронов. Нужно: ${finalPrice}, у вас: ${coinBalance}`)
      return
    }

    // Показываем модалку подтверждения
    setConfirmModal(style)
  }

  // Открыть предпросмотр
  const handlePreviewClick = (style: ShopStyle, e?: React.MouseEvent) => {
    e?.stopPropagation()
    haptic.action()
    setPreviewStyle(style)
  }

  // Подтвердить покупку
  const confirmPurchase = async () => {
    if (!confirmModal || !telegramId) return

    setIsProcessing(true)

    try {
      // Пересчитываем цену перед покупкой для надежности
      const priceToPay = discountActive && confirmModal && !confirmModal.is_free
        ? Math.ceil(confirmModal.price_neurons * (1 - DISCOUNT_PERCENT / 100))
        : confirmModal?.price_neurons || 0

      const result = await purchaseStyle(telegramId, confirmModal.style_id, priceToPay)

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
      setPreviewStyle(null) // Закрываем и превью
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
        <h2 className="text-lg font-bold text-gray-900 mb-1">Стили каруселей</h2>
        <p className="text-sm text-gray-500">Уникальный дизайн для ваших постов</p>

        {discountActive && (
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full">
            <span className="text-xs font-bold">💎 Ваша скидка подписчика: {DISCOUNT_PERCENT}%</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {shopStyles.map((style) => {
          const owned = ownsStyle(style.style_id)
          return (
            <div
              key={style.style_id}
              className={`relative bg-white border-2 rounded-2xl p-4 transition-all duration-200 ${owned
                ? 'border-green-400 bg-green-50/50'
                : 'border-gray-200'
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

              <div className="flex items-center gap-3">
                {/* Preview Image */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-md flex-shrink-0"
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{style.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {style.description || 'Уникальный стиль'}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Предпросмотр */}
                  <button
                    onClick={(e) => handlePreviewClick(style, e)}
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer active:scale-95"
                    title="Предпросмотр"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {/* Купить / Есть */}
                  {owned ? (
                    <div className="flex items-center gap-1 text-green-600 px-3 py-2">
                      <Check className="w-5 h-5" />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleBuyClick(style, e)}
                      disabled={isProcessing}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-70"
                    >
                      {style.is_free ? (
                        '0'
                      ) : (
                        discountActive ? (
                          <div className="flex flex-col items-end leading-none">
                            <span className="text-[10px] line-through opacity-70 mb-[-2px]">{style.price_neurons}</span>
                            <span>{Math.ceil(style.price_neurons * (1 - DISCOUNT_PERCENT / 100))}</span>
                          </div>
                        ) : (
                          style.price_neurons
                        )
                      )}
                      <img src="/neirocoin.png" alt="н" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Mini preview row */}
              {style.example_images && style.example_images.length > 0 && (
                <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                  {style.example_images.slice(0, 5).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Пример ${i + 1}`}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                  {style.example_images.length > 5 && (
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                      +{style.example_images.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
        <p className="text-sm text-orange-700">
          Купленные стили появятся в выборе при создании карусели
        </p>
      </div>

      {/* Модалка предпросмотра */}
      {previewStyle && (
        <StylePreviewModal
          style={previewStyle}
          allStyles={shopStyles}
          owned={ownsStyle(previewStyle.style_id)}
          onBuy={() => {
            setPreviewStyle(null)
            handleBuyClick(previewStyle)
          }}
          onChangeStyle={(newStyle) => setPreviewStyle(newStyle)}
          discountActive={discountActive}
        />
      )}

      {/* Модалка подтверждения покупки */}
      {confirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
                  <span className="text-gray-600">Спишется с баланса</span>
                  <div className="flex items-center gap-1.5">
                    {discountActive && !confirmModal.is_free ? (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 line-through text-sm">{confirmModal.price_neurons}</span>
                        <span className="font-bold text-orange-500 text-lg">
                          {Math.ceil(confirmModal.price_neurons * (1 - DISCOUNT_PERCENT / 100))}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-orange-500 text-lg">{confirmModal.price_neurons}</span>
                    )}
                    <img src="/neirocoin.png" alt="нейро" className="w-5 h-5" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Баланс после покупки</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-gray-900">
                      {coinBalance - (discountActive && !confirmModal.is_free
                        ? Math.ceil(confirmModal.price_neurons * (1 - DISCOUNT_PERCENT / 100))
                        : confirmModal.price_neurons)}
                    </span>
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

// ========== STYLE PREVIEW MODAL ==========

interface StylePreviewModalProps {
  style: ShopStyle
  allStyles: ShopStyle[]
  owned: boolean
  onBuy: () => void
  onClose: () => void
  onChangeStyle: (style: ShopStyle) => void
  discountActive?: boolean
}

function StylePreviewModal({ style, allStyles, owned, onBuy, onChangeStyle, discountActive = false }: Omit<StylePreviewModalProps, 'onClose'>) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const minSwipeDistance = 50

  const styleIndex = allStyles.findIndex(s => s.style_id === style.style_id)
  const totalStyles = allStyles.length
  const examples = style.example_images || []

  // Navigate to style
  const navigateToStyle = (newIndex: number) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      onChangeStyle(allStyles[newIndex])
      setLoadedImages(new Set())
      setIsTransitioning(false)
    }, 150)
  }

  const goToPrev = () => {
    const newIndex = styleIndex > 0 ? styleIndex - 1 : totalStyles - 1
    navigateToStyle(newIndex)
  }

  const goToNext = () => {
    const newIndex = styleIndex < totalStyles - 1 ? styleIndex + 1 : 0
    navigateToStyle(newIndex)
  }

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) goToNext()
    else if (isRightSwipe) goToPrev()
  }

  const handleImageLoad = (src: string) => {
    setLoadedImages(prev => new Set(prev).add(src))
  }

  const handleImageError = (src: string) => {
    console.warn('Failed to load image:', src)
    setLoadedImages(prev => new Set(prev).add(src))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Header with Navigation */}
      <div className="px-4 py-4 border-b border-gray-100/50">
        <div className="flex items-center justify-between">
          {/* Prev Button */}
          <button
            onClick={goToPrev}
            className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all cursor-pointer border border-gray-100 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Style Info */}
          <div className="text-center flex-1 px-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full mb-1.5">
              <span className="text-xs font-semibold text-orange-600">{styleIndex + 1} из {totalStyles}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 truncate">{style.name}</h3>
          </div>

          {/* Close Button */}
          {/* Close Button Removed as per user request (system back button used) */}
        </div>

        {/* Progress Dots */}
        <div className="mt-3 flex justify-center gap-1">
          {allStyles.map((s, i) => (
            <button
              key={s.style_id}
              onClick={() => onChangeStyle(allStyles[i])}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${i === styleIndex
                ? 'w-6 bg-gradient-to-r from-orange-500 to-pink-500'
                : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                }`}
            />
          ))}
        </div>
      </div>

      {/* Description */}
      {style.description && (
        <div className="px-4 py-3 bg-gray-50/50">
          <p className="text-sm text-gray-500 text-center line-clamp-2">{style.description}</p>
        </div>
      )}

      {/* Examples Grid */}
      <div className="flex-1 px-4 py-3 overflow-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500">Примеры слайдов</p>
          <span className="text-xs text-gray-400">
            <span className="text-orange-500 font-bold">←</span> Свайп для смены стиля <span className="text-orange-500 font-bold">→</span>
          </span>
        </div>

        {examples.length > 0 ? (
          <div
            className="grid grid-cols-3 gap-2 transition-all duration-200"
            style={{
              opacity: isTransitioning ? 0.5 : 1,
              transform: isTransitioning ? 'scale(0.98)' : 'scale(1)'
            }}
          >
            {examples.slice(0, 9).map((src, i) => (
              <div
                key={`${style.style_id}-${i}`}
                className="aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-gray-100 relative"
              >
                {/* Skeleton while loading */}
                {!loadedImages.has(src) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-orange-400 animate-spin" />
                  </div>
                )}
                <img
                  src={src}
                  alt={`Пример ${i + 1}`}
                  loading={i < 6 ? 'eager' : 'lazy'}
                  onLoad={() => handleImageLoad(src)}
                  onError={() => handleImageError(src)}
                  className="w-full h-full object-cover"
                  style={{
                    opacity: loadedImages.has(src) ? 1 : 0,
                    transition: 'opacity 0.3s ease-in-out'
                  }}
                />
                {/* Номер слайда */}
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="text-[10px] text-white font-medium">{i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-400">Нет примеров</p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="px-4 py-4 bg-white border-t border-gray-100">
        {owned ? (
          <div className="text-center py-3">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <Check className="w-6 h-6" />
              <span className="font-bold text-lg">Этот стиль у вас есть</span>
            </div>
          </div>
        ) : (
          <button
            onClick={onBuy}
            disabled={isTransitioning} // Блокируем во время свайпа
            className={`w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white font-bold text-base shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 ${isTransitioning ? 'opacity-70 cursor-wait' : 'hover:shadow-xl active:scale-[0.98] cursor-pointer'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            Купить "{style.name}" за {discountActive
              ? Math.ceil(style.price_neurons * (1 - DISCOUNT_PERCENT / 100))
              : style.price_neurons}
            <img src="/neirocoin.png" alt="н" className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
