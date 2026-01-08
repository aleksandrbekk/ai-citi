import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

interface PhotoUploaderProps {
  photo: string | null
  onPhotoChange: (photo: string | null) => void
  saveToDatabase?: boolean // Опция для сохранения в БД
}

export function PhotoUploader({ photo, onPhotoChange, saveToDatabase = false }: PhotoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      // Получаем telegram_id
      const telegramUser = getTelegramUser()
      if (!telegramUser?.id) {
        throw new Error('Не удалось определить пользователя')
      }
      const telegramId = telegramUser.id

      // Загружаем в Cloudinary
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

      // Обновляем локальное состояние
      onPhotoChange(photoUrl)
      setUploadProgress(100)

      // Сохраняем в Supabase, если нужно
      if (saveToDatabase) {
        const { error: dbError } = await supabase
          .from('user_photos')
          .upsert({
            telegram_id: telegramId,
            face_main: photoUrl,
            cloudinary_folder: `carousel-users/${telegramId}`,
          }, {
            onConflict: 'telegram_id'
          })

        if (dbError) {
          console.error('Error saving to database:', dbError)
          // Не показываем ошибку пользователю, т.к. фото уже загружено
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemove = () => {
    onPhotoChange(null)
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">📸 Фото (опционально)</label>
      
      {photo ? (
        <div className="relative bg-zinc-900 rounded-xl flex items-center justify-center min-h-[150px]">
          <img 
            src={photo} 
            alt="Uploaded" 
            className="w-full max-h-[200px] object-contain rounded-xl"
          />
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleClick}
          className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-zinc-600 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          
          {isUploading ? (
            <div className="space-y-2">
              <div className="text-zinc-400">Загрузка...</div>
              {uploadProgress > 0 && (
                <div className="w-full bg-zinc-800 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <>
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <div className="text-sm text-zinc-400">
                Перетащите фото или нажмите для выбора
              </div>
            </>
          )}
        </div>
      )}
      
      {error && (
        <div className="text-sm text-red-400">{error}</div>
      )}
    </div>
  )
}

