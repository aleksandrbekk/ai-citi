import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface SlidePreviewProps {
  slides: string[]
}

export function SlidePreview({ slides }: SlidePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length)
  }

  if (slides.length === 0) {
    return (
      <div className="text-center text-zinc-400 py-12">
        Нет слайдов для отображения
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Превью слайда */}
      <div className="relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden">
        <img
          src={slides[currentIndex]}
          alt={`Slide ${currentIndex + 1}`}
          className="w-full h-full object-cover"
        />
        
        {/* Навигация */}
        <button
          onClick={prevSlide}
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        
        <button
          onClick={nextSlide}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70"
        >
          <ChevronRight className="w-5 h-5 text-white" />
        </button>
      </div>
      
      {/* Индикатор слайдов */}
      <div className="flex items-center justify-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`
              w-2 h-2 rounded-full transition-all
              ${index === currentIndex 
                ? 'bg-orange-500 w-6' 
                : 'bg-zinc-700 hover:bg-zinc-600'
              }
            `}
          />
        ))}
      </div>
      
      {/* Счетчик */}
      <div className="text-center text-sm text-zinc-400">
        Слайд {currentIndex + 1} из {slides.length}
      </div>
    </div>
  )
}

