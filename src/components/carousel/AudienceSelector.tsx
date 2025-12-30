import { useCarouselStore } from '@/store/carouselStore'

const AUDIENCE_OPTIONS = [
  { id: 'networkers', label: 'Сетевики' },
  { id: 'experts', label: 'Эксперты' },
  { id: 'moms', label: 'Мамы в декрете' },
  { id: 'freelancers', label: 'Фрилансеры' },
  { id: 'custom', label: 'Своя ЦА' },
] as const

export function AudienceSelector() {
  const { audience, customAudience, setAudience, setCustomAudience } = useCarouselStore()

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-zinc-300">👥 Целевая аудитория</label>
      
      <div className="space-y-2">
        {AUDIENCE_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
          >
            <input
              type="radio"
              name="audience"
              value={option.id}
              checked={audience === option.id}
              onChange={() => setAudience(option.id as any)}
              className="w-4 h-4 text-orange-500"
            />
            <span className="text-white text-sm">{option.label}</span>
          </label>
        ))}
      </div>
      
      {audience === 'custom' && (
        <textarea
          value={customAudience}
          onChange={(e) => setCustomAudience(e.target.value)}
          placeholder="Опишите целевую аудиторию..."
          className="w-full p-3 bg-white/5 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none"
          rows={3}
        />
      )}
    </div>
  )
}

