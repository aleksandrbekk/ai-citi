import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { STYLES_INDEX } from '@/lib/carouselStyles'
import { Sparkles, Send, Clock, Lightbulb } from 'lucide-react'

export default function CarouselResult() {
  const navigate = useNavigate()
  const { reset, style } = useCarouselStore()

  const handleNewCarousel = () => {
    reset()
    navigate('/agents/carousel')
  }

  // Получаем 2 других стиля для рекомендации
  const otherStyles = STYLES_INDEX.filter(s => s.id !== style).slice(0, 2)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-[#FFF8F5] p-4 flex flex-col">
      {/* Animated header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30 animate-pulse">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Запрос отправлен!</h1>
          <p className="text-xs text-gray-500">Генерация началась</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
        {/* Animated generation indicator */}
        <div className="relative mb-6">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-400 to-cyan-400 opacity-20 blur-xl animate-pulse"
               style={{ transform: 'scale(1.5)' }} />

          {/* Main circle */}
          <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-orange-400 via-orange-500 to-cyan-500 p-1 animate-spin-slow">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-orange-500 animate-pulse" />
            </div>
          </div>

          {/* Floating particles */}
          <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-cyan-400 animate-bounce opacity-80" />
          <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-orange-400 animate-bounce delay-150 opacity-80" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Карусель генерируется
        </h2>

        <p className="text-gray-600 mb-1">
          Слайды придут в Telegram
        </p>

        {/* Time badge */}
        <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-full px-4 py-2 mb-6 shadow-sm">
          <Clock className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-gray-700">2-3 минуты</span>
        </div>

        {/* Info card */}
        <div className="w-full bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 mb-1">Совет</p>
              <p className="text-xs text-gray-600">
                Откройте Telegram и дождитесь всех 9 слайдов перед публикацией в Instagram
              </p>
            </div>
          </div>
        </div>

        {/* Try other styles section */}
        <div className="w-full mb-6">
          <p className="text-sm font-medium text-gray-500 mb-3">Пока ждёте, попробуйте другие стили:</p>
          <div className="flex gap-2">
            {otherStyles.map((style) => (
              <button
                key={style.id}
                onClick={() => {
                  reset()
                  navigate('/agents/carousel')
                }}
                className="flex-1 bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl p-3 hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div
                  className="w-8 h-8 rounded-full mx-auto mb-2 shadow-sm"
                  style={{ backgroundColor: style.previewColor }}
                />
                <p className="text-xs font-medium text-gray-900 truncate">{style.name}</p>
                <p className="text-[10px] text-gray-500">{style.emoji}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTAs */}
      <div className="space-y-3">
        <button
          onClick={handleNewCarousel}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:shadow-xl transition-all active:scale-[0.98]"
        >
          <Sparkles className="w-5 h-5" />
          Создать ещё карусель
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98]"
        >
          На главную
        </button>
      </div>
    </div>
  )
}
