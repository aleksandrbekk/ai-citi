import { useParams, Link } from 'react-router-dom'
import { useModule, useLessons, useModules } from '@/hooks/useCourse'
import { useQuery } from '@tanstack/react-query'
import { Play, FileText, ChevronRight, Lock, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

function getTelegramId(): number | null {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  const saved = localStorage.getItem('tg_user')
  if (saved) { try { return JSON.parse(saved).id } catch { } }
  return null
}

export default function ModulePage() {
  const { tariffSlug, moduleId } = useParams<{ tariffSlug: string; moduleId: string }>()
  const { data: module, isLoading: moduleLoading } = useModule(moduleId!)
  const { data: lessons, isLoading: lessonsLoading } = useLessons(moduleId!)
  const { data: allModules } = useModules()
  const telegramId = getTelegramId()

  // Загружаем статусы ДЗ ученика для всех уроков модуля
  const { data: hwStatuses } = useQuery({
    queryKey: ['hw-statuses', moduleId, telegramId],
    queryFn: async () => {
      if (!telegramId) return {}

      // Получаем user_id
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
        .single()

      if (!user) return {}

      // Все ДЗ пользователя для уроков этого модуля
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
    enabled: !!telegramId && !!moduleId
  })

  // Загружаем ручные override от админа (unlock / lock)
  const { data: adminOverrides } = useQuery({
    queryKey: ['my-lesson-overrides', telegramId],
    queryFn: async () => {
      if (!telegramId) return { unlocks: {} as Record<string, boolean>, locks: {} as Record<string, boolean> }
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', telegramId)
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
    enabled: !!telegramId
  })

  // Проверяем, завершён ли предыдущий модуль (все ДЗ сданы или нет ДЗ)
  const prevModule = allModules && module
    ? allModules.filter(m => m.order_index < module.order_index).sort((a, b) => b.order_index - a.order_index)[0]
    : null

  const { data: prevModuleCompleted } = useQuery({
    queryKey: ['prev-module-completed', prevModule?.id, telegramId],
    queryFn: async () => {
      if (!prevModule || !telegramId) return true // Первый модуль — всегда доступен

      const { data: user } = await supabase
        .from('users').select('id').eq('telegram_id', telegramId).single()
      if (!user) return false

      // Уроки предыдущего модуля
      const { data: prevLessons } = await supabase
        .from('course_lessons')
        .select('id, has_homework')
        .eq('module_id', prevModule.id)
        .eq('is_active', true)
        .order('order_index')
      if (!prevLessons || prevLessons.length === 0) return true

      // Уроки с ДЗ
      const hwLessons = prevLessons.filter(l => l.has_homework)
      if (hwLessons.length === 0) return true

      // Проверяем все ДЗ
      const { data: subs } = await supabase
        .from('homework_submissions')
        .select('lesson_id, status')
        .eq('user_id', user.id)
        .in('lesson_id', hwLessons.map(l => l.id))

      // Все ДЗ должны быть отправлены (любой статус)
      const submittedIds = new Set(subs?.map(s => s.lesson_id) || [])
      return hwLessons.every(l => submittedIds.has(l.id))
    },
    enabled: !!telegramId && !!module && !!allModules
  })

  // Вычисляем, какие уроки разблокированы
  const getUnlockedLessons = (): Set<string> => {
    if (!lessons || lessons.length === 0) return new Set()

    const unlocked = new Set<string>()

    // Первый урок модуля открыт только если это первый модуль ИЛИ предыдущий завершён
    const isFirstModule = !prevModule
    if (isFirstModule || prevModuleCompleted) {
      unlocked.add(lessons[0].id)
    }

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]

      // Принудительно закрыт админом
      if (adminOverrides?.locks?.[lesson.id]) {
        if (unlocked.has(lesson.id)) unlocked.delete(lesson.id)
        continue
      }

      // Принудительно открыт админом
      if (adminOverrides?.unlocks?.[lesson.id]) {
        unlocked.add(lesson.id)
        if (i + 1 < lessons.length) unlocked.add(lessons[i + 1].id)
        continue
      }

      if (!unlocked.has(lesson.id)) break

      if (!lesson.has_homework || !!hwStatuses?.[lesson.id]) {
        if (i + 1 < lessons.length) {
          unlocked.add(lessons[i + 1].id)
        }
      }
    }

    return unlocked
  }

  const unlockedSet = getUnlockedLessons()

  if (moduleLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF8F5]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка уроков...</p>
        </motion.div>
      </div>
    )
  }

  const completedCount = lessons?.filter(l => {
    const s = hwStatuses?.[l.id]
    return s === 'approved' || (!l.has_homework && unlockedSet.has(l.id))
  }).length || 0
  const totalCount = lessons?.length || 0

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' as const }
    })
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-gray-900 p-4 pb-24">
      {/* Шапка */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-xl font-bold text-gray-900">{module?.title}</h1>
        <p className="text-sm text-gray-400 mt-1">Прогресс: {completedCount}/{totalCount} уроков</p>
      </motion.div>

      {/* Список уроков с timeline */}
      <div className="relative">
        {/* Timeline линия */}
        {lessons && lessons.length > 1 && (
          <div className="absolute left-[23px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-orange-200 via-orange-100 to-gray-100 rounded-full" />
        )}

        <div className="space-y-3 relative">
          {lessons?.map((lesson, index) => {
            const isUnlocked = unlockedSet.has(lesson.id)
            const hwStatus = hwStatuses?.[lesson.id]

            if (!isUnlocked) {
              return (
                <motion.div
                  key={lesson.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="flex items-center gap-3 pl-1"
                >
                  <div className="w-[46px] flex items-center justify-center shrink-0 relative z-10">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center border-2 border-[#FFF8F5]">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-2xl bg-white/40 backdrop-blur-sm border border-gray-100 opacity-50">
                    <div className="font-medium text-gray-400 text-sm truncate">{lesson.title}</div>
                    <div className="text-xs text-gray-300 mt-0.5">Выполните предыдущее ДЗ</div>
                  </div>
                </motion.div>
              )
            }

            return (
              <motion.div
                key={lesson.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <Link
                  to={`/school/${tariffSlug}/${moduleId}/lesson/${lesson.id}`}
                  className="flex items-center gap-3 pl-1"
                >
                  <div className="w-[46px] flex items-center justify-center shrink-0 relative z-10">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-[#FFF8F5] ${hwStatus === 'approved'
                        ? 'bg-green-100 text-green-600'
                        : hwStatus === 'pending'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-orange-100 text-orange-500'
                      }`}>
                      {hwStatus === 'approved' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : hwStatus === 'pending' ? (
                        <Clock className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                  </div>
                  <div className="flex-1 p-3 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-[0.98] transition-all duration-200">
                    <div className="font-medium text-gray-900 text-sm">{lesson.title}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {lesson.video_url && (
                        <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          <Play className="w-3 h-3" />Видео
                        </span>
                      )}
                      {lesson.has_homework && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${hwStatus === 'approved' ? 'text-green-600 bg-green-50' :
                            hwStatus === 'pending' ? 'text-amber-600 bg-amber-50' :
                              hwStatus === 'rejected' ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-50'
                          }`}>
                          <FileText className="w-3 h-3" />
                          {hwStatus === 'approved' ? 'Зачтено' :
                            hwStatus === 'pending' ? 'На проверке' :
                              hwStatus === 'rejected' ? 'Незачёт' : 'ДЗ'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      {(!lessons || lessons.length === 0) && (
        <div className="text-center text-gray-400 py-12">
          Уроки скоро появятся
        </div>
      )}
    </div>
  )
}
