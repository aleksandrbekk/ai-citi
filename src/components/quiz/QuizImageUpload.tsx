import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { getTelegramUser } from '@/lib/telegram'

const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

interface QuizImageUploadProps {
  imageUrl: string | null | undefined
  onImageChange: (url: string | null) => void
  label?: string
  compact?: boolean
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto'
}

export function QuizImageUpload({
  imageUrl,
  onImageChange,
  label,
  compact = false,
  aspectRatio = 'auto',
}: QuizImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const aspectClass = {
    square: 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    auto: compact ? 'h-20' : 'min-h-[120px]',
  }[aspectRatio]

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    setIsUploading(true)
    try {
      const telegramUser = getTelegramUser()
      const telegramId = telegramUser?.id || 'unknown'

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      formData.append('folder', `quiz-images/${telegramId}`)

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Upload failed')

      const data = await response.json()
      onImageChange(data.secure_url)
    } catch (err) {
      console.error('Quiz image upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  if (imageUrl) {
    return (
      <div className={`relative rounded-xl overflow-hidden bg-gray-50 ${aspectClass}`}>
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        <button
          onClick={() => onImageChange(null)}
          className="absolute top-1.5 right-1.5 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
          type="button"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    )
  }

  return (
    <div>
      {label && <label className="block text-sm text-gray-500 mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          if (file) handleUpload(file)
        }}
        onDragOver={(e) => e.preventDefault()}
        className={`w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-orange-300 hover:bg-orange-50/30 transition-colors ${
          compact ? 'p-2' : 'p-4'
        } ${aspectClass}`}
        disabled={isUploading}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
        {isUploading ? (
          <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
        ) : (
          <>
            <Upload className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400`} />
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-400`}>
              {compact ? 'Фото' : 'Загрузить фото'}
            </span>
          </>
        )}
      </button>
    </div>
  )
}
