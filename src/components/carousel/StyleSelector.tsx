import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { type StyleId, type StyleMeta } from '@/lib/carouselStyles'
import { getStylesByBundles } from '@/lib/styleBundles'
import { useCarouselStore } from '@/store/carouselStore'
import { CheckIcon } from '@/components/ui/icons'
import { getTelegramUser } from '@/lib/telegram'
import { getUserPurchasedStyles, getCarouselStyles, type CarouselStyleDB } from '@/lib/carouselStylesApi'

// Ключ для localStorage
const HIDDEN_STYLES_KEY = 'carousel_hidden_styles'

// Получить скрытые стили из localStorage
function getHiddenStyles(): string[] {
  try {
    const stored = localStorage.getItem(HIDDEN_STYLES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

// Сохранить скрытые стили в localStorage
function setHiddenStyles(styleIds: string[]) {
  localStorage.setItem(HIDDEN_STYLES_KEY, JSON.stringify(styleIds))
}

export function StyleSelector() {
  const { style, setStyle, enabledBundles } = useCarouselStore()
  const [showSettings, setShowSettings] = useState(false)
  const [hiddenStyles, setHiddenStylesState] = useState<string[]>(getHiddenStyles)
  const [purchasedStyles, setPurchasedStyles] = useState<CarouselStyleDB[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const telegramUser = getTelegramUser()

  // Загружаем купленные стили
  useEffect(() => {
    const loadPurchasedStyles = async () => {
      if (!telegramUser?.id) {
        setIsLoading(false)
        return
      }

      try {
        // Получаем список купленных стилей пользователя
        const purchases = await getUserPurchasedStyles(telegramUser.id)
        const purchasedIds = purchases.map(p => p.style_id)

        if (purchasedIds.length > 0) {
          // Получаем полные данные купленных стилей из БД
          const allDbStyles = await getCarouselStyles()
          const boughtStyles = allDbStyles.filter(s =>
            purchasedIds.includes(s.style_id) && !s.is_free
          )
          setPurchasedStyles(boughtStyles)
        }
      } catch (error) {
        console.error('Error loading purchased styles:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPurchasedStyles()
  }, [telegramUser?.id])

  // Базовые стили из бандлов
  const baseStyles = getStylesByBundles(enabledBundles)

  // Все доступные стили (базовые + купленные)
  const allAvailableStyles: StyleMeta[] = [
    ...baseStyles,
    // Добавляем купленные стили (конвертируем формат)
    ...purchasedStyles.map(dbStyle => ({
      id: dbStyle.style_id as StyleId,
      name: dbStyle.name,
      emoji: dbStyle.emoji,
      description: dbStyle.description || '',
      audience: (dbStyle.audience === 'male' ? 'universal' : dbStyle.audience) as 'universal' | 'female',
      previewColor: dbStyle.preview_color,
    }))
  ]

  // Фильтруем по скрытым
  const visibleStyles = allAvailableStyles.filter(s => !hiddenStyles.includes(s.id))

  const toggleStyleVisibility = (styleId: string) => {
    const newHidden = hiddenStyles.includes(styleId)
      ? hiddenStyles.filter(id => id !== styleId)
      : [...hiddenStyles, styleId]

    setHiddenStylesState(newHidden)
    setHiddenStyles(newHidden)

    // Если текущий выбранный стиль скрыли — сбросим на первый видимый
    if (newHidden.includes(style)) {
      const firstVisible = allAvailableStyles.find(s => !newHidden.includes(s.id))
      if (firstVisible) {
        setStyle(firstVisible.id as StyleId)
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">🎨 Стиль дизайна</label>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title="Настройки стилей"
        >
          <Settings className={`w-4 h-4 ${showSettings ? 'text-orange-500' : 'text-gray-400'}`} />
        </button>
      </div>

      {/* Панель настроек */}
      {showSettings && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Скрыть ненужные стили:</p>
          <div className="space-y-1.5">
            {allAvailableStyles.map((option) => {
              const isHidden = hiddenStyles.includes(option.id)
              const isPurchased = purchasedStyles.some(p => p.style_id === option.id)
              return (
                <label
                  key={option.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-white cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!isHidden}
                    onChange={() => toggleStyleVisibility(option.id)}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm">{option.emoji}</span>
                  <span className={`text-sm flex-1 ${isHidden ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {option.name}
                  </span>
                  {isPurchased && (
                    <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">
                      Куплен
                    </span>
                  )}
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Список стилей */}
      {isLoading ? (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : visibleStyles.length === 0 ? (
        <div className="text-center py-4 text-gray-500 text-sm">
          Все стили скрыты. Нажмите ⚙️ чтобы включить.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {visibleStyles.map((option) => {
            const isPurchased = purchasedStyles.some(p => p.style_id === option.id)
            return (
              <label
                key={option.id}
                className={`
                  glass-card p-4 cursor-pointer transition-all
                  ${style === option.id
                    ? 'ring-2 ring-orange-500 bg-orange-50/50'
                    : 'hover:bg-white/80'
                  }
                `}
              >
                <input
                  type="radio"
                  name="style"
                  value={option.id}
                  checked={style === option.id}
                  onChange={() => setStyle(option.id as StyleId)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: option.previewColor + '20' }}
                  >
                    {option.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-900 font-medium">{option.name}</span>
                      {isPurchased && (
                        <span className="text-[10px] bg-gradient-to-r from-orange-400 to-orange-500 text-white px-1.5 py-0.5 rounded">
                          PRO
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 text-sm truncate">{option.description}</div>
                  </div>
                  {option.audience === 'female' && (
                    <span className="text-xs text-pink-500 bg-pink-100 px-2 py-1 rounded-full">♀</span>
                  )}
                  {style === option.id && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <CheckIcon size={14} className="text-white" />
                    </div>
                  )}
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}
