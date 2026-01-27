import { useNavigate } from 'react-router-dom'
import { PhotoGallery } from '@/components/carousel/PhotoGallery'
import { AudienceSelector } from '@/components/carousel/AudienceSelector'
import { GenderSelector } from '@/components/carousel/GenderSelector'
import { BundleSelector } from '@/components/carousel/BundleSelector'
import { useCarouselStore } from '@/store/carouselStore'
import { saveUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { Camera, Users, UserCircle, Palette } from 'lucide-react'

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
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Шаг 1 из 2</h1>
            <p className="text-sm text-gray-500">Фото и аудитория</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Галерея фото */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Твои фото</h2>
          </div>
          <PhotoGallery
            onPhotoSelect={handlePhotoSelect}
            selectedPhoto={userPhoto}
          />
        </div>

        {/* Пол для текста */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserCircle className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Пол для текста</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">Для правильного склонения: "сам" или "сама"</p>
          <GenderSelector />
        </div>

        {/* Целевая аудитория */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Целевая аудитория</h2>
          </div>
          <AudienceSelector />
        </div>

        {/* Наборы стилей */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-orange-500" />
            <h2 className="font-semibold text-gray-900">Наборы стилей</h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">Выберите какие стили будут доступны</p>
          <BundleSelector />
        </div>

        {/* Кнопка далее */}
        <button
          onClick={handleNext}
          disabled={!userPhoto}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform"
        >
          {userPhoto ? 'Далее →' : 'Сначала выберите фото'}
        </button>
      </div>
    </div>
  )
}

