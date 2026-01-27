import { type StyleId } from '@/lib/carouselStyles'
import { getStylesByBundles } from '@/lib/styleBundles'
import { useCarouselStore } from '@/store/carouselStore'
import { CheckIcon } from '@/components/ui/icons'

export function StyleSelector() {
  const { style, setStyle, enabledBundles } = useCarouselStore()

  // Получаем стили только из включённых наборов
  const availableStyles = getStylesByBundles(enabledBundles)

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700">🎨 Стиль дизайна</label>

      <div className="grid grid-cols-1 gap-2">
        {availableStyles.map((option) => (
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
                <div className="text-gray-900 font-medium">{option.name}</div>
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
        ))}
      </div>
    </div>
  )
}
