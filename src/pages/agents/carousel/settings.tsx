import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { AudienceSelector } from '@/components/carousel/AudienceSelector'
import { useCarouselStore } from '@/store/carouselStore'
import { saveUserPhoto, deleteUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselSettings() {
  const navigate = useNavigate()
  const { userPhoto, setUserPhoto } = useCarouselStore()

  const handlePhotoChange = async (photo: string | null) => {
    const telegramUser = getTelegramUser()
    if (!telegramUser?.id) {
      setUserPhoto(photo)
      return
    }

    setUserPhoto(photo)

    if (photo) {
      // Сохраняем в БД
      await saveUserPhoto(telegramUser.id, photo, 'face_main')
    } else {
      // Удаляем из БД
      await deleteUserPhoto(telegramUser.id, 'face_main')
    }
  }

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
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">📸 Фото для каруселей</label>
          <p className="text-xs text-zinc-500">
            Загрузите фото где хорошо видно лицо. Оно будет использоваться для AI-генерации каруселей.
          </p>
          <PhotoUploader photo={userPhoto} onPhotoChange={handlePhotoChange} saveToDatabase={true} />
        </div>

        {/* Целевая аудитория */}
        <AudienceSelector />

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

