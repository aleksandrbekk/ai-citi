import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { Check, Clock, Square } from 'lucide-react'

export default function CarouselGenerating() {
  const navigate = useNavigate()
  const { selectedTemplate, setGeneratedSlides, setStatus } = useCarouselStore()
  const [currentSlide, setCurrentSlide] = useState(1)
  const [totalSlides] = useState(
    selectedTemplate === 'mistakes' ? 8 :
    selectedTemplate === 'myths' ? 7 :
    selectedTemplate === 'checklist' ? 6 :
    selectedTemplate === 'before-after' ? 7 :
    selectedTemplate === 'steps' ? 8 : 6
  )

  useEffect(() => {
    // Симуляция прогресса генерации
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        if (prev >= totalSlides) {
          clearInterval(interval)
          // В реальности здесь будет проверка статуса через API или WebSocket
          // Пока что через 90 секунд переходим на результат
          setTimeout(() => {
            // Для демо - создаем заглушки URL
            const mockSlides = Array.from({ length: totalSlides }, (_, i) => 
              `https://via.placeholder.com/1080x1920/FF5A1F/FFFFFF?text=Slide+${i + 1}`
            )
            setGeneratedSlides(mockSlides)
            setStatus('completed')
            navigate('/agents/carousel/result')
          }, 90000)
          return prev
        }
        return prev + 1
      })
    }, 10000) // Каждые 10 секунд новый слайд

    return () => clearInterval(interval)
  }, [totalSlides, navigate, setGeneratedSlides, setStatus])

  const getSlideStatus = (index: number) => {
    if (index < currentSlide) return 'completed'
    if (index === currentSlide) return 'generating'
    return 'pending'
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Создаю карусель</h1>
          <p className="text-zinc-400">Слайд {currentSlide} из {totalSlides}</p>
        </div>

        {/* Прогресс слайдов */}
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: totalSlides }, (_, i) => {
            const status = getSlideStatus(i + 1)
            return (
              <div
                key={i}
                className={`
                  aspect-[9/16] rounded-xl flex items-center justify-center
                  ${status === 'completed' ? 'bg-green-500/20 border-2 border-green-500' :
                    status === 'generating' ? 'bg-orange-500/20 border-2 border-orange-500 animate-pulse' :
                    'bg-zinc-800 border-2 border-zinc-700'
                  }
                `}
              >
                {status === 'completed' ? (
                  <Check className="w-6 h-6 text-green-400" />
                ) : status === 'generating' ? (
                  <Clock className="w-6 h-6 text-orange-400" />
                ) : (
                  <Square className="w-6 h-6 text-zinc-600" />
                )}
              </div>
            )
          })}
        </div>

        {/* Время */}
        <div className="text-center text-zinc-400 text-sm">
          Примерное время: ~90 секунд
        </div>

        {/* Анимация загрузки */}
        <div className="flex justify-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </div>
  )
}

