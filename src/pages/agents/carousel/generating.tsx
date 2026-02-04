import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCarouselStore } from '@/store/carouselStore'
import { getCarouselStyles } from '@/lib/carouselStylesApi'
import { Send, Sparkles, Clock, ExternalLink, Palette, CheckCircle2 } from 'lucide-react'
import { haptic } from '@/lib/haptic'
import type { StyleId } from '@/lib/carouselStyles'

// Telegram иконка SVG
const TelegramIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.89.03-.24.38-.49 1.05-.74 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .37.03.54.18.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
  </svg>
)

// Шаги генерации для анимации
const GENERATION_STEPS = [
  { text: 'Анализируем тему...', duration: 3000 },
  { text: 'Пишем тексты слайдов...', duration: 5000 },
  { text: 'Генерируем дизайн...', duration: 4000 },
  { text: 'Создаём 9 слайдов...', duration: 5000 },
  { text: 'Финальная обработка...', duration: 3000 },
]

// Локальные превью стилей
const LOCAL_STYLE_PREVIEWS: Record<string, string> = {
  APPLE_GLASSMORPHISM: '/styles/apple.jpg',
  AESTHETIC_BEIGE: '/styles/beige.jpg',
  SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
  MINIMALIST_LINE_ART: '/styles/minimal.jpg',
  GRADIENT_MESH_3D: '/styles/gradient.jpg',
}

export default function CarouselGenerating() {
  const navigate = useNavigate()
  const { reset, style, setStyle } = useCarouselStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  // Загружаем стили из БД
  const { data: dbStyles = [] } = useQuery({
    queryKey: ['carousel-styles'],
    queryFn: getCarouselStyles,
    staleTime: 5 * 60 * 1000,
  })

  // Получаем другие стили для рекомендации
  const otherStyles = dbStyles.length > 0
    ? dbStyles.filter(s => s.style_id !== style).slice(0, 2)
    : []

  // Функция получения превью
  const getStylePreview = (styleId: string) => {
    const dbStyle = dbStyles.find(s => s.style_id === styleId)
    if (dbStyle?.preview_image) return dbStyle.preview_image
    return LOCAL_STYLE_PREVIEWS[styleId] || '/styles/apple.jpg'
  }

  // Анимация шагов генерации
  useEffect(() => {
    let totalTime = 0
    const timers: ReturnType<typeof setTimeout>[] = []

    GENERATION_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index)
      }, totalTime)
      timers.push(timer)
      totalTime += step.duration
    })

    // Показываем успех после всех шагов
    const successTimer = setTimeout(() => {
      setShowSuccess(true)
    }, totalTime)
    timers.push(successTimer)

    return () => timers.forEach(t => clearTimeout(t))
  }, [])

  const handleNewCarousel = () => {
    haptic.tap()
    reset()
    navigate('/agents/carousel')
  }

  const handleTryStyle = (styleId: string) => {
    haptic.tap()
    setStyle(styleId as StyleId)
    reset()
    navigate('/agents/carousel')
  }

  const openTelegram = () => {
    haptic.action()
    const tg = window.Telegram?.WebApp
    if (tg) {
      // Открываем чат с ботом через Telegram
      // @ts-ignore - openTelegramLink exists in Telegram WebApp API
      if (typeof tg.openTelegramLink === 'function') {
        // @ts-ignore
        tg.openTelegramLink('https://t.me/Neirociti_bot')
      } else {
        // Fallback: закрываем мини-апп
        tg.close()
      }
    } else {
      window.open('https://t.me/Neirociti_bot', '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-[#FFF8F5] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${
            showSuccess
              ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-500/30'
              : 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30'
          }`}>
            {showSuccess ? (
              <Send className="w-6 h-6 text-white" />
            ) : (
              <Sparkles className="w-6 h-6 text-white animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {showSuccess ? 'Запрос отправлен!' : 'Генерация...'}
            </h1>
            <p className="text-sm text-gray-500">
              {showSuccess ? 'Карусель скоро будет готова' : GENERATION_STEPS[currentStep]?.text}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              showSuccess
                ? 'w-full bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-orange-400 to-cyan-500'
            }`}
            style={{
              width: showSuccess ? '100%' : `${((currentStep + 1) / GENERATION_STEPS.length) * 100}%`
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-400">
            {showSuccess ? 'Готово!' : `Шаг ${currentStep + 1} из ${GENERATION_STEPS.length}`}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>~2 мин</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4 flex flex-col">
        {/* Telegram CTA Card - ГЛАВНЫЙ АКЦЕНТ */}
        <div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-3xl p-5 mb-4 shadow-xl shadow-cyan-500/25 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <TelegramIcon className="w-9 h-9 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white mb-1">
                  Откройте Telegram!
                </h2>
                <p className="text-white/90 text-sm">
                  Карусель придёт в чат бота
                </p>
              </div>
            </div>

            <button
              onClick={openTelegram}
              className="w-full py-4 bg-white rounded-2xl text-cyan-600 font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
            >
              <TelegramIcon className="w-5 h-5" />
              Открыть Telegram
              <ExternalLink className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-center gap-2 mt-3 text-white/80 text-sm">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>AI генерирует 9 слайдов специально для вас</span>
            </div>
          </div>
        </div>

        {/* Успокаивающий блок — можно закрыть */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 mb-4 border border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-800 text-base">
                Можно закрыть приложение
              </p>
              <p className="text-emerald-600 text-sm">
                Карусель придёт в Telegram автоматически через 1-2 минуты
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">Пока ждёте</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Try Other Styles */}
        {otherStyles.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Попробуйте другой стиль</span>
            </div>
            <div className="flex gap-3">
              {otherStyles.map((s) => (
                <button
                  key={s.style_id}
                  onClick={() => handleTryStyle(s.style_id)}
                  className="flex-1 group relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    <img
                      src={getStylePreview(s.style_id)}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                    <p className="text-xs text-white/70">{s.emoji}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom CTAs */}
        <div className="space-y-3">
          <button
            onClick={handleNewCarousel}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
            Создать ещё карусель
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-[0.98] cursor-pointer"
          >
            На главную
          </button>
        </div>
      </div>
    </div>
  )
}
