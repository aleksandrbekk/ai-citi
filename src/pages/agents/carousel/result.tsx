import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { STYLES_INDEX, type StyleId } from '@/lib/carouselStyles'
import { Sparkles, Send, Clock } from 'lucide-react'

// Превью стилей (те же что на главной)
const STYLE_PREVIEWS: Record<StyleId, string> = {
  APPLE_GLASSMORPHISM: '/styles/apple.jpg',
  AESTHETIC_BEIGE: '/styles/beige.jpg',
  SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
  MINIMALIST_LINE_ART: '/styles/minimal.jpg',
  GRADIENT_MESH_3D: '/styles/gradient.jpg',
}

export default function CarouselResult() {
  const navigate = useNavigate()
  const { reset, style, setStyle } = useCarouselStore()

  const handleNewCarousel = () => {
    reset()
    navigate('/agents/carousel')
  }

  const handleTryStyle = (styleId: StyleId) => {
    setStyle(styleId)
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

        {/* Try other styles section */}
        <div className="w-full mb-6">
          <p className="text-sm text-gray-500 mb-3">Пока ждёте, попробуйте другие стили:</p>
          <div className="flex gap-3">
            {otherStyles.map((s) => (
              <button
                key={s.id}
                onClick={() => handleTryStyle(s.id)}
                className="flex-1 group relative overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all active:scale-[0.98]"
              >
                {/* Preview image */}
                <div className="aspect-[4/5] overflow-hidden">
                  <img
                    src={STYLE_PREVIEWS[s.id]}
                    alt={s.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>
                {/* Style name */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-xs font-semibold text-white truncate">{s.name}</p>
                </div>
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
