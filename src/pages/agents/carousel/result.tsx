import { useNavigate } from 'react-router-dom'
import { Download, Sparkles } from 'lucide-react'
import { SlidePreview } from '@/components/carousel/SlidePreview'
import { useCarouselStore } from '@/store/carouselStore'

export default function CarouselResult() {
  const navigate = useNavigate()
  const { generatedSlides, reset } = useCarouselStore()

  const handleDownloadAll = async () => {
    if (generatedSlides.length === 0) {
      alert('Нет слайдов для скачивания')
      return
    }

    try {
      // Скачиваем каждое изображение по отдельности
      for (let i = 0; i < generatedSlides.length; i++) {
        const url = generatedSlides[i]
        const response = await fetch(url)
        const blob = await response.blob()
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `slide-${i + 1}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Небольшая задержка между скачиваниями
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error('Error downloading:', error)
      alert('Ошибка при скачивании')
    }
  }

  const handleNewCarousel = () => {
    reset()
    navigate('/agents/carousel')
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="p-4 space-y-6">
        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Карусель готова! 🎉</h1>
          <p className="text-zinc-400">Слайдов: {generatedSlides.length}</p>
        </div>

        {/* Превью */}
        <SlidePreview slides={generatedSlides} />

        {/* Кнопки */}
        <div className="space-y-3">
          <button
            onClick={handleDownloadAll}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Скачать все (ZIP)
          </button>
          
          <button
            onClick={handleNewCarousel}
            className="w-full py-4 bg-white/10 border border-zinc-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Новая карусель
          </button>
        </div>
      </div>
    </div>
  )
}

