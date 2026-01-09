import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Star, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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
  name: string
  images: QuizImage[]
  rating: number | null // одна оценка для всего ряда (1-5)
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
    
    // Загружаем ряды с названиями (может быть пусто для старых квизов)
    const { data: rowsData, error: rowsError } = await supabase
      .from('quiz_image_rows')
      .select('*')
      .eq('quiz_id', id)
      .order('row_index', { ascending: true })
    
    // Игнорируем ошибку, если таблица не существует или пуста
    if (rowsError) {
      console.warn('Error loading rows (may not exist for old quizzes):', rowsError)
    }

    // Создаем мапу рядов
    const rowsMap = new Map<number, ImageRow>()
    
    // Сначала создаем ряды из БД (если есть)
    if (rowsData && rowsData.length > 0) {
      rowsData.forEach((row: any) => {
        rowsMap.set(row.row_index, {
          id: `row-${row.row_index}`,
          name: row.name || `Ряд ${row.row_index + 1}`,
          images: [],
          rating: null
        })
      })
    }

    // Загружаем картинки с таймаутом (base64 строки могут быть большими)
    console.log('Loading images for quiz:', id)
    
    let imagesData: QuizImage[] | null = null
    
    try {
      const result = await Promise.race([
        supabase
          .from('quiz_images')
          .select('id, quiz_id, row_index, image_index, image_url, order_index')
          .eq('quiz_id', id)
          .order('row_index', { ascending: true })
          .order('image_index', { ascending: true }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: запрос занял слишком много времени')), 30000)
        )
      ]) as any

      if (result.error) {
        console.error('Error loading images:', result.error)
        alert('Ошибка загрузки картинок: ' + result.error.message)
        setIsLoadingImages(false)
        return
      }

      imagesData = result.data
      console.log('Loaded images:', imagesData?.length || 0)
    } catch (error: any) {
      console.error('Error loading images (timeout or error):', error)
      alert('Ошибка загрузки картинок. Попробуйте обновить страницу.')
      setIsLoadingImages(false)
      return
    }

    // Добавляем картинки в ряды (создаем ряды, если их нет в quiz_image_rows)
    if (imagesData && imagesData.length > 0) {
      imagesData.forEach((img: QuizImage) => {
        const rowIndex = img.row_index || 0
        if (!rowsMap.has(rowIndex)) {
          rowsMap.set(rowIndex, {
            id: `row-${rowIndex}`,
            name: `Ряд ${rowIndex + 1}`,
            images: [],
            rating: null
          })
        }
        rowsMap.get(rowIndex)!.images.push(img)
      })
    }

    // Если нет ни рядов, ни картинок - пустой массив
    const finalRows = Array.from(rowsMap.values())
    const totalImages = finalRows.reduce((sum, r) => sum + r.images.length, 0)
    console.log('Loaded rows:', finalRows.length, 'rows with', totalImages, 'images')
    
    if (finalRows.length === 0) {
      console.warn('No rows or images found for quiz:', id)
    } else if (totalImages === 0) {
      console.warn('Rows found but no images in them')
    }
    
    setRows(finalRows)
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

  const handleRatingChange = (rowId: string, rating: number) => {
    setRows(prevRows =>
      prevRows.map(row => 
        row.id === rowId ? { ...row, rating } : row
      )
    )
  }

  const handleSubmit = async () => {
    if (!id || !response) return

    // Проверяем, что все ряды с картинками имеют рейтинг
    const rowsWithImages = rows.filter(row => row.images.length > 0)
    const hasAllRatings = rowsWithImages.every(row => row.rating !== null)

    if (!hasAllRatings) {
      alert('Пожалуйста, поставьте оценку для всех каруселей')
      return
    }

    // Формируем ответы - один рейтинг на ряд (карусель)
    const formattedAnswers = rowsWithImages.map((row, rowIndex) => ({
      question_id: `row-${rowIndex}`,
      option_ids: [],
      rating_value: row.rating,
      row_index: rowIndex,
      images_count: row.images.length,
      is_correct: true
    }))

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
          total_images: rows.reduce((sum, row) => sum + row.images.length, 0),
          ratings: rows.map(row => ({ row_id: row.id, rating: row.rating }))
        }
      })
    }
  }

  if (isLoading || isLoadingImages) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Загрузка квиза...</p>
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
    const totalRows = rows.filter(row => row.images.length > 0).length
    const ratedRows = rows.filter(row => row.images.length > 0 && row.rating !== null).length
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Спасибо за оценку!</h2>
          <p className="text-zinc-400 text-lg mb-2">Оценено каруселей: <span className="text-orange-500 font-bold">{ratedRows}</span> из {totalRows}</p>
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
        {rows.length === 0 || rows.every(row => row.images.length === 0) ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">В этом квизе пока нет картинок для оценки</p>
            <p className="text-zinc-500 text-sm mt-2">Загрузите картинки в конструкторе квиза</p>
          </div>
        ) : (
          <div className="space-y-12">
            {rows.map((row, rowIndex) => (
              <ImageRowComponent
                key={row.id}
                row={row}
                rowIndex={rowIndex}
                onRatingChange={(rating) => handleRatingChange(row.id, rating)}
              />
            ))}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-center mt-12">
          <button
            onClick={handleSubmit}
            disabled={rows.filter(row => row.images.length > 0).some(row => row.rating === null)}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
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
  onRatingChange: (rating: number) => void
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
        {row.name}
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
              className="flex-shrink-0 w-64"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="relative">
                <img
                  src={image.image_url}
                  alt={`Image ${image.image_index + 1}`}
                  className="w-64 h-64 object-cover rounded-xl shadow-lg"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Рейтинг для всего ряда - под картинками */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="text-center mb-4">
          <p className="text-sm text-zinc-400 mb-2">Оцените эту карусель</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => onRatingChange(value)}
              className={`transition-all transform hover:scale-110 ${
                row.rating && row.rating >= value
                  ? 'text-orange-500 scale-110'
                  : 'text-zinc-600 hover:text-orange-400'
              }`}
            >
              <Star
                className={`w-8 h-8 ${
                  row.rating && row.rating >= value
                    ? 'fill-current'
                    : ''
                }`}
              />
            </button>
          ))}
        </div>
        {row.rating && (
          <p className="text-center text-sm text-zinc-400 mt-3">
            Оценка: {row.rating} / 5
          </p>
        )}
      </div>
    </div>
  )
}
