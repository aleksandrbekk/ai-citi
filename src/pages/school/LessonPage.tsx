import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useLesson, useSubmitHomework } from '@/hooks/useCourse'
import { ArrowLeft, FileText, ExternalLink, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LessonPage() {
  const { tariffSlug, moduleId, lessonId } = useParams<{ tariffSlug: string; moduleId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useLesson(lessonId!)
  const [answer, setAnswer] = useState('')
  const [extraVideos, setExtraVideos] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({})
  const submitHomework = useSubmitHomework()
  
  // Временно: фейковый userId
  const userId = 'temp-user-id'

  // Получи все уроки модуля
  const { data: allLessons } = useQuery({
    queryKey: ['module-lessons', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data } = await supabase
        .from('course_lessons')
        .select('id, title, order_index')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('order_index')
      return data || []
    },
    enabled: !!moduleId
  })

  // Найди индекс текущего урока
  const currentIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1
  const prevLesson = currentIndex > 0 ? allLessons?.[currentIndex - 1] : null
  const nextLesson = currentIndex < (allLessons?.length || 0) - 1 ? allLessons?.[currentIndex + 1] : null

  useEffect(() => {
    if (lessonId) {
      supabase
        .from('lesson_videos')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_index')
        .then(({ data }) => setExtraVideos(data || []))
      
      supabase
        .from('lesson_quizzes')
        .select(`
          *,
          quiz_options (*)
        `)
        .eq('lesson_id', lessonId)
        .order('order_index')
        .then(({ data }) => setQuizzes(data || []))
    }
  }, [lessonId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const { lesson, materials } = data || {}

  const linkifyText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = text.split(urlRegex)
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 underline break-all"
          >
            {part}
          </a>
        )
      }
      return part
    })
  }

  const handleSubmit = async () => {
    if (!lessonId) return
    
    const hasTextAnswer = answer.trim().length > 0
    const hasQuizAnswers = Object.keys(userAnswers).length > 0
    
    if (!hasTextAnswer && !hasQuizAnswers) return
    
    await submitHomework.mutateAsync({
      lessonId,
      userId,
      answerText: answer || '',
      quizAnswers: userAnswers
    })
    
    setAnswer('')
    setUserAnswers({})
    alert('Ответ отправлен на проверку!')
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="max-w-3xl mx-auto px-4">
        {/* Шапка */}
        <div className="relative flex items-center justify-between mb-4 h-10">
          {/* Назад к модулю */}
          <button 
            onClick={() => navigate(`/school/${tariffSlug}/${moduleId}`)} 
            className="p-2 bg-zinc-800 rounded-lg z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Название — по центру */}
          <h1 className="absolute left-0 right-0 top-1/2 -translate-y-1/2 text-base font-semibold text-center px-16 truncate">
            {lesson?.title}
          </h1>

          {/* Навигация между уроками */}
          <div className="flex items-center gap-1 z-10">
            <button 
              onClick={() => prevLesson && navigate(`/school/${tariffSlug}/${moduleId}/lesson/${prevLesson.id}`)}
              disabled={!prevLesson}
              className={`p-2 ${prevLesson ? 'text-white' : 'text-zinc-600'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => nextLesson && navigate(`/school/${tariffSlug}/${moduleId}/lesson/${nextLesson.id}`)}
              disabled={!nextLesson}
              className={`p-2 ${nextLesson ? 'text-white' : 'text-zinc-600'}`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Видео */}
        {lesson?.video_url && (
          <div className="mb-6">
            <div className="max-w-2xl mx-auto">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* Дополнительные видео */}
        {extraVideos.map((video) => (
          <div key={video.id} className="mb-4">
            <div className="max-w-2xl mx-auto">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={video.video_url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        ))}

      {/* Описание урока */}
      {lesson?.description && (
        <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-white mb-2">В этом уроке:</p>
          <p className="text-xs text-gray-400 whitespace-pre-wrap">{linkifyText(lesson.description)}</p>
        </div>
      )}

      {/* Материалы */}
      {materials && materials.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📎 Материалы</h2>
          <div className="space-y-2">
            {materials.map((material) => (
              <a
                key={material.id}
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-orange-500 transition-all"
              >
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="flex-1">{material.title || 'Материал'}</span>
                <ExternalLink className="w-4 h-4 text-zinc-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Домашнее задание */}
      {lesson?.has_homework && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📝 Домашнее задание</h2>
          
          {/* Описание задания */}
          {lesson.homework_description && (
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
              <p className="text-zinc-300 whitespace-pre-wrap">{lesson.homework_description}</p>
            </div>
          )}

          {/* Тесты/квизы (если есть) */}
          {quizzes.length > 0 && (
            <div className="space-y-4 mb-4">
              {quizzes.map((quiz, qIndex) => (
                <div key={quiz.id} className="bg-zinc-900 rounded-xl p-4">
                  <p className="font-medium mb-3">{qIndex + 1}. {quiz.question}</p>
                  
                  {quiz.question_type === 'image' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {quiz.quiz_options?.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                            userAnswers[quiz.id]?.includes(opt.id)
                              ? 'border-orange-500'
                              : 'border-zinc-700'
                          }`}
                        >
                          <input
                            type={quiz.question_type === 'multiple' ? 'checkbox' : 'radio'}
                            name={`quiz-${quiz.id}`}
                            checked={userAnswers[quiz.id]?.includes(opt.id) || false}
                            onChange={() => {
                              setUserAnswers(prev => {
                                const current = prev[quiz.id] || []
                                if (quiz.question_type === 'multiple') {
                                  return {
                                    ...prev,
                                    [quiz.id]: current.includes(opt.id)
                                      ? current.filter(id => id !== opt.id)
                                      : [...current, opt.id]
                                  }
                                } else {
                                  return { ...prev, [quiz.id]: [opt.id] }
                                }
                              })
                            }}
                            className="sr-only"
                          />
                          <img 
                            src={opt.image_url} 
                            alt={opt.option_text || ''} 
                            className="w-full h-auto object-contain bg-zinc-800"
                          />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quiz.quiz_options?.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            userAnswers[quiz.id]?.includes(opt.id)
                              ? 'bg-orange-500/20 border-2 border-orange-500'
                              : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-600'
                          }`}
                        >
                          <input
                            type={quiz.question_type === 'multiple' ? 'checkbox' : 'radio'}
                            name={`quiz-${quiz.id}`}
                            checked={userAnswers[quiz.id]?.includes(opt.id) || false}
                            onChange={() => {
                              setUserAnswers(prev => {
                                const current = prev[quiz.id] || []
                                if (quiz.question_type === 'multiple') {
                                  return {
                                    ...prev,
                                    [quiz.id]: current.includes(opt.id)
                                      ? current.filter(id => id !== opt.id)
                                      : [...current, opt.id]
                                  }
                                } else {
                                  return { ...prev, [quiz.id]: [opt.id] }
                                }
                              })
                            }}
                            className="hidden"
                          />
                          <span className="text-sm">{opt.option_text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Текстовый ответ — только если НЕТ тестов */}
          {quizzes.length === 0 && (
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Напиши свой ответ..."
              className="w-full h-32 p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-none mb-4"
            />
          )}

          {/* Кнопка отправки */}
          <button
            onClick={handleSubmit}
            disabled={(quizzes.length === 0 && !answer.trim()) || (quizzes.length > 0 && Object.keys(userAnswers).length === 0) || submitHomework.isPending}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitHomework.isPending ? 'Отправка...' : 'Отправить на проверку'}
          </button>
        </div>
      )}
      </div>
    </div>
  )
}


