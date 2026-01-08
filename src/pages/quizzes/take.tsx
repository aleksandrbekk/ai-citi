import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Plus, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuiz, useQuizResponse } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

interface QuizImage {
  id: string
  image_url: string
  row_index: number
  image_index: number
}

interface ImageRow {
  id: string
  images: QuizImage[]
  ratings: Record<string, number> // image_id -> рейтинг (1-5)
}

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>()
  const { quiz, isLoading } = useQuiz(id || null)
  const { response, startResponse, completeResponse, sessionId } = useQuizResponse(id || null)
  
  const [rows, setRows] = useState<ImageRow[]>([])
  const [isLoadingImages, setIsLoadingImages] = useState(true)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Загружаем картинки из базы данных
  useEffect(() => {
    if (id) {
      loadImages()
    }
  }, [id])

  const loadImages = async () => {
    if (!id) return

    setIsLoadingImages(true)
    const { data, error } = await supabase
      .from('quiz_images')
      .select('*')
      .eq('quiz_id', id)
      .order('row_index', { ascending: true })
      .order('image_index', { ascending: true })

    if (error) {
      console.error('Error loading images:', error)
      setIsLoadingImages(false)
      return
    }

    // Группируем картинки по рядам
    const rowsMap = new Map<number, ImageRow>()
    
    if (data && data.length > 0) {
      data.forEach((img: QuizImage) => {
        const rowIndex = img.row_index || 0
        if (!rowsMap.has(rowIndex)) {
          rowsMap.set(rowIndex, { id: `row-${rowIndex}`, images: [], ratings: {} })
        }
        rowsMap.get(rowIndex)!.images.push(img)
      })
    }

    setRows(Array.from(rowsMap.values()))
    setIsLoadingImages(false)
  }

  useEffect(() => {
    if (id && !response && !isLoadingImages) {
      // Записываем событие "view"
      supabase.from('quiz_analytics').insert({
        quiz_id: id,
        event_type: 'view',
        session_id: sessionId
      })
      
      startResponse()
    }
  }, [id, response, startResponse, sessionId, isLoadingImages])

  useEffect(() => {
    if (response?.completed_at) {
      setIsSubmitted(true)
    }
  }, [response])

  const handleRatingChange = (imageId: string, rating: number) => {
    setRows(prevRows =>
      prevRows.map(row => {
        const hasImage = row.images.some(img => img.id === imageId)
        if (hasImage) {
          return { ...row, ratings: { ...row.ratings, [imageId]: rating } }
        }
        return row
      })
    )
  }

  const handleSubmit = async () => {
    if (!id || !response) return

    // Проверяем, что есть хотя бы одна картинка с рейтингом
    const hasRatings = rows.some(row => 
      row.images.length > 0 && Object.keys(row.ratings).length > 0
    )

    if (!hasRatings) {
      alert('Пожалуйста, поставьте оценки хотя бы одной картинке')
      return
    }

    // Формируем ответы с рейтингами для каждой картинки
    const formattedAnswers = rows.flatMap((row, rowIndex) =>
      row.images.map((image) => ({
        question_id: `image-${image.id}`,
        option_ids: [],
        rating_value: row.ratings[image.id] || null,
        image_id: image.id,
        row_index: rowIndex,
        image_index: image.image_index,
        is_correct: true
      }))
    )

    // Записываем событие "start" если еще не записано
    await supabase.from('quiz_analytics').insert({
      quiz_id: id,
      event_type: 'start',
      session_id: sessionId,
      metadata: { rows_count: rows.length, total_images: formattedAnswers.length }
    })

    // Сохраняем ответы
    const completed = await completeResponse(formattedAnswers as any)
    
    if (completed) {
      setIsSubmitted(true)
      
      // Записываем событие "complete" с метаданными
      await supabase.from('quiz_analytics').insert({
        quiz_id: id,
        event_type: 'complete',
        session_id: sessionId,
        metadata: { 
          rows_count: rows.length, 
          total_images: formattedAnswers.length,
          ratings: rows.map(row => row.ratings)
        }
      })
    }
  }

  if (isLoading || isLoadingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4">Квиз не найден</p>
        </div>
      </div>
    )
  }

  if (isSubmitted) {
    const totalImages = rows.reduce((sum, row) => sum + row.images.length, 0)
    const totalRatings = rows.reduce((sum, row) => sum + Object.keys(row.ratings).length, 0)
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Спасибо за оценку!</h2>
          <p className="text-zinc-400 text-lg mb-2">Оценено картинок: <span className="text-orange-500 font-bold">{totalRatings}</span> из {totalImages}</p>
          <p className="text-zinc-500 text-sm">Ваши оценки сохранены</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          {quiz.cover_image_url && (
            <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl max-w-2xl mx-auto">
              <img
                src={quiz.cover_image_url}
                alt={quiz.title}
                className="w-full h-48 md:h-64 object-cover"
              />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-lg text-zinc-400">{quiz.description}</p>
          )}
        </div>

        {/* Image Rows */}
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">В этом квизе пока нет картинок для оценки</p>
          </div>
        ) : (
          <div className="space-y-12">
            {rows.map((row, rowIndex) => (
              <ImageRowComponent
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                onRatingChange={(imageId, rating) => handleRatingChange(imageId, rating)}
              />
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center mt-12">
          <button
            onClick={handleSubmit}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 text-lg font-semibold"
          >
            Отправить оценки
          </button>
        </div>
      </div>
    </div>
  )
}

function ImageRowComponent({
  row,
  rowIndex,
  onRatingChange
}: {
  row: ImageRow
  rowIndex: number
  onRatingChange: (imageId: string, rating: number) => void
}) {
  const [scrollPosition, setScrollPosition] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      setScrollPosition(container.scrollLeft)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  const handleScroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const scrollAmount = 300
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(container.scrollWidth - container.clientWidth, scrollPosition + scrollAmount)
    
    container.scrollTo({ left: newPosition, behavior: 'smooth' })
  }

  const canScrollLeft = scrollPosition > 0
  const canScrollRight = scrollContainerRef.current ? 
    scrollPosition < (scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 10) : false

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
      <h3 className="text-xl font-semibold mb-4 text-center">
        Ряд {rowIndex + 1}
      </h3>

      {/* Scrollable Images Container */}
      <div className="relative">
        {/* Scroll Buttons (desktop) */}
        {row.images.length > 0 && (
          <>
            {canScrollLeft && (
              <button
                onClick={() => handleScroll('left')}
                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {canScrollRight && (
              <button
                onClick={() => handleScroll('right')}
                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}

        {/* Images Grid/Scroll */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {/* Images */}
          {row.images.map((image) => (
            <div
              key={image.id}
              className="flex-shrink-0 w-64 space-y-3"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="relative">
                <img
                  src={image.image_url}
                  alt={`Image ${image.image_index + 1}`}
                  className="w-64 h-64 object-cover rounded-xl shadow-lg"
                />
              </div>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => onRatingChange(image.id, value)}
                    className={`transition-all transform hover:scale-110 ${
                      row.ratings[image.id] && row.ratings[image.id] >= value
                        ? 'text-orange-500 scale-110'
                        : 'text-zinc-600 hover:text-orange-400'
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        row.ratings[image.id] && row.ratings[image.id] >= value
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {row.ratings[image.id] && (
                <p className="text-center text-sm text-zinc-400">
                  Оценка: {row.ratings[image.id]} / 5
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
