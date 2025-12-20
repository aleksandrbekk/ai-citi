import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLesson, useSubmitHomework } from '@/hooks/useCourse'
import { ArrowLeft, FileText, ExternalLink, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function LessonPage() {
  const { tariffSlug, moduleId, lessonId } = useParams<{ tariffSlug: string; moduleId: string; lessonId: string }>()
  const { data, isLoading } = useLesson(lessonId!)
  const [answer, setAnswer] = useState('')
  const [extraVideos, setExtraVideos] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({})
  const submitHomework = useSubmitHomework()
  
  // Временно: фейковый userId
  const userId = 'temp-user-id'

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

  const handleSubmit = async () => {
    if (!answer.trim() || !lessonId) return
    
    await submitHomework.mutateAsync({
      lessonId,
      userId,
      answerText: answer
    })
    
    setAnswer('')
    alert('Ответ отправлен на проверку!')
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Шапка */}
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/school/${tariffSlug}/${moduleId}`} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-bold flex-1">{lesson?.title}</h1>
      </div>

      {/* Видео */}
      {lesson?.video_url && (
        <div className="mb-6">
          <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900">
            <iframe
              src={lesson.video_url}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Дополнительные видео */}
      {extraVideos.map((video) => (
        <div key={video.id} className="mb-4">
          <div className="aspect-video rounded-xl overflow-hidden bg-zinc-900">
            <iframe
              src={video.video_url}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ))}

      {/* Описание урока */}
      {lesson?.description && (
        <div className="bg-gray-800/50 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-white mb-2">В этом уроке:</p>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            {lesson.description.split('\n').filter(line => line.trim()).map((line, index) => (
              <li key={index}>{line.trim()}</li>
            ))}
          </ol>
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
          
          {lesson.homework_description && (
            <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 mb-4">
              <p className="text-zinc-300 whitespace-pre-wrap">{lesson.homework_description}</p>
            </div>
          )}

          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Напиши свой ответ..."
            className="w-full h-32 p-4 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none resize-none"
          />
          
          <button
            onClick={handleSubmit}
            disabled={!answer.trim() || submitHomework.isPending}
            className="mt-3 w-full py-3 rounded-xl bg-orange-500 text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
          >
            <Send className="w-4 h-4" />
            {submitHomework.isPending ? 'Отправка...' : 'Отправить на проверку'}
          </button>
        </div>
      )}

      {/* Тесты */}
      {quizzes.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">📝 Тест</h2>
          <div className="space-y-4">
            {quizzes.map((quiz, qIndex) => (
              <div key={quiz.id} className="bg-zinc-900 rounded-xl p-4">
                <p className="font-medium mb-3">{qIndex + 1}. {quiz.question}</p>
                
                <div className={quiz.question_type === 'image' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
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
                      {quiz.question_type === 'image' && opt.image_url ? (
                        <img src={opt.image_url} alt="" className="w-full h-24 object-cover rounded" />
                      ) : (
                        <span className="text-sm">{opt.option_text}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


