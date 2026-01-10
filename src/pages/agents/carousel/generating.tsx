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
          <h1 className="text-2xl font-bold mb-2">Отправляю запрос...</h1>
          <p className="text-gray-500">Подождите несколько секунд</p>
        </div>

        {/* Анимация загрузки */}
        <div className="flex justify-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

