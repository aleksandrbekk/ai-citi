import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'

const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { setStatus } = useCarouselStore()
  
  const [topic, setTopic] = useState('')
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [cta, setCta] = useState('')
  
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Ошибка загрузки')
      const data = await response.json()
      setUserPhoto(data.secure_url)
    } catch (err) {
      setError('Не удалось загрузить фото')
    } finally {
      setIsUploading(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Напишите тему карусели')
      return
    }
    const tg = window.Telegram?.WebApp
    const chatId = tg?.initDataUnsafe?.user?.id
    if (!chatId) {
      setError('Откройте приложение через Telegram')
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          topic: topic.trim(),
          userPhoto: userPhoto || '',
          cta: cta.trim() || '',
        }),
      })
      if (!response.ok) throw new Error('Ошибка отправки')
      setStatus('generating')
      navigate('/agents/carousel/generating')
    } catch (err) {
      setError('Не удалось отправить запрос')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="sticky top-0 bg-black/90 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3 z-10">
        <button onClick={() => navigate('/agents')} className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">🎨 Карусели</h1>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">📝 Тема карусели <span className="text-orange-500">*</span></label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: 5 ошибок новичков в МЛМ"
            className="w-full p-3 bg-white/5 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none focus:border-orange-500 focus:outline-none"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">📸 Ваше фото</label>
          {userPhoto ? (
            <div className="relative bg-zinc-900 rounded-xl overflow-hidden">
              <img src={userPhoto} alt="Uploaded" className="w-full max-h-[200px] object-contain" />
              <button onClick={() => setUserPhoto(null)} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center cursor-pointer hover:border-zinc-500 transition-colors"
            >
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file) }} />
              {isUploading ? (
                <div className="flex items-center justify-center gap-2 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin" />Загрузка...</div>
              ) : (
                <><Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" /><div className="text-sm text-zinc-400">Нажмите для загрузки фото</div></>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">📣 Призыв к действию</label>
          <textarea
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Например: Пиши МАГИЯ в комментариях — отправлю гайд"
            className="w-full p-3 bg-white/5 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 resize-none focus:border-orange-500 focus:outline-none"
            rows={2}
          />
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>}

        <button
          onClick={handleGenerate}
          disabled={isSubmitting || !topic.trim()}
          className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" />Отправляю...</> : '🎨 Создать карусель'}
        </button>

        <p className="text-center text-zinc-500 text-sm">Результат придёт в Telegram через 1-2 минуты</p>
      </div>
    </div>
  )
}
