import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { AudienceSelector } from '@/components/carousel/AudienceSelector'
import { StyleSelector } from '@/components/carousel/StyleSelector'
import { useCarouselStore } from '@/store/carouselStore'

export default function CarouselSettings() {
  const navigate = useNavigate()
  const { userPhoto, setUserPhoto, mode, setMode } = useCarouselStore()

  const handleNext = () => {
    navigate('/agents/carousel/content')
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents/carousel')}
          className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Переключатель режима */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Режим генерации</label>
          <div className="flex gap-2 p-1 bg-zinc-800 rounded-lg">
            <button 
              onClick={() => setMode('ai')}
              className={`flex-1 py-2 px-4 rounded-md transition ${
                mode === 'ai' 
                  ? 'bg-amber-500 text-black font-semibold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🤖 AI генерация
            </button>
            <button 
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 px-4 rounded-md transition ${
                mode === 'manual' 
                  ? 'bg-amber-500 text-black font-semibold' 
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              ✍️ Вручную
            </button>
          </div>
        </div>

        {/* Загрузка фото */}
        <PhotoUploader photo={userPhoto} onPhotoChange={setUserPhoto} />

        {/* Целевая аудитория */}
        <AudienceSelector />

        {/* Стиль */}
        <StyleSelector />

        {/* Кнопка далее */}
        <button
          onClick={handleNext}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold"
        >
          Далее →
        </button>
      </div>
    </div>
  )
}

