import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2, Save, Eye, Image as ImageIcon, ArrowLeft, Settings, Upload } from 'lucide-react'
import { useQuizzes, useQuiz, useQuizOptions, Quiz, QuizQuestion, QuizOption } from '@/hooks/useQuizzes'
import { supabase } from '@/lib/supabase'

export default function QuizBuilder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const { createQuiz, updateQuiz } = useQuizzes()
  const { quiz, questions, isLoading: quizLoading, createQuestion, updateQuestion, deleteQuestion, loadQuestions } = useQuiz(id || null)
  
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
  
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (quiz) {
      setCurrentQuiz(quiz)
    }
  }, [quiz])

  const handleSave = async () => {
    setIsSaving(true)
    
    if (id) {
      await updateQuiz(id, currentQuiz)
    } else {
      const newQuiz = await createQuiz(currentQuiz)
      if (newQuiz) {
        navigate(`/quizzes/builder/${newQuiz.id}`, { replace: true })
      }
    }
    
    setIsSaving(false)
  }

  const handleImageUpload = async (file: File, type: 'cover' | 'question') => {
    try {
      // Конвертируем файл в base64 для простоты (можно использовать storage позже)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        
        // Используем base64 как временное решение
        // В продакшене лучше использовать Supabase Storage
        if (type === 'cover') {
          setCurrentQuiz({ ...currentQuiz, cover_image_url: base64String })
        } else if (selectedQuestion) {
          await updateQuestion(selectedQuestion, { question_image_url: base64String })
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Ошибка загрузки изображения')
    }
  }

  const handleAddQuestion = async () => {
    const newQuestion = await createQuestion({
      question_text: 'Новый вопрос',
      question_type: 'single_choice'
    })
    
    if (newQuestion) {
      setSelectedQuestion(newQuestion.id)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-black to-zinc-900 text-white">
      {/* Glassmorphism Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-blue-500/10 via-transparent to-transparent blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/quizzes')}
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
                  onClick={() => navigate(`/quiz/${id}`)}
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
          {/* Left Panel - Quiz Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quiz Info Card */}
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

          {/* Right Panel - Questions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Questions List */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Вопросы</h2>
                <button
                  onClick={handleAddQuestion}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Добавить вопрос
                </button>
              </div>

              {quizLoading ? (
                <div className="text-center py-8 text-zinc-400">Загрузка...</div>
              ) : questions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-400 mb-4">Нет вопросов</p>
                  <button
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                  >
                    Создать первый вопрос
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <QuestionEditor
                      key={question.id}
                      question={question}
                      isSelected={selectedQuestion === question.id}
                      onSelect={() => setSelectedQuestion(question.id)}
                      onUpdate={updateQuestion}
                      onDelete={deleteQuestion}
                      onImageUpload={(file) => handleImageUpload(file, 'question')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionEditor({
  question,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onImageUpload
}: {
  question: QuizQuestion
  isSelected: boolean
  onSelect: () => void
  onUpdate: (id: string, updates: Partial<QuizQuestion>) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onImageUpload: (file: File) => void
}) {
  const { options, createOption, updateOption, deleteOption } = useQuizOptions(question.id)
  const [questionText, setQuestionText] = useState(question.question_text)
  const [questionType, setQuestionType] = useState(question.question_type)

  useEffect(() => {
    setQuestionText(question.question_text)
    setQuestionType(question.question_type)
  }, [question])

  const handleUpdate = async (updates: Partial<QuizQuestion>) => {
    await onUpdate(question.id, updates)
  }

  return (
    <div
      className={`bg-white/5 backdrop-blur-xl border rounded-xl p-4 transition-all cursor-pointer ${
        isSelected
          ? 'border-orange-500/50 shadow-lg shadow-orange-500/20'
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <input
            type="text"
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value)
              handleUpdate({ question_text: e.target.value })
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white text-sm"
            placeholder="Текст вопроса"
          />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Удалить вопрос?')) {
              onDelete(question.id)
            }
          }}
          className="p-2 text-red-400 hover:text-red-300 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {isSelected && (
        <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
          {/* Question Image */}
          {question.question_image_url ? (
            <div className="relative">
              <img
                src={question.question_image_url}
                alt="Question"
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:border-orange-500/50 transition-colors">
              <ImageIcon className="w-6 h-6 text-zinc-400 mb-2" />
              <span className="text-xs text-zinc-400">Загрузить изображение</span>
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

          {/* Question Type */}
          <select
            value={questionType}
            onChange={(e) => {
              setQuestionType(e.target.value as any)
              handleUpdate({ question_type: e.target.value as any })
            }}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white text-sm"
          >
            <option value="single_choice">Один вариант</option>
            <option value="multiple_choice">Несколько вариантов</option>
            <option value="text">Текстовый ответ</option>
            <option value="rating">Рейтинг</option>
          </select>

          {/* Options */}
          {(questionType === 'single_choice' || questionType === 'multiple_choice') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Варианты ответов</span>
                <button
                  onClick={() => createOption({ option_text: 'Новый вариант' })}
                  className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg hover:bg-white/20 transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Добавить
                </button>
              </div>
              {options.map((option) => (
                <div key={option.id} className="flex items-center gap-2">
                  <input
                    type={questionType === 'single_choice' ? 'radio' : 'checkbox'}
                    checked={option.is_correct}
                    onChange={() => updateOption(option.id, { is_correct: !option.is_correct })}
                    className="w-4 h-4 text-orange-500"
                  />
                  <input
                    type="text"
                    value={option.option_text}
                    onChange={(e) => updateOption(option.id, { option_text: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 text-white text-sm"
                    placeholder="Вариант ответа"
                  />
                  <button
                    onClick={() => deleteOption(option.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
