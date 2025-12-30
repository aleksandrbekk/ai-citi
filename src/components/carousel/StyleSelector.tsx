import { useCarouselStore } from '@/store/carouselStore'

const STYLE_OPTIONS = [
  { id: 'ai-citi', label: 'AI CITI', description: 'Фирменный стиль' },
  { id: 'minimal', label: 'Минимализм', description: 'Чистый и простой' },
  { id: 'bright', label: 'Яркий', description: 'Яркие цвета' },
] as const

export function StyleSelector() {
  const { style, setStyle } = useCarouselStore()

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-zinc-300">🎨 Стиль дизайна</label>
      
      <div className="space-y-2">
        {STYLE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className={`
              flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors
              ${style === option.id 
                ? 'bg-orange-500/20 border-2 border-orange-500' 
                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
              }
            `}
          >
            <input
              type="radio"
              name="style"
              value={option.id}
              checked={style === option.id}
              onChange={() => setStyle(option.id as any)}
              className="w-4 h-4 text-orange-500"
            />
            <div className="flex-1">
              <div className="text-white text-sm font-medium">{option.label}</div>
              <div className="text-zinc-400 text-xs">{option.description}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}

