import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { AudienceSelector } from '@/components/carousel/AudienceSelector'
import { StyleSelector } from '@/components/carousel/StyleSelector'
import { useCarouselStore } from '@/store/carouselStore'

export default function CarouselSettings() {
  const navigate = useNavigate()
  const { userPhoto, setUserPhoto } = useCarouselStore()

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

