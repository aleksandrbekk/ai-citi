import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLesson, useSubmitHomework, useModules } from '@/hooks/useCourse'
import { FileText, ExternalLink, Send, Lock, List, CheckCircle2, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { getUserTariffsById, setCuratorStartedIfNeeded } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      } catch { }
    }
    return null
  }

  // Получи все уроки текущего модуля (для unlock логики)
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

  // Все модули + тарифы пользователя для drawer
  const { data: allModules } = useModules()
  const { data: userTariffs } = useQuery({
    queryKey: ['my-tariffs-drawer', getTelegramId()],
    queryFn: async () => {
      const tgId = getTelegramId()
      if (!tgId) return []
      return getUserTariffsById(tgId)
    },
    enabled: !!getTelegramId()
  })

  // Фильтруем модули по тарифу
  const filteredModules = allModules?.filter(m => {
    if (userTariffs?.includes('platinum')) return true
    if (userTariffs?.includes('standard') && m.min_tariff === 'standard') return true
    return false
  }) || []

  // Все уроки всех доступных модулей для drawer
  const { data: drawerLessonsData } = useQuery({
    queryKey: ['drawer-all-lessons', filteredModules.map(m => m.id).join(',')],
    queryFn: async () => {
      const moduleIds = filteredModules.map(m => m.id)
      if (moduleIds.length === 0) return []
      const { data } = await supabase
        .from('course_lessons')
        .select('id, module_id, title, order_index, has_homework')
        .in('module_id', moduleIds)
        .eq('is_active', true)
        .order('order_index')
      return data || []
    },
    enabled: filteredModules.length > 0
  })

  // Все статусы ДЗ пользователя (для всех модулей)
  const { data: allHwStatuses } = useQuery({
    queryKey: ['all-hw-statuses-drawer', getTelegramId()],
    queryFn: async () => {
      const tgId = getTelegramId()
      if (!tgId) return {}
      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', tgId).single()
      if (!user) return {}
      const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('lesson_id, status')
        .eq('user_id', user.id)
      const map: Record<string, string> = {}
      for (const s of submissions || []) { map[s.lesson_id] = s.status }
      return map
    },
    enabled: !!getTelegramId()
  })

  // Вычисляем разблокированные уроки по всем модулям (для drawer)
  const getUnlockedForModule = (moduleLessons: typeof drawerLessonsData, isFirstModuleAvailable: boolean): Set<string> => {
    if (!moduleLessons || moduleLessons.length === 0) return new Set()
    const unlocked = new Set<string>()
    if (isFirstModuleAvailable) {
      unlocked.add(moduleLessons[0].id)
    }
    for (let i = 0; i < moduleLessons.length; i++) {
      const lesson = moduleLessons[i]
      if (adminOverrides?.locks?.[lesson.id]) {
        unlocked.delete(lesson.id); continue
      }
      if (adminOverrides?.unlocks?.[lesson.id]) {
        unlocked.add(lesson.id)
        if (i + 1 < moduleLessons.length) unlocked.add(moduleLessons[i + 1].id)
        continue
      }
      if (!unlocked.has(lesson.id)) break
      if (!lesson.has_homework || !!allHwStatuses?.[lesson.id]) {
        if (i + 1 < moduleLessons.length) unlocked.add(moduleLessons[i + 1].id)
      }
    }
    return unlocked
  }

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

  // Загружаем ручные override от админа (unlock / lock)
  const { data: adminOverrides } = useQuery({
    queryKey: ['my-lesson-overrides', getTelegramId()],
    queryFn: async () => {
      const tgId = getTelegramId()
      if (!tgId) return { unlocks: {} as Record<string, boolean>, locks: {} as Record<string, boolean> }
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', tgId)
        .single()
      if (!user) return { unlocks: {} as Record<string, boolean>, locks: {} as Record<string, boolean> }
      const { data: rows } = await supabase
        .from('lesson_unlocks')
        .select('lesson_id, is_locked')
        .eq('user_id', user.id)
      const unlocks: Record<string, boolean> = {}
      const locks: Record<string, boolean> = {}
      for (const r of rows || []) {
        if (r.is_locked) locks[r.lesson_id] = true
        else unlocks[r.lesson_id] = true
      }
      return { unlocks, locks }
    },
    enabled: !!getTelegramId()
  })

  // Вычисляем разблокированные уроки
  const getUnlockedLessons = (): Set<string> => {
    if (!allLessons || allLessons.length === 0) return new Set()
    const unlocked = new Set<string>()
    unlocked.add(allLessons[0].id)
    for (let i = 0; i < allLessons.length; i++) {
      const lesson = allLessons[i]

      // Принудительно закрыт админом
      if (adminOverrides?.locks?.[lesson.id]) {
        if (unlocked.has(lesson.id)) unlocked.delete(lesson.id)
        continue
      }

      // Принудительно открыт админом
      if (adminOverrides?.unlocks?.[lesson.id]) {
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

  // Навигация prev/next по урокам
  const currentIndex = allLessons?.findIndex(l => l.id === lessonId) ?? -1
  const prevLesson = currentIndex > 0 ? allLessons![currentIndex - 1] : null
  const nextLesson = allLessons && currentIndex >= 0 && currentIndex < allLessons.length - 1
    ? allLessons[currentIndex + 1]
    : null
  const canGoPrev = prevLesson && unlockedSet.has(prevLesson.id)
  const canGoNext = nextLesson && unlockedSet.has(nextLesson.id)

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
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка урока...</p>
        </motion.div>
      </div>
    )
  }

  // Урок заблокирован — выполните предыдущее ДЗ
  if (isLessonLocked) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4 mx-auto">
            <Lock className="w-7 h-7 text-gray-400" />
          </div>
          <p className="text-gray-900 font-bold text-lg mb-2">Урок заблокирован</p>
          <p className="text-gray-400 text-sm text-center mb-6">Выполните домашнее задание предыдущего урока</p>
          <button
            onClick={() => navigate(`/school/${tariffSlug}/${moduleId}`)}
            className="bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl px-6 py-3 font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-200 cursor-pointer"
          >
            К списку уроков
          </button>
        </motion.div>
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
    queryClient.invalidateQueries({ queryKey: ['my-lesson-overrides'] })

    // Установить дату начала кураторства (при первом ДЗ)
    try {
      await setCuratorStartedIfNeeded(userId)
    } catch (e) {
      console.error('setCuratorStarted error:', e)
    }

    // Уведомление куратору/админу о новом ДЗ
    try {
      await supabase.functions.invoke('homework-notify', {
        body: {
          lesson_id: lessonId,
          user_telegram_id: telegramId,
          user_id: userId,
          answer_text: homeworkAnswer,
          quiz_answers: selectedAnswers,
        },
      })
    } catch (notifyErr) {
      console.error('Homework notify error:', notifyErr)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-gray-900 pb-[300px]">
      {/* Drawer — все модули и уроки */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[300px] max-w-[88vw] bg-white/95 backdrop-blur-xl shadow-2xl z-50 flex flex-col rounded-r-3xl"
            >
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                  <List className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Содержание</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 pb-24">
                {/* Кнопка к модулям */}
                <button
                  onClick={() => {
                    navigate(`/school/${tariffSlug}`)
                    setDrawerOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 mb-3 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 text-sm font-medium hover:bg-orange-100 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  К модулям
                </button>
                {filteredModules.map((mod, modIdx) => {
                  const moduleLessons = drawerLessonsData?.filter(l => l.module_id === mod.id) || []
                  // Проверяем завершён ли предыдущий модуль
                  let prevCompleted = true
                  if (modIdx > 0) {
                    const prevMod = filteredModules[modIdx - 1]
                    const prevLessons = drawerLessonsData?.filter(l => l.module_id === prevMod.id) || []
                    const prevHw = prevLessons.filter(l => l.has_homework)
                    if (prevHw.length > 0) {
                      const lastHw = prevHw[prevHw.length - 1]
                      prevCompleted = !!allHwStatuses?.[lastHw.id]
                    }
                  }
                  const moduleUnlocked = getUnlockedForModule(moduleLessons, prevCompleted)

                  return (
                    <div key={mod.id} className="mb-3">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-2 mb-1">{mod.title}</p>
                      {moduleLessons.map((l, idx) => {
                        const isActive = l.id === lessonId
                        const isUnlocked = moduleUnlocked.has(l.id)
                        const hwStatus = allHwStatuses?.[l.id]

                        return (
                          <button
                            key={l.id}
                            onClick={() => {
                              if (isUnlocked) {
                                navigate(`/school/${tariffSlug}/${mod.id}/lesson/${l.id}`)
                                setDrawerOpen(false)
                              }
                            }}
                            disabled={!isUnlocked}
                            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-left transition-all duration-150 ${isActive
                                ? 'bg-orange-50 border border-orange-200 shadow-sm'
                                : isUnlocked
                                  ? 'hover:bg-gray-50 border border-transparent'
                                  : 'opacity-35 border border-transparent'
                              }`}
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${!isUnlocked ? 'bg-gray-100 text-gray-300' :
                                hwStatus === 'approved' ? 'bg-green-100 text-green-600' :
                                  hwStatus === 'pending' ? 'bg-amber-100 text-amber-600' :
                                    isActive ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                              {!isUnlocked ? <Lock className="w-2.5 h-2.5" /> :
                                hwStatus === 'approved' ? <CheckCircle2 className="w-3 h-3" /> :
                                  hwStatus === 'pending' ? <Clock className="w-3 h-3" /> :
                                    idx + 1}
                            </div>
                            <span className={`text-xs truncate ${isActive ? 'font-semibold text-gray-900' : 'text-gray-600'
                              }`}>
                              {l.title}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto px-4 pt-3"
      >
        {/* Кнопка содержания + название урока + стрелки */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-2 bg-gradient-to-br from-orange-400 to-orange-500 text-white rounded-xl shadow-sm shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
            aria-label="Содержание"
          >
            <List className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate flex-1 min-w-0">{lesson?.title}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => canGoPrev && navigate(`/school/${tariffSlug}/${moduleId}/lesson/${prevLesson!.id}`)}
              disabled={!canGoPrev}
              className="p-1.5 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-default shadow-sm"
              aria-label="Предыдущий урок"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => canGoNext && navigate(`/school/${tariffSlug}/${moduleId}/lesson/${nextLesson!.id}`)}
              disabled={!canGoNext}
              className="p-1.5 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-100 text-gray-400 hover:border-orange-200 hover:text-orange-500 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-default shadow-sm"
              aria-label="Следующий урок"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Видео */}
        {lesson?.video_url && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-6"
          >
            <div className="max-w-2xl mx-auto">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                <iframe
                  src={lesson.video_url}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Дополнительные видео */}
        {extraVideos.map((video) => (
          <div key={video.id} className="mb-4">
            {video.title && (
              <h3 className="text-base font-semibold text-gray-900 mb-3 text-center">
                {video.title}
              </h3>
            )}
            <div className="max-w-2xl mx-auto">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
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
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 mb-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-gray-900 mb-2">В этом уроке:</p>
            <p className="text-sm text-gray-500 whitespace-pre-wrap leading-relaxed">{linkifyText(lesson.description)}</p>
          </motion.div>
        )}

        {/* Материалы */}
        {materials && materials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mb-6"
          >
            <h2 className="text-base font-bold mb-3">📎 Материалы</h2>
            <div className="space-y-2">
              {materials.map((material) => (
                <a
                  key={material.id}
                  href={material.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-[0.98] transition-all duration-200"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="flex-1 text-sm text-gray-900">{material.title || 'Материал'}</span>
                  <ExternalLink className="w-4 h-4 text-gray-300" />
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Домашнее задание */}
        {lesson?.has_homework && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-6"
          >
            <h2 className="text-base font-bold mb-3">📝 Домашнее задание</h2>

            {/* Описание задания */}
            {lesson.homework_description && (
              <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm mb-4">
                <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{lesson.homework_description}</p>
              </div>
            )}

            {/* Статус отправленного ДЗ */}
            {mySubmission && (
              <div className={`mb-4 p-4 rounded-2xl backdrop-blur-sm ${mySubmission.status === 'pending'
                  ? 'bg-amber-50/80 border border-amber-200'
                  : mySubmission.status === 'approved'
                    ? 'bg-green-50/80 border border-green-200'
                    : 'bg-red-50/80 border border-red-200'
                }`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${mySubmission.status === 'pending' ? 'bg-amber-400' :
                      mySubmission.status === 'approved' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                  <span className="font-semibold text-sm">
                    {mySubmission.status === 'pending' ? 'На проверке' :
                      mySubmission.status === 'approved' ? 'Зачёт ✓' : 'Незачёт ✗'}
                  </span>
                </div>

                {/* Твой ответ */}
                <p className="text-xs text-gray-400 mb-1">Твой ответ:</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{mySubmission.answer_text}</p>

                {/* Комментарий куратора */}
                {mySubmission.curator_comment && (
                  <div className="mt-3 pt-3 border-t border-gray-200/60">
                    <p className="text-xs text-orange-500 font-medium mb-1">Комментарий куратора:</p>
                    <p className="text-sm text-gray-700">{mySubmission.curator_comment}</p>
                  </div>
                )}
              </div>
            )}

            {/* Тесты/квизы (если есть) */}
            {quizzes.length > 0 && (
              <div className="space-y-4 mb-4">
                {quizzes.map((quiz, qIndex) => (
                  <div key={quiz.id} className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-4 shadow-sm">
                    <p className="font-semibold text-sm mb-3">{qIndex + 1}. {quiz.question}</p>

                    {quiz.question_type === 'image' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {quiz.quiz_options?.map((opt: any) => (
                          <label
                            key={opt.id}
                            className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-200 ${userAnswers[quiz.id]?.includes(opt.id)
                                ? 'border-orange-500 shadow-md shadow-orange-500/15'
                                : 'border-gray-100 hover:border-gray-200'
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
                            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${userAnswers[quiz.id]?.includes(opt.id)
                                ? 'bg-orange-50 border-2 border-orange-400 shadow-sm'
                                : 'bg-gray-50/80 border-2 border-transparent hover:border-gray-200'
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
                    className="w-full h-32 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:outline-none focus:shadow-sm resize-none mb-4 text-sm shadow-sm"
                  />
                )}

                {/* Кнопка отправки */}
                <button
                  onClick={handleSubmit}
                  disabled={(quizzes.length === 0 && !answer.trim()) || (quizzes.length > 0 && Object.keys(userAnswers).length === 0) || submitHomework.isPending}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                  {submitHomework.isPending ? 'Отправка...' : 'Отправить на проверку'}
                </button>
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
