import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'

export default function CarouselGenerating() {
  const navigate = useNavigate()
  const { setStatus } = useCarouselStore()

  useEffect(() => {
    // Переход на экран результата через 3 секунды после отправки запроса
    const timer = setTimeout(() => {
      setStatus('completed')
      navigate('/agents/carousel/result')
    }, 3000)

    return () => clearTimeout(timer)
  }, [navigate, setStatus])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Создаём карусель...</h1>
          <p className="text-gray-500">1-2 минуты — и готово!</p>
        </div>

        {/* Анимация загрузки */}
        <div className="flex justify-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Уведомление о Telegram чате */}
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-2 border-cyan-200 rounded-2xl p-5 text-center space-y-3">
          <div className="w-14 h-14 mx-auto bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.89.03-.24.38-.49 1.05-.74 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .37.03.54.18.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">Результат придёт в чат бота!</p>
            <p className="text-sm text-gray-600 mt-1">Откройте Telegram — карусель уже летит к вам ✈️</p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-cyan-600 font-medium">
            <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span>AI генерирует 9 слайдов...</span>
          </div>
        </div>
      </div>
    </div>
  )
}

