import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { StyleSelector } from '@/components/carousel/StyleSelector'
import { STYLE_CONFIGS, VASIA_CORE, FORMAT_UNIVERSAL } from '@/lib/carouselStyles'
import { BackIcon, CarouselIcon, LoaderIcon, CheckIcon, ImageIcon } from '@/components/ui/icons'

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { setStatus, userPhoto, setUserPhoto, style } = useCarouselStore()

  const [topic, setTopic] = useState('')
  const [cta, setCta] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadUserPhoto = async () => {
      const telegramUser = getTelegramUser()
      if (telegramUser?.id) {
        const photoFromDb = await getFirstUserPhoto(telegramUser.id)
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
      const styleConfig = STYLE_CONFIGS[style]

      const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          topic: topic.trim(),
          userPhoto: userPhoto || '',
          cta: cta.trim() || '',
          styleId: style,
          styleConfig: styleConfig,
          vasiaCore: VASIA_CORE,
          formatConfig: FORMAT_UNIVERSAL,
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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      {/* Декоративные элементы */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-0 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" />

      {/* Header */}
      <div className="sticky top-0 z-20 nav-glass px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/agents')}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <BackIcon size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <CarouselIcon size={24} className="text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Карусели</h1>
        </div>
      </div>

      <div className="relative z-10 p-4 space-y-6">
        {/* Тема карусели */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            📝 Тема карусели <span className="text-orange-500">*</span>
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: 5 ошибок новичков в МЛМ"
            className="w-full p-4 glass-input text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
            rows={3}
          />
        </div>

        {/* Индикатор статуса фото */}
        <div className="glass-card p-4">
          {userPhoto ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckIcon size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Фото загружено</p>
                <p className="text-gray-500 text-sm">Из вашего профиля</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ImageIcon size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-gray-900 font-medium">Нет фото</p>
                <p className="text-gray-500 text-sm">Загрузите в профиле для персонализации</p>
              </div>
            </div>
          )}
        </div>

        {/* Селектор стиля */}
        <StyleSelector />

        {/* Призыв к действию */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">📣 Призыв к действию</label>
          <textarea
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            placeholder="Например: Пиши МАГИЯ в комментариях — отправлю гайд"
            className="w-full p-4 glass-input text-gray-900 placeholder-gray-400 resize-none focus:outline-none"
            rows={2}
          />
        </div>

        {/* Ошибка */}
        {error && (
          <div className="glass-card p-4 border-red-200 bg-red-50/50">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Кнопка создания */}
        <button
          onClick={handleGenerate}
          disabled={isSubmitting || !topic.trim()}
          className="w-full py-4 btn-primary text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:transform-none"
        >
          {isSubmitting ? (
            <>
              <LoaderIcon size={24} className="text-white" />
              Отправляю...
            </>
          ) : (
            <>
              <CarouselIcon size={24} className="text-white" />
              Создать карусель
            </>
          )}
        </button>

        {/* Подсказка */}
        <p className="text-center text-gray-400 text-sm">
          Результат придёт в Telegram через 1-2 минуты
        </p>
      </div>
    </div>
  )
}
