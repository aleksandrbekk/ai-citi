import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'

export default function CarouselResult() {
  const navigate = useNavigate()
  const { reset } = useCarouselStore()

  const handleNewCarousel = () => {
    reset()
    navigate('/agents/carousel')
  }

  return (
    <div className="min-h-screen bg-black p-4 flex flex-col">
      <h1 className="text-xl font-bold text-white mb-6">✅ Запрос отправлен!</h1>
      
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-6">🎨</div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          Карусель генерируется
        </h2>
        
        <p className="text-gray-400 mb-2">
          Слайды придут в Telegram в течение 2-3 минут
        </p>
        
        <p className="text-gray-500 text-sm mb-8">
          Каждый слайд отправляется отдельным сообщением
        </p>
        
        <div className="bg-white/10 backdrop-blur rounded-xl p-4 mb-8">
          <p className="text-gray-300 text-sm">
            💡 Совет: откройте Telegram и дождитесь всех слайдов перед публикацией
          </p>
        </div>
      </div>

      <button
        onClick={handleNewCarousel}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold"
      >
        🎨 Создать новую карусель
      </button>
    </div>
  )
}

