import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Calendar, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePosts } from '@/hooks/usePosts'

export default function PosterCreate() {
  const navigate = useNavigate()
  const { createPost, isLoading, error } = usePosts()
  
  const [caption, setCaption] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('12:00')

  // Обработка выбора файлов
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10) // максимум 10 файлов
      setMediaFiles(prev => [...prev, ...files].slice(0, 10))
      
      // Создаём превью
      files.forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setMediaPreviews(prev => [...prev, reader.result as string].slice(0, 10))
        }
        reader.readAsDataURL(file)
      })
    }
  }

  // Удаление файла
  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  // Сохранение как черновик
  const handleSaveDraft = async () => {
    const post = await createPost({
      caption,
      mediaFiles,
      scheduledAt: undefined
    })
    
    if (post) {
      navigate('/tools/poster')
    }
  }

  // Запланировать публикацию
  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime) {
      alert('Выберите дату и время')
      return
    }
    
    try {
      // Создаём дату в МСК (UTC+3)
      const mskDateString = `${scheduledDate}T${scheduledTime}:00+03:00`
      const scheduledAt = new Date(mskDateString)
      
      const post = await createPost({
        caption,
        mediaFiles,
        scheduledAt
      })
      
      if (post) {
        navigate('/tools/poster')
      }
    } catch (error) {
      console.error(error)
      alert('Ошибка создания поста')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Новый пост</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Media Upload */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">
          Медиа ({mediaFiles.length}/10)
        </label>
        
        {/* Preview Grid */}
        {mediaPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {mediaPreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square">
                <img 
                  src={preview} 
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-black/70 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                <span className="absolute bottom-1 left-1 bg-black/70 text-xs px-2 py-0.5 rounded">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone */}
        {mediaFiles.length < 10 && (
          <div className="border-2 border-dashed border-zinc-700 rounded-xl p-6 text-center">
            <Upload className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm mb-2">Перетащи фото сюда</p>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              id="media-upload"
              onChange={handleFileSelect}
            />
            <label htmlFor="media-upload">
              <span className="inline-block px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg cursor-pointer text-sm">
                Выбрать файлы
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Текст поста</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Напишите текст поста..."
          className="w-full h-32 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-orange-500"
          maxLength={2200}
        />
        <div className="text-right text-sm text-zinc-500 mt-1">
          {caption.length}/2200
        </div>
      </div>

      {/* Schedule */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Когда опубликовать</label>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <input 
              type="date" 
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none flex-1"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Время (МСК)</label>
            <div className="flex gap-2">
              {/* Часы */}
              <select
                value={scheduledTime.split(':')[0] || '12'}
                onChange={(e) => {
                  const minutes = scheduledTime.split(':')[1] || '00'
                  setScheduledTime(`${e.target.value}:${minutes}`)
                }}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0')
                  return <option key={hour} value={hour}>{hour}</option>
                })}
              </select>
              
              <span className="text-white text-2xl self-center">:</span>
              
              {/* Минуты */}
              <select
                value={scheduledTime.split(':')[1] || '00'}
                onChange={(e) => {
                  const hours = scheduledTime.split(':')[0] || '12'
                  setScheduledTime(`${hours}:${e.target.value}`)
                }}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
              >
                {Array.from({ length: 60 }, (_, i) => {
                  const minute = i.toString().padStart(2, '0')
                  return <option key={minute} value={minute}>{minute}</option>
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-black border-t border-zinc-800">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 border-zinc-700 text-white hover:bg-zinc-800"
            onClick={handleSaveDraft}
            disabled={isLoading || mediaFiles.length === 0}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Черновик'}
          </Button>
          <Button 
            className="flex-1 bg-orange-500 hover:bg-orange-600"
            onClick={handleSchedule}
            disabled={isLoading || mediaFiles.length === 0}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Запланировать'}
          </Button>
        </div>
      </div>
    </div>
  )
}
