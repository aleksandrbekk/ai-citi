import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, Eye, ArrowLeft, Settings, Upload } from 'lucide-react'
import { useQuizzes, useQuiz, type Quiz } from '../../../hooks/admin/useQuizzes'
import { ImageRowsEditor } from './ImageRowsEditor'

export default function QuizBuilder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { createQuiz, updateQuiz } = useQuizzes()
  const { quiz } = useQuiz(id || null)
  
  const [currentQuiz, setCurrentQuiz] = useState<Partial<Quiz>>({
    title: '',
    description: '',
    cover_image_url: null,
    is_published: false,
    is_public: true,
    settings: {
      show_correct_answers: true,
      randomize_questions: false,
      randomize_options: false,
      show_progress: true,
      allow_retake: true
    }
  })
  
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (quiz) {
      setCurrentQuiz(quiz)
    }
  }, [quiz])

  const handleSave = async () => {
    setIsSaving(true)
    
    try {
      if (id) {
        await updateQuiz(id, currentQuiz)
        alert('Квиз сохранён!')
      } else {
        const newQuiz = await createQuiz(currentQuiz)
        if (newQuiz) {
          // Обновляем id в состоянии перед навигацией
          setCurrentQuiz({ ...currentQuiz, id: newQuiz.id })
          // Используем replace: false чтобы компонент перезагрузился
          navigate(`/admin/quizzes/${newQuiz.id}/edit`)
        }
      }
    } catch (error: any) {
      console.error('Error saving quiz:', error)
      alert('Ошибка сохранения квиза: ' + (error.message || 'Неизвестная ошибка'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'cover') => {
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        if (type === 'cover') {
          setCurrentQuiz({ ...currentQuiz, cover_image_url: base64String })
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Ошибка загрузки изображения')
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/quizzes')}
            className="flex items-center gap-2 text-zinc-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Назад к квизам
          </button>
          
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-orange-200 to-orange-400 bg-clip-text text-transparent">
              {id ? 'Редактировать квиз' : 'Создать квиз'}
            </h1>
            
            <div className="flex items-center gap-3">
              {id && (
                <button
                  onClick={() => window.location.href = `https://aiciti.pro/quiz/${id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl hover:bg-white/20 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Предпросмотр
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all shadow-lg shadow-orange-500/30 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Настройки квиза
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Название</label>
                  <input
                    type="text"
                    value={currentQuiz.title || ''}
                    onChange={(e) => setCurrentQuiz({ ...currentQuiz, title: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white placeholder-zinc-500"
                    placeholder="Название квиза"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Описание</label>
                  <textarea
                    value={currentQuiz.description || ''}
                    onChange={(e) => setCurrentQuiz({ ...currentQuiz, description: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white placeholder-zinc-500 resize-none"
                    rows={3}
                    placeholder="Описание квиза"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Обложка</label>
                  <div className="relative">
                    {currentQuiz.cover_image_url ? (
                      <div className="relative group">
                        <img
                          src={currentQuiz.cover_image_url}
                          alt="Cover"
                          className="w-full h-32 object-cover rounded-xl"
                        />
                        <button
                          onClick={() => setCurrentQuiz({ ...currentQuiz, cover_image_url: null })}
                          className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-orange-500/50 transition-colors">
                        <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                        <span className="text-sm text-zinc-400">Загрузить обложку</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleImageUpload(file, 'cover')
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={currentQuiz.is_public}
                    onChange={(e) => setCurrentQuiz({ ...currentQuiz, is_public: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                  />
                  <label htmlFor="is_public" className="text-sm">Публичный квиз</label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_published"
                    checked={currentQuiz.is_published}
                    onChange={(e) => setCurrentQuiz({ ...currentQuiz, is_published: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-orange-500 focus:ring-orange-500/50"
                  />
                  <label htmlFor="is_published" className="text-sm">Опубликован</label>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Картинки для рейтинга */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Картинки для оценки</h2>
                <button
                  onClick={() => {
                    if (!id) {
                      alert('Сначала сохраните квиз!')
                      return
                    }
                    // Добавим новый ряд картинок
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Добавить ряд картинок
                </button>
              </div>
              <p className="text-zinc-400 text-sm mb-4">
                Загрузите картинки, которые пользователи будут оценивать. До 10 картинок в каждом ряду.
              </p>
              <ImageRowsEditor quizId={id} />
            </div>

            {/* Вопросы (скрыто, так как теперь только рейтинг) */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl opacity-50 pointer-events-none">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Вопросы</h2>
                <span className="text-xs text-zinc-500">Отключено - используется только рейтинг</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
