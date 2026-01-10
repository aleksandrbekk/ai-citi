import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PhotoGallery } from '@/components/carousel/PhotoGallery'
import { AudienceSelector } from '@/components/carousel/AudienceSelector'
import { useCarouselStore } from '@/store/carouselStore'
import { saveUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselSettings() {
  const navigate = useNavigate()
  const { userPhoto, setUserPhoto } = useCarouselStore()

  const handlePhotoSelect = async (photoUrl: string) => {
    const telegramUser = getTelegramUser()

    setUserPhoto(photoUrl)

    if (telegramUser?.id) {
      await saveUserPhoto(telegramUser.id, photoUrl, 'face_main')
    }
  }

  const handleNext = () => {
    navigate('/agents/carousel/content')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-b from-white to-gray-50/90 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents/carousel')}
          className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Настройки</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Галерея фото */}
        <PhotoGallery
          onPhotoSelect={handlePhotoSelect}
          selectedPhoto={userPhoto}
        />

        {/* Целевая аудитория */}
        <AudienceSelector />

        {/* Кнопка далее */}
        <button
          onClick={handleNext}
          disabled={!userPhoto}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-gray-900 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {userPhoto ? 'Далее →' : 'Выберите фото'}
        </button>
      </div>
    </div>
  )
}

