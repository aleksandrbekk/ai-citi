import { useState, useEffect } from 'react'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { getUserPhotoGallery, savePhotoToSlot, deletePhotoFromSlot, getUserPhoto, type GalleryPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function Profile() {
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadPhotos = async () => {
      const telegramUser = getTelegramUser()
      if (!telegramUser?.id) {
        setIsLoading(false)
        return
      }

      const gallery = await getUserPhotoGallery(telegramUser.id)
      const photoArray: (string | null)[] = [null, null, null]
      gallery.forEach((photo: GalleryPhoto) => {
        if (photo.slot_index >= 1 && photo.slot_index <= 3) {
          photoArray[photo.slot_index - 1] = photo.photo_url
        }
      })

      // Если первый слот пустой, проверяем legacy таблицу user_photos
      if (!photoArray[0]) {
        const legacyPhoto = await getUserPhoto(telegramUser.id)
        if (legacyPhoto) {
          photoArray[0] = legacyPhoto
        }
      }

      setPhotos(photoArray)
      setIsLoading(false)
    }

    loadPhotos()
  }, [])

  const handlePhotoChange = async (slotIndex: number, photo: string | null) => {
    const telegramUser = getTelegramUser()
    if (!telegramUser?.id) return

    const newPhotos = [...photos]
    newPhotos[slotIndex] = photo
    setPhotos(newPhotos)

    if (photo) {
      await savePhotoToSlot(telegramUser.id, photo, slotIndex + 1)
    } else {
      await deletePhotoFromSlot(telegramUser.id, slotIndex + 1)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold">Профиль</h1>

        <div className="bg-zinc-900/50 rounded-xl p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">📸 Фото для каруселей</h2>
            <p className="text-sm text-zinc-400">
              Загрузите до 3 фото где хорошо видно лицо
            </p>
          </div>

          {isLoading ? (
            <div className="text-zinc-400 text-sm">Загрузка...</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="aspect-square">
                  <PhotoUploader 
                    photo={photos[index]} 
                    onPhotoChange={(photo) => handlePhotoChange(index, photo)}
                    saveToDatabase={false}
                    compact={true}
                  />
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-zinc-500">
            Первое фото используется по умолчанию
          </p>
        </div>
      </div>
    </div>
  )
}




