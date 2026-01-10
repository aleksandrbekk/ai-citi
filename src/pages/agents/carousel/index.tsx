import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { STYLES_INDEX, STYLE_CONFIGS, VASIA_CORE, FORMAT_UNIVERSAL, type StyleId } from '@/lib/carouselStyles'
import { BackIcon, CarouselIcon, LoaderIcon, CheckIcon, SendIcon, SparkleIcon } from '@/components/ui/icons'

// Ключ для localStorage
const SAVED_STYLE_KEY = 'carousel_default_style'

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { setStatus, userPhoto, setUserPhoto, style, setStyle } = useCarouselStore()

  // Wizard state
  const [step, setStep] = useState(1)
  const [topic, setTopic] = useState('')
  const [cta, setCta] = useState('')
  const [saveAsDefault] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Загружаем сохранённый стиль
  useEffect(() => {
    const savedStyle = localStorage.getItem(SAVED_STYLE_KEY) as StyleId | null
    if (savedStyle && STYLES_INDEX.find(s => s.id === savedStyle)) {
      setStyle(savedStyle)
    }
  }, [setStyle])

  // Загружаем фото пользователя
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

  const handleSelectStyle = (styleId: StyleId) => {
    setStyle(styleId)
    if (saveAsDefault) {
      localStorage.setItem(SAVED_STYLE_KEY, styleId)
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

  const currentStyleMeta = STYLES_INDEX.find(s => s.id === style)

  const steps = [
    { id: 1, label: 'Тема' },
    { id: 2, label: 'Стиль' },
    { id: 3, label: 'Готово' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
      {/* Декоративные элементы */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-0 w-64 h-64 bg-orange-200/30 rounded-full blur-3xl" />

      {/* Header */}
      <div className="sticky top-0 z-20 nav-glass px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/agents')}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <BackIcon size={24} className="text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <CarouselIcon size={24} className="text-orange-500" />
          <h1 className="text-xl font-bold text-gray-900">Создание карусели</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative z-10 px-4 py-6">
        <div className="flex items-center justify-between max-w-xs mx-auto">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${step >= s.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-400'
                    }`}
                >
                  {step > s.id ? <CheckIcon size={20} /> : s.id}
                </div>
                <span className={`text-xs mt-1 ${step >= s.id ? 'text-orange-500' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.id ? 'bg-orange-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="relative z-10 px-4">
        {/* STEP 1: Тема */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              О чём будет карусель?
            </h2>

            <div className="glass-card-strong p-6 mb-6">
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Напиши тему..."
                className="w-full h-40 bg-transparent text-gray-900 placeholder-gray-400 resize-none focus:outline-none text-lg"
                autoFocus
              />
            </div>

            <p className="text-center text-gray-400 text-sm mb-8">
              Выбранный стиль: {currentStyleMeta?.emoji} {currentStyleMeta?.name}
            </p>

            <button
              onClick={() => topic.trim() && setStep(2)}
              disabled={!topic.trim()}
              className="w-full py-4 btn-primary text-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              Далее
              <SendIcon size={20} className="text-white" />
            </button>
          </div>
        )}

        {/* STEP 2: Стиль */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              Выбери стиль
            </h2>
            <p className="text-center text-gray-500 mb-6">
              Стиль сохранится для будущих каруселей
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {STYLES_INDEX.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSelectStyle(option.id as StyleId)}
                  className={`glass-card p-4 text-center transition-all ${style === option.id
                    ? 'ring-2 ring-orange-500 bg-orange-50/50'
                    : 'hover:bg-white/80'
                    }`}
                >
                  <div
                    className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center text-4xl"
                    style={{ backgroundColor: option.previewColor + '20' }}
                  >
                    {option.emoji}
                  </div>
                  <p className="font-medium text-gray-900 text-sm">{option.name}</p>
                  {option.audience === 'female' && (
                    <span className="text-xs text-pink-500">♀</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 btn-primary text-lg flex items-center justify-center gap-2"
            >
              Далее
              <SendIcon size={20} className="text-white" />
            </button>
          </div>
        )}

        {/* STEP 3: Финал */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right duration-300">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Почти готово!
            </h2>

            {/* Превью выбранного */}
            <div className="glass-card p-4 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: currentStyleMeta?.previewColor + '20' }}
                >
                  {currentStyleMeta?.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{currentStyleMeta?.name}</p>
                  <p className="text-gray-500 text-sm truncate">{topic}</p>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="text-orange-500 text-sm"
                >
                  Изменить
                </button>
              </div>
            </div>

            {/* Фото */}
            <div className="glass-card p-4 mb-4">
              {userPhoto ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckIcon size={20} className="text-green-600" />
                  </div>
                  <p className="text-gray-900">Фото загружено из профиля</p>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <SparkleIcon size={20} className="text-amber-600" />
                  </div>
                  <p className="text-gray-500">Фото не загружено (опционально)</p>
                </div>
              )}
            </div>

            {/* CTA */}
            <div className="glass-card p-4 mb-6">
              <label className="text-sm text-gray-500 mb-2 block">📣 Призыв к действию</label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="Пиши МАГИЯ"
                className="w-full bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </div>

            {error && (
              <div className="glass-card p-4 border-red-200 bg-red-50/50 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isSubmitting}
              className="w-full py-4 btn-primary text-lg flex items-center justify-center gap-3 animate-pulse-glow"
            >
              {isSubmitting ? (
                <>
                  <LoaderIcon size={24} className="text-white" />
                  Создаю...
                </>
              ) : (
                <>
                  <SparkleIcon size={24} className="text-white" />
                  Создать карусель
                </>
              )}
            </button>

            <p className="text-center text-gray-400 text-sm mt-4">
              Результат придёт в Telegram через 1-2 минуты
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
