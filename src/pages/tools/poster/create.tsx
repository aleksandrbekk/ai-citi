import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Calendar, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PosterCreate() {
  const navigate = useNavigate()
  const [caption, setCaption] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold">Новый пост</h1>
      </div>

      {/* Media Upload */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Медиа</label>
        <div className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center">
          <Upload className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 mb-2">Перетащи фото сюда</p>
          <p className="text-zinc-500 text-sm">или нажми для выбора</p>
          <input 
            type="file" 
            accept="image/*" 
            multiple 
            className="hidden" 
            id="media-upload"
            onChange={(e) => {
              if (e.target.files) {
                setMediaFiles(Array.from(e.target.files))
              }
            }}
          />
          <label htmlFor="media-upload">
            <Button variant="outline" className="mt-4 cursor-pointer" asChild>
              <span>Выбрать файлы</span>
            </Button>
          </label>
        </div>
        {mediaFiles.length > 0 && (
          <p className="text-sm text-zinc-400 mt-2">
            Выбрано файлов: {mediaFiles.length}
          </p>
        )}
      </div>

      {/* Caption */}
      <div className="mb-6">
        <label className="block text-sm text-zinc-400 mb-2">Текст поста</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Напишите текст поста..."
          className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white resize-none focus:outline-none focus:border-orange-500"
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
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-zinc-400" />
            <input 
              type="date" 
              className="bg-transparent text-white focus:outline-none"
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-zinc-400" />
            <input 
              type="time" 
              className="bg-transparent text-white focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-black border-t border-zinc-800">
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Сохранить черновик
          </Button>
          <Button 
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            Запланировать
          </Button>
        </div>
      </div>
    </div>
  )
}

