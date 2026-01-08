import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useCarouselStore } from '@/store/carouselStore'
import { getUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { setStatus, userPhoto, setUserPhoto } = useCarouselStore()
  
  const [topic, setTopic] = useState('')
  const [cta, setCta] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем фото пользователя из БД при загрузке страницы
  useEffect(() => {
    const loadUserPhoto = async () => {
      const telegramUser = getTelegramUser()
      if (telegramUser?.id) {
        const photoFromDb = await getUserPhoto(telegramUser.id)
        if (photoFromDb) {
          setUserPhoto(photoFromDb)
        }
      }
    }
    loadUserPhoto()
  }, [setUserPhoto])

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
          userPhoto: userPhoto || '', // Фото автоматически загружается из профиля
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

        {/* Индикатор статуса фото */}
        {userPhoto ? (
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span>✅</span>
            <span>Фото загружено из профиля</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-yellow-500">
            <span>⚠️</span>
            <span>Загрузите фото в профиле для персонализации</span>
          </div>
        )}

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
