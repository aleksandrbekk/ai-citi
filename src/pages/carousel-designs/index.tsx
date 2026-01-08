import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type DesignName = 'NEON_DARK' | 'SOFT_GRADIENT' | 'AESTHETIC_BEIGE' | 'APPLE_WHITE' | 'STYLE_1' | 'STYLE_2' | 'STYLE_3'

interface Design {
  id: DesignName
  name: string
  folder: string
  slides: string[]
}

const designs: Design[] = [
  {
    id: 'NEON_DARK',
    name: 'Неоновый темный',
    folder: 'NEON_DARK',
    slides: [] // Заполняется в getSlidePaths
  },
  {
    id: 'SOFT_GRADIENT',
    name: 'Мягкий градиент',
    folder: 'SOFT_GRADIENT',
    slides: []
  },
  {
    id: 'AESTHETIC_BEIGE',
    name: 'Эстетичный бежевый',
    folder: 'AESTHETIC_BEIGE',
    slides: []
  },
  {
    id: 'APPLE_WHITE',
    name: 'Яблочный белый',
    folder: 'APPLE_WHITE',
    slides: []
  },
  {
    id: 'STYLE_1',
    name: 'Стиль 1',
    folder: 'Стиль 1',
    slides: []
  },
  {
    id: 'STYLE_2',
    name: 'Стиль 2',
    folder: 'STYLE_2',
    slides: []
  },
  {
    id: 'STYLE_3',
    name: 'Стиль 3',
    folder: 'STYLE_3',
    slides: []
  }
]

// Функция для получения реальных путей к слайдам
function getSlidePaths(design: Design): string[] {
  const slideNames = [
    '01_cover.png',
    '02_stats.png',
    '03_signs.png',
    '04_comparison.png',
    '05_survivors.png',
    '06_steps.png',
    '07_cta.png',
    '08_extra.png' // для дизайнов с 8 слайдами
  ]
  
  // Определяем базовый путь в зависимости от папки
  // Для Vite нужно использовать импорты или разместить в public
  let basePath = ''
  if (design.folder === 'NEON_DARK' || design.folder === 'SOFT_GRADIENT') {
    basePath = `/carousel_slides/${design.folder}`
  } else if (design.folder === 'Стиль 1') {
    basePath = '/carousel_slides/Стиль 1'
  } else {
    basePath = `/${design.folder}`
  }
  
  // Для дизайнов с 8 слайдами используем 8, иначе 7
  const slideCount = design.id === 'STYLE_2' || design.id === 'STYLE_3' ? 8 : 7
  
  return slideNames.slice(0, slideCount).map(name => `${basePath}/${name}`)
}

export default function CarouselDesignsPage() {
  const [selectedDesign, setSelectedDesign] = useState<DesignName | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const handleDesignSelect = (designId: DesignName) => {
    setSelectedDesign(designId)
    setCurrentSlideIndex(0)
  }

  const currentDesign = selectedDesign ? designs.find(d => d.id === selectedDesign) : null
  const slidePaths = currentDesign ? getSlidePaths(currentDesign) : []

  const nextSlide = () => {
    if (currentDesign && currentSlideIndex < slidePaths.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent mb-8 text-center">
          Дизайны каруселей
        </h1>

        {!selectedDesign ? (
          // Список всех дизайнов
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {designs.map((design) => {
              const previewPaths = getSlidePaths(design)
              return (
                <div
                  key={design.id}
                  onClick={() => handleDesignSelect(design.id)}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 cursor-pointer hover:border-orange-500/50 transition-all hover:scale-105 shadow-lg hover:shadow-orange-500/20"
                >
                  <h3 className="text-xl font-semibold mb-4 text-center">{design.name}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {previewPaths.slice(0, 4).map((path, idx) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                        <img
                          src={path}
                          alt={`${design.name} slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback если изображение не найдено
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-400 text-center mt-4">
                    {design.slides.length} слайдов
                  </p>
                </div>
              )
            })}
          </div>
        ) : (
          // Просмотр выбранного дизайна
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedDesign(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              >
                ← Назад к списку
              </button>
              <h2 className="text-2xl font-semibold">{currentDesign?.name}</h2>
              <div className="w-24"></div> {/* Spacer */}
            </div>

            {/* Все слайды в сетке */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {slidePaths.map((path, idx) => (
                <div
                  key={idx}
                  className={`bg-white/5 backdrop-blur-xl border rounded-xl overflow-hidden transition-all cursor-pointer ${
                    currentSlideIndex === idx
                      ? 'border-orange-500/50 shadow-lg shadow-orange-500/20 scale-105'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onClick={() => setCurrentSlideIndex(idx)}
                >
                  <div className="aspect-[9/16] relative">
                    <img
                      src={path}
                      alt={`Slide ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-zinc-400">Изображение не найдено</div>'
                        }
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">
                      {idx + 1}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Полноэкранный просмотр текущего слайда */}
            <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" style={{ display: currentSlideIndex >= 0 ? 'flex' : 'none' }}>
              <div className="relative max-w-4xl w-full">
                <button
                  onClick={() => setCurrentSlideIndex(-1)}
                  className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  ✕
                </button>
                
                {currentSlideIndex >= 0 && (
                  <>
                    <img
                      src={slidePaths[currentSlideIndex]}
                      alt={`Slide ${currentSlideIndex + 1}`}
                      className="w-full h-auto rounded-xl shadow-2xl"
                    />
                    
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 px-6 py-3 rounded-full">
                      <button
                        onClick={prevSlide}
                        disabled={currentSlideIndex === 0}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-sm">
                        {currentSlideIndex + 1} / {slidePaths.length}
                      </span>
                      <button
                        onClick={nextSlide}
                        disabled={currentSlideIndex === slidePaths.length - 1}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
