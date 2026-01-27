import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { toast } from 'sonner'

interface ImageRow {
  id: string
  rowId?: string // ID из БД (quiz_image_rows)
  name: string
  images: Array<{ id: string; url: string; order_index: number }>
}

interface ImageRowsEditorProps {
  quizId: string | undefined
}

export function ImageRowsEditor({ quizId }: ImageRowsEditorProps) {
  const [rows, setRows] = useState<ImageRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (quizId) {
      console.log('ImageRowsEditor: quizId changed to', quizId)
      loadImages()
    } else {
      setIsLoading(false)
      // Если квиз еще не создан, показываем один пустой ряд
      setRows([{ id: 'row-0', name: 'Ряд 1', images: [] }])
    }
  }, [quizId])

  const loadImages = async () => {
    if (!quizId) return

    setIsLoading(true)
    
    console.log('Loading images for quiz:', quizId)
    
    // Загружаем ряды
    const { data: rowsData, error: rowsError } = await supabase
      .from('quiz_image_rows')
      .select('*')
      .eq('quiz_id', quizId)
      .order('row_index', { ascending: true })

    if (rowsError) {
      console.warn('Error loading rows (may not exist):', rowsError)
    }

    // Загружаем картинки порциями (из-за больших base64 строк)
    console.log('Loading images in batches...')
    let imagesData: any[] = []
    let offset = 0
    const batchSize = 20
    let hasMore = true

    while (hasMore) {
      const { data: batch, error: batchError } = await supabase
        .from('quiz_images')
        .select('id, quiz_id, row_index, image_index, image_url, order_index')
        .eq('quiz_id', quizId)
        .order('row_index', { ascending: true })
        .order('image_index', { ascending: true })
        .range(offset, offset + batchSize - 1)

      if (batchError) {
        console.error('Error loading images batch:', batchError)
        toast.error('Ошибка загрузки картинок: ' + batchError.message)
        setIsLoading(false)
        return
      }

      if (batch && batch.length > 0) {
        imagesData = [...imagesData, ...batch]
        offset += batchSize
        hasMore = batch.length === batchSize
        console.log(`Loaded batch: ${batch.length} images, total: ${imagesData.length}`)
      } else {
        hasMore = false
      }
    }

    console.log('Loaded images from DB:', imagesData.length)

    // Если у старого квиза нет записей в quiz_image_rows, создаём их автоматически
    // (иначе нельзя переименовать ряд и на публичной странице не будет кастомных названий).
    let ensuredRowsData: any[] = rowsData || []
    if ((!rowsData || rowsData.length === 0) && imagesData.length > 0) {
      const uniqueRowIndexes = Array.from(
        new Set(imagesData.map((img: any) => (img.row_index ?? 0) as number))
      ).sort((a, b) => a - b)

      try {
        const { data: upserted, error: upsertError } = await supabase
          .from('quiz_image_rows')
          .upsert(
            uniqueRowIndexes.map((rowIndex) => ({
              quiz_id: quizId,
              row_index: rowIndex,
              name: `Ряд ${rowIndex + 1}`
            })),
            { onConflict: 'quiz_id,row_index' }
          )
          .select('id, row_index, name')

        if (upsertError) {
          console.warn('Could not auto-create quiz_image_rows:', upsertError)
        } else if (upserted && upserted.length > 0) {
          ensuredRowsData = upserted
          console.log('Auto-created quiz_image_rows:', upserted.length)
        }
      } catch (e: any) {
        console.warn('Error auto-creating quiz_image_rows:', e?.message || e)
      }
    }

    // Создаем мапу рядов
    const rowsMap = new Map<number, ImageRow>()
    
    // Сначала создаем ряды из БД
    if (ensuredRowsData && ensuredRowsData.length > 0) {
      ensuredRowsData.forEach((row: any) => {
        rowsMap.set(row.row_index, {
          id: `row-${row.row_index}`,
          rowId: row.id,
          name: row.name || `Ряд ${row.row_index + 1}`,
          images: []
        })
      })
    }

    // Добавляем картинки в ряды
    if (imagesData && imagesData.length > 0) {
      imagesData.forEach((img: any) => {
        const rowIndex = img.row_index || 0
        if (!rowsMap.has(rowIndex)) {
          rowsMap.set(rowIndex, {
            id: `row-${rowIndex}`,
            name: `Ряд ${rowIndex + 1}`,
            images: []
          })
        }
        rowsMap.get(rowIndex)!.images.push({
          id: img.id,
          url: img.image_url,
          order_index: img.image_index
        })
      })
    }

    // Если нет рядов и нет картинок, создаем один пустой ряд
    const finalRows = Array.from(rowsMap.values())
    const totalImages = finalRows.reduce((sum, r) => sum + r.images.length, 0)
    console.log('Loaded rows:', finalRows.length, 'rows with', totalImages, 'images')
    
    if (rowsMap.size === 0 && totalImages === 0) {
      console.log('No rows or images found, creating empty row')
      setRows([{ id: 'row-0', name: 'Ряд 1', images: [] }])
    } else if (rowsMap.size === 0 && totalImages > 0) {
      // Если есть картинки, но нет рядов - это ошибка, но все равно показываем картинки
      console.warn('Images found but no rows in quiz_image_rows, using images to create rows')
      setRows(finalRows)
    } else {
      console.log('Setting rows:', finalRows.map(r => ({ name: r.name, images: r.images.length })))
      setRows(finalRows)
    }
    
    setIsLoading(false)
  }

  const handleImageUpload = async (rowIndex: number, file: File) => {
    if (!quizId) {
      toast.error('Сначала сохраните квиз!')
      return
    }

    // Определяем индекс картинки в ряду
    const currentRow = rows[rowIndex]
    const imageIndex = currentRow?.images?.length || 0

    // Грузим файл в Storage (в БД сохраняем только URL — иначе публичная страница грузится ~30с)
    const fileExt = file.name.split('.').pop() || 'jpg'
    const storagePath = `quiz-images/${quizId}/row-${rowIndex}/${imageIndex}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('quiz-images')
      .upload(storagePath, file, {
        cacheControl: '31536000',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      toast.error('Ошибка загрузки в Storage: ' + uploadError.message)
      return
    }

    const { data: urlData } = supabase.storage
      .from('quiz-images')
      .getPublicUrl(storagePath)

    const publicUrl = urlData.publicUrl

    // Сохраняем запись в БД (только URL)
    const { data, error } = await supabase
      .from('quiz_images')
      .insert({
        quiz_id: quizId,
        image_url: publicUrl,
        row_index: rowIndex,
        image_index: imageIndex,
        order_index: imageIndex
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving image record:', error)
      toast.error('Ошибка сохранения в БД: ' + error.message)
      return
    }

    // Обновляем локальное состояние
    setRows(prevRows => {
      const newRows = [...prevRows]
      if (!newRows[rowIndex]) {
        newRows[rowIndex] = {
          id: `row-${rowIndex}`,
          name: `Ряд ${rowIndex + 1}`,
          images: []
        }
      }
      newRows[rowIndex].images.push({
        id: data.id,
        url: publicUrl,
        order_index: imageIndex
      })
      return newRows
    })

    // Прокручиваем к началу, чтобы кнопка загрузки была видна
    setTimeout(() => {
      const rowElement = document.querySelector(`[data-row-index="${rowIndex}"]`)
      const scrollContainer = rowElement?.querySelector('[data-scroll-container]') as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' })
      }
    }, 100)
  }

  const handleRemoveImage = async (rowIndex: number, imageId: string) => {
    if (!quizId) return

    const { error } = await supabase
      .from('quiz_images')
      .delete()
      .eq('id', imageId)

    if (error) {
      console.error('Error deleting image:', error)
      return
    }

    // Обновляем локальное состояние
    setRows(prevRows => {
      const newRows = [...prevRows]
      newRows[rowIndex].images = newRows[rowIndex].images.filter(img => img.id !== imageId)
      return newRows
    })
  }

  const handleAddRow = async () => {
    if (!quizId) {
      toast.error('Сначала сохраните квиз!')
      return
    }

    const newRowIndex = rows.length

    // Создаем ряд в БД
    const { data, error } = await supabase
      .from('quiz_image_rows')
      .insert({
        quiz_id: quizId,
        row_index: newRowIndex,
        name: `Ряд ${newRowIndex + 1}`
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating row:', error)
      toast.error('Ошибка создания ряда')
      return
    }

    setRows([...rows, { 
      id: `row-${newRowIndex}`, 
      rowId: data.id,
      name: data.name,
      images: [] 
    }])
  }

  const handleRowNameChange = async (rowIndex: number, newName: string) => {
    if (!quizId) return

    const row = rows[rowIndex]
    if (!row) return

    // Сразу обновляем локально (чтобы инпут не лагал)
    setRows(prevRows => {
      const newRows = [...prevRows]
      if (newRows[rowIndex]) {
        newRows[rowIndex].name = newName
      }
      return newRows
    })

    // Если у ряда нет rowId (старый квиз), создаём запись в quiz_image_rows
    if (!row.rowId) {
      const { data, error } = await supabase
        .from('quiz_image_rows')
        .upsert(
          {
            quiz_id: quizId,
            row_index: rowIndex,
            name: newName
          },
          { onConflict: 'quiz_id,row_index' }
        )
        .select()
        .single()

      if (error) {
        console.error('Error creating row for name update:', error)
        return
      }

      setRows(prevRows => {
        const newRows = [...prevRows]
        if (newRows[rowIndex]) {
          newRows[rowIndex].rowId = data.id
          newRows[rowIndex].name = data.name || newName
        }
        return newRows
      })
      return
    }

    // Обновляем название в БД
    const { error } = await supabase
      .from('quiz_image_rows')
      .update({ name: newName })
      .eq('id', row.rowId)

    if (error) {
      console.error('Error updating row name:', error)
      return
    }
  }

  if (isLoading) {
    return <div className="text-center py-8 text-zinc-400">Загрузка...</div>
  }

  return (
    <div className="space-y-8">
      {rows.map((row, rowIndex) => (
        <ImageRowComponent
          key={row.id}
          row={row}
          rowIndex={rowIndex}
          onImageUpload={(file) => handleImageUpload(rowIndex, file)}
          onRemoveImage={(imageId) => handleRemoveImage(rowIndex, imageId)}
          onNameChange={(name) => handleRowNameChange(rowIndex, name)}
        />
      ))}

      <button
        onClick={handleAddRow}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
      >
        <Plus className="w-5 h-5" />
        <span>Добавить ряд картинок</span>
      </button>
    </div>
  )
}

function ImageRowComponent({
  row,
  rowIndex,
  onImageUpload,
  onRemoveImage,
  onNameChange
}: {
  row: ImageRow
  rowIndex: number
  onImageUpload: (file: File) => void
  onRemoveImage: (imageId: string) => void
  onNameChange: (name: string) => void
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
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4" data-row-index={rowIndex}>
      <div className="mb-4">
        <input
          type="text"
          value={row.name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white text-center text-lg font-semibold"
          placeholder="Название карусели"
        />
      </div>

      <div className="flex gap-4 items-start">
        {/* Кнопка загрузки - всегда слева, не absolute */}
        {row.images.length < 10 && (
          <label className="flex-shrink-0 w-48 h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-orange-500/50 transition-colors flex flex-col items-center justify-center bg-white/5 shadow-lg">
            <ImageIcon className="w-8 h-8 text-zinc-400 mb-2" />
            <span className="text-xs text-zinc-400 text-center px-2">Добавить картинку</span>
            <span className="text-xs text-zinc-500 mt-1">
              {row.images.length} / 10
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  onImageUpload(file)
                  e.target.value = ''
                }
              }}
            />
          </label>
        )}

        {/* Scroll Container для картинок */}
        <div className="relative flex-1 min-w-0">
          {/* Scroll Buttons (desktop) */}
          {row.images.length > 0 && (
            <>
              {canScrollLeft && (
                <button
                  onClick={() => handleScroll('left')}
                  className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-[15] w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center transition-all pointer-events-auto"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {canScrollRight && (
                <button
                  onClick={() => handleScroll('right')}
                  className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-[15] w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full items-center justify-center transition-all pointer-events-auto"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}

          {/* Images Scroll Container */}
          <div
            ref={scrollContainerRef}
            data-scroll-container
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {/* Images */}
            {row.images.map((image) => (
              <div
                key={image.id}
                className="flex-shrink-0 w-48 h-48 relative group"
                style={{ scrollSnapAlign: 'start' }}
              >
                <img
                  src={image.url}
                  alt={`Image ${image.order_index + 1}`}
                  className="w-48 h-48 object-cover rounded-xl shadow-lg"
                />
                <button
                  onClick={() => onRemoveImage(image.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
