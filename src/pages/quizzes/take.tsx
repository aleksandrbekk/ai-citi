import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Star, Plus, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useQuiz, useQuizResponse } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

interface ImageRow {
  id: string
  images: string[]
  ratings: Record<number, number> // индекс картинки -> рейтинг (1-5)
}

export default function TakeQuiz() {
  const { id } = useParams<{ id: string }>()
  const { quiz, isLoading } = useQuiz(id || null)
  const { response, startResponse, completeResponse, sessionId } = useQuizResponse(id || null)
  
  const [rows, setRows] = useState<ImageRow[]>([
    { id: 'row-1', images: [], ratings: {} }
  ])
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (id && !response) {
      // Записываем событие "view"
      supabase.from('quiz_analytics').insert({
        quiz_id: id,
        event_type: 'view',
        session_id: sessionId
      })
      
      startResponse()
    }
  }, [id, response, startResponse, sessionId])

  useEffect(() => {
    if (response?.completed_at) {
      setIsSubmitted(true)
    }
  }, [response])

  const handleImageUpload = (rowId: string, file: File) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setRows(prevRows => 
        prevRows.map(row => 
          row.id === rowId 
            ? { ...row, images: [...row.images, base64String] }
            : row
        )
      )
    }
    reader.readAsDataURL(file)
  }

  const handleRatingChange = (rowId: string, imageIndex: number, rating: number) => {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId
          ? { ...row, ratings: { ...row.ratings, [imageIndex]: rating } }
          : row
      )
    )
  }

  const handleAddRow = () => {
    const newRowId = `row-${rows.length + 1}`
    setRows([...rows, { id: newRowId, images: [], ratings: {} }])
  }

  const handleRemoveImage = (rowId: string, imageIndex: number) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          const newImages = row.images.filter((_, idx) => idx !== imageIndex)
          const newRatings: Record<number, number> = {}
          Object.entries(row.ratings).forEach(([idx, rating]) => {
            const numIdx = parseInt(idx)
            if (numIdx < imageIndex) {
              newRatings[numIdx] = rating
            } else if (numIdx > imageIndex) {
              newRatings[numIdx - 1] = rating
            }
          })
          return { ...row, images: newImages, ratings: newRatings }
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
      alert('Пожалуйста, загрузите картинки и поставьте оценки')
      return
    }

    // Формируем ответы с рейтингами для каждой картинки
    const formattedAnswers = rows.flatMap((row, rowIndex) =>
      row.images.map((image, imageIndex) => ({
        question_id: `${row.id}-${imageIndex}`,
        option_ids: [],
        rating_value: row.ratings[imageIndex] || null,
        image_url: image,
        row_index: rowIndex,
        image_index: imageIndex,
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

  if (isLoading) {
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
        <div className="space-y-12">
          {rows.map((row, rowIndex) => (
            <ImageRowComponent
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              onImageUpload={(file) => handleImageUpload(row.id, file)}
              onRatingChange={(imageIndex, rating) => handleRatingChange(row.id, imageIndex, rating)}
              onRemoveImage={(imageIndex) => handleRemoveImage(row.id, imageIndex)}
            />
          ))}
        </div>

        {/* Add Row Button */}
        <div className="flex justify-center mt-8">
          <button
            onClick={handleAddRow}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20"
          >
            <Plus className="w-5 h-5" />
            <span>Добавить ряд картинок</span>
          </button>
        </div>

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
  onImageUpload,
  onRatingChange,
  onRemoveImage
}: {
  row: ImageRow
  rowIndex: number
  onImageUpload: (file: File) => void
  onRatingChange: (imageIndex: number, rating: number) => void
  onRemoveImage: (imageIndex: number) => void
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
          {/* Add Image Button */}
          {row.images.length < 10 && (
            <label className="flex-shrink-0 w-64 h-64 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-orange-500/50 transition-colors flex flex-col items-center justify-center bg-white/5">
              <Plus className="w-12 h-12 text-zinc-400 mb-2" />
              <span className="text-sm text-zinc-400">Добавить картинку</span>
              <span className="text-xs text-zinc-500 mt-1">
                {row.images.length} / 10
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onImageUpload(file)
                }}
              />
            </label>
          )}

          {/* Images */}
          {row.images.map((image, imageIndex) => (
            <div
              key={imageIndex}
              className="flex-shrink-0 w-64 space-y-3"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="relative group">
                <img
                  src={image}
                  alt={`Image ${imageIndex + 1}`}
                  className="w-64 h-64 object-cover rounded-xl shadow-lg"
                />
                <button
                  onClick={() => onRemoveImage(imageIndex)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>

              {/* Rating */}
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => onRatingChange(imageIndex, value)}
                    className={`transition-all transform hover:scale-110 ${
                      row.ratings[imageIndex] && row.ratings[imageIndex] >= value
                        ? 'text-orange-500 scale-110'
                        : 'text-zinc-600 hover:text-orange-400'
                    }`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        row.ratings[imageIndex] && row.ratings[imageIndex] >= value
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                  </button>
                ))}
              </div>
              {row.ratings[imageIndex] && (
                <p className="text-center text-sm text-zinc-400">
                  Оценка: {row.ratings[imageIndex]} / 5
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
