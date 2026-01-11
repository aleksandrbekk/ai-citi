import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PhotoUploader } from '@/components/carousel/PhotoUploader'
import { getUserPhotoGallery, savePhotoToSlot, deletePhotoFromSlot, getUserPhoto, deleteFromCloudinary, type GalleryPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { Settings } from 'lucide-react'

// Админские telegram ID
const ADMIN_IDS = [643763835, 190202791]

export default function Profile() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const isAdmin = telegramUser?.id && ADMIN_IDS.includes(telegramUser.id)
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

    const oldPhoto = photos[slotIndex]
    const newPhotos = [...photos]
    newPhotos[slotIndex] = photo
    setPhotos(newPhotos)

    if (photo) {
      await savePhotoToSlot(telegramUser.id, photo, slotIndex + 1)
    } else {
      // Удаляем из Cloudinary если было фото
      if (oldPhoto) {
        await deleteFromCloudinary(oldPhoto)
      }
      await deletePhotoFromSlot(telegramUser.id, slotIndex + 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      <div className="p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Профиль</h1>
          {isAdmin && (
            <button
              onClick={() => navigate('/mini-admin')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <Settings size={18} />
              Админка
            </button>
          )}
        </div>

        <div className="glass-card/50 rounded-xl p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">📸 Фото для каруселей</h2>
            <p className="text-sm text-gray-500">
              Загрузите до 3 фото где хорошо видно лицо
            </p>
          </div>

          {isLoading ? (
            <div className="text-gray-500 text-sm">Загрузка...</div>
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
          
          <p className="text-xs text-gray-400">
            Первое фото используется по умолчанию
          </p>
        </div>
      </div>
    </div>
  )
}




