import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLesson, useSubmitHomework } from '@/hooks/useCourse'
import { ArrowLeft, FileText, ExternalLink, Send, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUIStore } from '@/store/uiStore'
import { toast } from 'sonner'

export default function LessonPage() {
  const { tariffSlug, moduleId, lessonId } = useParams<{ tariffSlug: string; moduleId: string; lessonId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useLesson(lessonId!)
  const [answer, setAnswer] = useState('')
  const [extraVideos, setExtraVideos] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({})
  const submitHomework = useSubmitHomework()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const setKeyboardOpen = useUIStore((s) => s.setKeyboardOpen)

  // Получаем telegram_id текущего пользователя
  const getTelegramId = (): number | null => {
    const tg = (window as any).Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id
    }
    const savedUser = localStorage.getItem('tg_user')
    if (savedUser) {
      try {
        return JSON.parse(savedUser).id
      } catch {}
    }
    return null
  }

  // Получи все уроки модуля
  const { data: allLessons, isLoading: allLessonsLoading } = useQuery({
    queryKey: ['module-lessons', moduleId],
    queryFn: async () => {
      if (!moduleId) return []
      const { data } = await supabase
        .from('course_lessons')
        .select('id, title, order_index, has_homework')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('order_index')
      return data || []
    },
    enabled: !!moduleId
  })

  // Загружаем статусы ДЗ для проверки доступа к уроку
  const { data: hwStatuses, isLoading: hwLoading } = useQuery({
    queryKey: ['hw-statuses', moduleId, getTelegramId()],
    queryFn: async () => {
      const tgId = getTelegramId()
      if (!tgId) return {}
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', tgId)
        .single()
      if (!user) return {}
      const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('lesson_id, status')
        .eq('user_id', user.id)
      if (!submissions) return {}
      const map: Record<string, string> = {}
      for (const s of submissions) {
        map[s.lesson_id] = s.status
      }
      return map
    },
    enabled: !!getTelegramId() && !!moduleId
  })

  // Загружаем ручные разблокировки от админа
  const { data: manualUnlocks } = useQuery({
    queryKey: ['my-lesson-unlocks', getTelegramId()],
    queryFn: async () => {
      const tgId = getTelegramId()
      if (!tgId) return {}
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', tgId)
        .single()
      if (!user) return {}
      const { data: unlocks } = await supabase
        .from('lesson_unlocks')
        .select('lesson_id')
        .eq('user_id', user.id)
      if (!unlocks) return {}
      const map: Record<string, boolean> = {}
      for (const u of unlocks) map[u.lesson_id] = true
      return map
    },
    enabled: !!getTelegramId()
  })

  // Найди индекс текущего урока
  const currentIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1
  const prevLesson = currentIndex > 0 ? allLessons?.[currentIndex - 1] : null
  const nextLesson = currentIndex < (allLessons?.length || 0) - 1 ? allLessons?.[currentIndex + 1] : null

  // Вычисляем разблокированные уроки
  const getUnlockedLessons = (): Set<string> => {
    if (!allLessons || allLessons.length === 0) return new Set()
    const unlocked = new Set<string>()
    unlocked.add(allLessons[0].id)
    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i]

      // Ручная разблокировка от админа
      if (manualUnlocks?.[lesson.id]) {
        unlocked.add(lesson.id)
        if (i + 1 < allLessons.length) unlocked.add(allLessons[i + 1].id)
        continue
      }

      if (!unlocked.has(lesson.id)) break
      if (!lesson.has_homework || !!hwStatuses?.[lesson.id]) {
        if (i + 1 < allLessons.length) {
          unlocked.add(allLessons[i + 1].id)
        }
      }
    }
    return unlocked
  }

  const unlockedSet = getUnlockedLessons()
  const isLessonLocked = !!allLessons && allLessons.length > 0 && hwStatuses !== undefined && !!lessonId && !unlockedSet.has(lessonId)

  // Получи статус отправленного ДЗ текущего пользователя
  const { data: mySubmission, refetch: refetchSubmission } = useQuery({
    queryKey: ['my-submission', lessonId],
    queryFn: async () => {
      const telegramId = getTelegramId()
      if (!telegramId) return null
      
      // Получаем user_id по telegram_id
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single()
      
      if (!userData) return null
      
      const { data, error } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('lesson_id', lessonId)
        .eq('user_id', userData.id)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching submission:', error)
      }
      
      return data
    },
    enabled: !!lessonId
  })

  // Проверить доступ
  const { data: userTariff } = useQuery({
    queryKey: ['user-tariff-access', lessonId],
    queryFn: async () => {
      const authStorage = localStorage.getItem('auth-storage')
      if (!authStorage) return null
      
      const parsed = JSON.parse(authStorage)
      const userId = parsed?.state?.user?.id
      if (!userId || userId === 'dev-user') return null
      
      const { data } = await supabase
        .from('user_tariffs')
        .select('is_active')
        .eq('user_id', userId)
        .single()
      
      return data
    }
  })

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

  // Если доступ приостановлен — показать сообщение
  if (userTariff && userTariff.is_active === false) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center max-w-md">
          <p className="text-red-400 text-xl font-semibold mb-2">Доступ приостановлен</p>
          <p className="text-zinc-400">Обратитесь к администратору для возобновления доступа</p>
        </div>
      </div>
    )
  }

  if (isLoading || allLessonsLoading || hwLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF8F5]">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Урок заблокирован — выполните предыдущее ДЗ
  if (isLessonLocked) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-900 font-semibold text-lg mb-2">Урок заблокирован</p>
        <p className="text-gray-500 text-sm text-center mb-6">Выполните домашнее задание предыдущего урока</p>
        <button
          onClick={() => navigate(`/school/${tariffSlug}/${moduleId}`)}
          className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl px-6 py-3 font-medium hover:shadow-lg transition-all duration-200 cursor-pointer"
        >
          К списку уроков
        </button>
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
    
    // Получаем telegram_id текущего пользователя
    const telegramId = getTelegramId()
    
    if (!telegramId) {
      toast.error('Не удалось определить пользователя')
      return
    }

    // Получаем user_id по telegram_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single()

    if (userError || !userData) {
      toast.error('Пользователь не найден')
      return
    }

    const userId = userData.id
    
    // Подготовить данные для отправки
    const homeworkAnswer = answer || ''
    const selectedAnswers = userAnswers
    
    // Проверить есть ли уже ДЗ
    const { data: existingSubmission, error: fetchError } = await supabase
      .from('homework_submissions')
      .select('id, status')
      .eq('lesson_id', lessonId)
      .eq('user_id', userId)
      .maybeSingle()
    
    // Игнорируем ошибку "не найдено"
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching existing submission:', fetchError)
    }
    
    let error
    
    if (existingSubmission && existingSubmission.status === 'rejected') {
      // Обновить существующее ДЗ
      const { error: updateError } = await supabase
        .from('homework_submissions')
        .update({
          answer_text: homeworkAnswer,
          quiz_answers: selectedAnswers,
          status: 'pending',
          curator_comment: null,
          reviewed_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSubmission.id)
      
      error = updateError
    } else if (!existingSubmission) {
      // Создать новое ДЗ
      // ВАЖНО: используем user_id из базы, полученный по telegram_id, не из store
      const { error: insertError } = await supabase
        .from('homework_submissions')
        .insert({
          user_id: userId, // userData.id - правильный user_id из базы
          lesson_id: lessonId,
          answer_text: homeworkAnswer,
          quiz_answers: selectedAnswers,
          status: 'pending'
        })
      
      error = insertError
    } else {
      // ДЗ уже отправлено и не rejected
      toast.info('Домашнее задание уже отправлено')
      return
    }
    
    if (error) {
      console.error('Error submitting homework:', error)
      toast.error('Ошибка при отправке')
      return
    }

    setAnswer('')
    setUserAnswers({})
    toast.success('Ответ отправлен на проверку!')
    refetchSubmission()

    // Обновить кэш статусов ДЗ — чтобы следующий урок сразу открылся
    queryClient.invalidateQueries({ queryKey: ['hw-statuses'] })
    queryClient.invalidateQueries({ queryKey: ['all-hw-statuses'] })
    queryClient.invalidateQueries({ queryKey: ['my-lesson-unlocks'] })

    // Уведомление админу о новом ДЗ
    try {
      await supabase.functions.invoke('homework-notify', {
        body: {
          lesson_id: lessonId,
          user_telegram_id: telegramId,
          answer_text: homeworkAnswer,
          quiz_answers: selectedAnswers,
        },
      })
    } catch (notifyErr) {
      console.error('Homework notify error:', notifyErr)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-[300px]">
      <div className="max-w-3xl mx-auto px-4">
        {/* Шапка */}
        <div className="relative flex items-center justify-between mb-4 h-10">
          {/* Назад к модулю */}
          <button
            onClick={() => navigate(`/school/${tariffSlug}/${moduleId}`)}
            className="p-2 bg-zinc-800 rounded-lg z-10"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
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
              className={`p-2 ${prevLesson ? 'text-gray-900' : 'text-gray-300'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => nextLesson && unlockedSet.has(nextLesson.id) && navigate(`/school/${tariffSlug}/${moduleId}/lesson/${nextLesson.id}`)}
              disabled={!nextLesson || !unlockedSet.has(nextLesson.id)}
              className={`p-2 ${nextLesson && unlockedSet.has(nextLesson.id) ? 'text-gray-900' : 'text-gray-300'}`}
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
            {/* Название видео если есть */}
            {video.title && (
              <h3 className="text-lg font-semibold text-white mb-3 text-center">
                {video.title}
              </h3>
            )}
            
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
        <div className="bg-white/80 border border-gray-200 rounded-xl p-3 mb-4">
          <p className="text-xs font-medium text-gray-900 mb-2">В этом уроке:</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{linkifyText(lesson.description)}</p>
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
                className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200 hover:border-orange-500 transition-all"
              >
                <FileText className="w-5 h-5 text-orange-500" />
                <span className="flex-1">{material.title || 'Материал'}</span>
                <ExternalLink className="w-4 h-4 text-gray-400" />
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
            <div className="p-4 rounded-lg bg-white border border-gray-200 mb-4">
              <p className="text-gray-700 whitespace-pre-wrap">{lesson.homework_description}</p>
            </div>
          )}

          {/* Статус отправленного ДЗ */}
          {mySubmission && (
            <div className={`mb-4 p-4 rounded-xl ${
              mySubmission.status === 'pending' 
                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                : mySubmission.status === 'approved'
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${
                  mySubmission.status === 'pending' ? 'bg-yellow-400' :
                  mySubmission.status === 'approved' ? 'bg-green-400' : 'bg-red-400'
                }`} />
                <span className="font-medium">
                  {mySubmission.status === 'pending' ? 'На проверке' :
                   mySubmission.status === 'approved' ? 'Зачёт ✓' : 'Незачёт ✗'}
                </span>
              </div>
              
              {/* Твой ответ */}
              <p className="text-sm text-gray-500 mb-2">Твой ответ:</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{mySubmission.answer_text}</p>

              {/* Комментарий куратора */}
              {mySubmission.curator_comment && (
                <div className="mt-3 pt-3 border-t border-gray-300">
                  <p className="text-sm text-blue-600 mb-1">Комментарий куратора:</p>
                  <p className="text-sm text-gray-900">{mySubmission.curator_comment}</p>
                </div>
              )}
            </div>
          )}

          {/* Тесты/квизы (если есть) */}
          {quizzes.length > 0 && (
            <div className="space-y-4 mb-4">
              {quizzes.map((quiz, qIndex) => (
                <div key={quiz.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="font-medium mb-3">{qIndex + 1}. {quiz.question}</p>

                  {quiz.question_type === 'image' ? (
                    <div className="grid grid-cols-2 gap-2">
                      {quiz.quiz_options?.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                            userAnswers[quiz.id]?.includes(opt.id)
                              ? 'border-orange-500'
                              : 'border-gray-200'
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
                            className="w-full h-auto object-contain bg-gray-100"
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
                              : 'bg-gray-100 border-2 border-transparent hover:border-gray-300'
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

          {/* Форма отправки — показывать только если нет ДЗ или оно rejected */}
          {(!mySubmission || mySubmission.status === 'rejected') && (
            <>
              {/* Текстовый ответ — только если НЕТ тестов */}
              {quizzes.length === 0 && (
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onFocus={() => {
                    setKeyboardOpen(true)
                    // Задержка чтобы клавиатура успела появиться
                    setTimeout(() => {
                      textareaRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                      })
                    }, 300)
                  }}
                  onBlur={() => setKeyboardOpen(false)}
                  placeholder="Напиши свой ответ..."
                  className="w-full h-32 p-4 rounded-xl bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none resize-none mb-4"
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
            </>
          )}
        </div>
      )}
      </div>
    </div>
  )
}


