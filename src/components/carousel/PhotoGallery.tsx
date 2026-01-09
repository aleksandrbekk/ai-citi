import { useState, useEffect, useRef } from 'react'
import { X, Loader2, ImagePlus } from 'lucide-react'
import { getTelegramUser } from '@/lib/telegram'
import { getUserPhotoGallery, savePhotoToSlot, deletePhotoFromSlot, getUserPhoto, deleteUserPhoto } from '@/lib/supabase'
import type { GalleryPhoto } from '@/lib/supabase'

const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

const MAX_SLOTS = 3

interface PhotoGalleryProps {
  onPhotoSelect?: (photoUrl: string) => void
  selectedPhoto?: string | null
}

export function PhotoGallery({ onPhotoSelect, selectedPhoto }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<(GalleryPhoto | null)[]>([null, null, null])
  const [isLoading, setIsLoading] = useState(true)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const telegramUser = getTelegramUser()
  const telegramId = telegramUser?.id

  useEffect(() => {
    loadPhotos()
  }, [telegramId])

  const loadPhotos = async () => {
    if (!telegramId) {
      setIsLoading(false)
      return
    }

    try {
      // Загружаем из новой таблицы user_photo_gallery
      const gallery = await getUserPhotoGallery(telegramId)
      const slots: (GalleryPhoto | null)[] = [null, null, null]

      gallery.forEach(photo => {
        if (photo.slot_index >= 1 && photo.slot_index <= 3) {
          slots[photo.slot_index - 1] = photo
        }
      })

      // Если первый слот пустой, проверяем старую таблицу user_photos
      if (!slots[0]) {
        const legacyPhoto = await getUserPhoto(telegramId)
        if (legacyPhoto) {
          // Создаём виртуальный объект для отображения
          slots[0] = {
            id: 'legacy',
            telegram_id: telegramId,
            photo_url: legacyPhoto,
            slot_index: 1,
            created_at: new Date().toISOString()
          }
        }
      }

      setPhotos(slots)
    } catch (err) {
      console.error('Error loading photos:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (file: File, slotIndex: number) => {
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }

    if (!telegramId) {
      setError('Не удалось определить пользователя')
      return
    }

    setUploadingSlot(slotIndex)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      formData.append('folder', `carousel-users/${telegramId}`)

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Ошибка загрузки')
      }

      const data = await response.json()
      const photoUrl = data.secure_url

      const success = await savePhotoToSlot(telegramId, photoUrl, slotIndex)

      if (success) {
        await loadPhotos()
        if (onPhotoSelect) {
          onPhotoSelect(photoUrl)
        }
      } else {
        throw new Error('Не удалось сохранить')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      console.error('Upload error:', err)
    } finally {
      setUploadingSlot(null)
    }
  }

  const handleDelete = async (slotIndex: number) => {
    if (!telegramId) return

    try {
      const photo = photos[slotIndex - 1]

      // Если это legacy фото из старой таблицы
      if (photo?.id === 'legacy') {
        const success = await deleteUserPhoto(telegramId, 'face_main')
        if (success) {
          await loadPhotos()
        }
      } else {
        // Обычное фото из новой таблицы
        const success = await deletePhotoFromSlot(telegramId, slotIndex)
        if (success) {
          await loadPhotos()
        }
      }
    } catch (err) {
      console.error('Delete error:', err)
    }
  }

  const handleSlotClick = (slotIndex: number, photo: GalleryPhoto | null) => {
    if (photo && onPhotoSelect) {
      onPhotoSelect(photo.photo_url)
    } else if (!photo) {
      fileInputRefs.current[slotIndex - 1]?.click()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">📸 Ваши фото</label>
        <span className="text-xs text-zinc-500">
          {photos.filter(p => p !== null).length} / {MAX_SLOTS}
        </span>
      </div>

      <p className="text-xs text-zinc-500">
        Загрузите до 3 фото. Они будут использоваться для AI-генерации каруселей.
      </p>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => {
          const slotIndex = index + 1
          const isUploading = uploadingSlot === slotIndex
          const isSelected = selectedPhoto && photo?.photo_url === selectedPhoto

          return (
            <div key={slotIndex} className="relative aspect-[3/4]">
              <input
                ref={el => { fileInputRefs.current[index] = el }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file, slotIndex)
                  e.target.value = ''
                }}
              />

              {photo ? (
                <div
                  className={`relative w-full h-full rounded-xl overflow-hidden cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-black' : 'hover:opacity-90'
                  }`}
                  onClick={() => handleSlotClick(slotIndex, photo)}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Фото ${slotIndex}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(slotIndex)
                    }}
                    className="absolute top-1 right-1 p-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                  {isSelected && (
                    <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-orange-500 rounded text-[10px] font-medium">
                      Выбрано
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRefs.current[index]?.click()}
                  disabled={isUploading}
                  className="w-full h-full border-2 border-dashed border-zinc-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-zinc-600 hover:bg-zinc-900/50 transition-colors disabled:opacity-50"
                >
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-zinc-500" />
                      <span className="text-xs text-zinc-500">Добавить</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <div className="text-sm text-red-400 text-center">{error}</div>
      )}
    </div>
  )
}
