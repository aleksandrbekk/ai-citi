import { useState, useEffect } from 'react'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { getUserPhoto, saveUserPhoto, deleteUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function Profile() {
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Загружаем фото при монтировании
  useEffect(() => {
    const loadPhoto = async () => {
      const telegramUser = getTelegramUser()
      if (!telegramUser?.id) {
        setIsLoading(false)
        return
      }

      const photo = await getUserPhoto(telegramUser.id)
      setUserPhoto(photo)
      setIsLoading(false)
    }

    loadPhoto()
  }, [])

  const handlePhotoChange = async (photo: string | null) => {
    const telegramUser = getTelegramUser()
    if (!telegramUser?.id) {
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

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold">Профиль</h1>

        {/* Секция загрузки фото для каруселей */}
        <div className="bg-zinc-900/50 rounded-xl p-4 space-y-3">
          <div>
            <h2 className="text-lg font-semibold mb-1">📸 Фото для каруселей</h2>
            <p className="text-sm text-zinc-400">
              Загрузите фото где хорошо видно лицо. Оно будет использоваться для AI-генерации каруселей.
            </p>
          </div>

          {isLoading ? (
            <div className="text-zinc-400 text-sm">Загрузка...</div>
          ) : (
            <PhotoUploader 
              photo={userPhoto} 
              onPhotoChange={handlePhotoChange}
              saveToDatabase={true}
            />
          )}
        </div>
      </div>
    </div>
  )
}




