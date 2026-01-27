import { useCarouselStore, type Gender } from '@/store/carouselStore'

const GENDER_OPTIONS: { id: Gender; label: string; example: string }[] = [
  { id: 'male', label: 'Мужской', example: 'Я сам прошёл...' },
  { id: 'female', label: 'Женский', example: 'Я сама прошла...' },
]

export function GenderSelector() {
  const { gender, setGender } = useCarouselStore()

  return (
    <div className="space-y-2">
      {GENDER_OPTIONS.map((option) => (
        <label
          key={option.id}
          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
            gender === option.id
              ? 'bg-orange-50 border-orange-200'
              : 'bg-white border-gray-200 hover:border-orange-200 hover:bg-orange-50/50'
          }`}
        >
          <input
            type="radio"
            name="gender"
            value={option.id || ''}
            checked={gender === option.id}
            onChange={() => setGender(option.id)}
            className="w-4 h-4 text-orange-500 accent-orange-500"
          />
          <div className="flex-1">
            <span className="text-gray-900 text-sm font-medium">{option.label}</span>
            <p className="text-xs text-gray-500">{option.example}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
