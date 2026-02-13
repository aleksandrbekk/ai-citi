import { useParams, Link } from 'react-router-dom'
import { useModule, useLessons } from '@/hooks/useCourse'
import { useQuery } from '@tanstack/react-query'
import { Play, FileText, ChevronRight, Lock, CheckCircle2, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

function getTelegramId(): number | null {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  const saved = localStorage.getItem('tg_user')
  if (saved) { try { return JSON.parse(saved).id } catch {} }
  return null
}

export default function ModulePage() {
  const { tariffSlug, moduleId } = useParams<{ tariffSlug: string; moduleId: string }>()
  const { data: module, isLoading: moduleLoading } = useModule(moduleId!)
  const { data: lessons, isLoading: lessonsLoading } = useLessons(moduleId!)
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

  // Вычисляем, какие уроки разблокированы
  const getUnlockedLessons = (): Set<string> => {
    if (!lessons || lessons.length === 0) return new Set()

    const unlocked = new Set<string>()
    unlocked.add(lessons[0].id)

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
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-gray-900 p-4 pb-24">
      {/* Шапка */}
      <h1 className="text-xl font-bold mb-6">{module?.title}</h1>

      {/* Список уроков */}
      <div className="space-y-2">
        {lessons?.map((lesson, index) => {
          const isUnlocked = unlockedSet.has(lesson.id)
          const hwStatus = hwStatuses?.[lesson.id]

          if (!isUnlocked) {
            return (
              <div
                key={lesson.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-gray-100/60 border border-gray-200 opacity-60"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-400">{lesson.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Выполните предыдущее ДЗ</div>
                </div>
              </div>
            )
          }

          return (
            <Link
              key={lesson.id}
              to={`/school/${tariffSlug}/${moduleId}/lesson/${lesson.id}`}
              className="flex items-center gap-3 p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:border-orange-300 transition-all"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                hwStatus === 'approved'
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
              <div className="flex-1">
                <div className="font-medium text-gray-900">{lesson.title}</div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  {lesson.video_url && (
                    <span className="flex items-center gap-1">
                      <Play className="w-3 h-3" /> Видео
                    </span>
                  )}
                  {lesson.has_homework && (
                    <span className={`flex items-center gap-1 ${
                      hwStatus === 'approved' ? 'text-green-500' :
                      hwStatus === 'pending' ? 'text-amber-500' :
                      hwStatus === 'rejected' ? 'text-red-500' : ''
                    }`}>
                      <FileText className="w-3 h-3" />
                      {hwStatus === 'approved' ? 'Зачтено' :
                       hwStatus === 'pending' ? 'На проверке' :
                       hwStatus === 'rejected' ? 'Незачёт' : 'ДЗ'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Link>
          )
        })}
      </div>

      {(!lessons || lessons.length === 0) && (
        <div className="text-center text-gray-400 py-12">
          Уроки скоро появятся
        </div>
      )}
    </div>
  )
}
