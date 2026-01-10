import { STYLES_INDEX, type StyleId } from '@/lib/carouselStyles'
import { useCarouselStore } from '@/store/carouselStore'

export function StyleSelector() {
  const { style, setStyle } = useCarouselStore()

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-300">🎨 Стиль дизайна</label>

      <div className="grid grid-cols-1 gap-2">
        {STYLES_INDEX.map((option) => (
          <label
            key={option.id}
            className={`
              flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
              ${style === option.id
                ? 'bg-orange-500/20 border-2 border-orange-500 shadow-lg shadow-orange-500/20'
                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
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
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: option.previewColor + '20' }}
            >
              {option.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{option.name}</div>
              <div className="text-zinc-400 text-xs truncate">{option.description}</div>
            </div>
            {option.audience === 'female' && (
              <span className="text-xs text-pink-400 bg-pink-400/10 px-2 py-0.5 rounded-full">♀</span>
            )}
            {style === option.id && (
              <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
