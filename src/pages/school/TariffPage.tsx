import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useModules } from '@/hooks/useCourse'
import { BookOpen, ChevronRight, Lock, CheckCircle2 } from 'lucide-react'
import { supabase, getUserTariffsById } from '@/lib/supabase'
import { motion } from 'framer-motion'

function getTelegramId(): number | null {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  const saved = localStorage.getItem('tg_user')
  if (saved) { try { return JSON.parse(saved).id } catch { } }
  return null
}

export default function TariffPage() {
  const { tariffSlug } = useParams<{ tariffSlug: string }>()
  const navigate = useNavigate()
  const { data: modules, isLoading } = useModules()
  const [userTariffs, setUserTariffs] = useState<string[]>([])
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true)

  const tariffNames: Record<string, string> = {
    'platinum': 'ПЛАТИНА',
    'standard': 'СТАНДАРТ'
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    let telegramId = tg?.initDataUnsafe?.user?.id
    if (!telegramId && savedUser) {
      telegramId = JSON.parse(savedUser).id
    }

    if (telegramId) {
      getUserTariffsById(telegramId).then(tariffs => {
        setUserTariffs(tariffs)
        setIsLoadingTariffs(false)
      })
    } else {
      setIsLoadingTariffs(false)
    }
  }, [])

  // Фильтруем модули по тарифу
  const filteredModules = modules?.filter(m => {
    if (userTariffs.includes('platinum')) return true
    if (userTariffs.includes('standard') && m.min_tariff === 'standard') return true
    return false
  }) || []

  // Загружаем все уроки модулей для проверки завершённости
  const { data: allLessonsData, isLoading: lessonsLoading } = useQuery({
    queryKey: ['tariff-module-lessons', filteredModules.map(m => m.id).join(',')],
    queryFn: async () => {
      const moduleIds = filteredModules.map(m => m.id)
      if (moduleIds.length === 0) return []
      const { data } = await supabase
        .from('course_lessons')
        .select('id, module_id, order_index, has_homework')
        .in('module_id', moduleIds)
        .eq('is_active', true)
        .order('order_index')
      return data || []
    },
    enabled: filteredModules.length > 0
  })

  // Загружаем статусы ДЗ ученика
  const { data: hwStatuses, isLoading: hwLoading } = useQuery({
    queryKey: ['all-hw-statuses', getTelegramId()],
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
    enabled: !!getTelegramId()
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

  // Модуль завершён если все уроки с ДЗ сданы
  const isModuleComplete = (moduleId: string): boolean => {
    if (!allLessonsData || !hwStatuses) return false
    const moduleLessons = allLessonsData.filter(l => l.module_id === moduleId)
    if (moduleLessons.length === 0) return false
    return moduleLessons
      .filter(l => l.has_homework)
      .every(l => !!hwStatuses[l.id])
  }

  // Вычисляем разблокированные модули
  const getUnlockedModules = (): Set<string> => {
    if (filteredModules.length === 0) return new Set()
    if (!getTelegramId()) return new Set(filteredModules.map(m => m.id))

    const unlocked = new Set<string>()
    unlocked.add(filteredModules[0].id)

    for (let i = 0; i < filteredModules.length; i++) {
      const mod = filteredModules[i]
      const moduleLessons = allLessonsData?.filter(l => l.module_id === mod.id) || []

      // Если ВСЕ уроки модуля принудительно закрыты — модуль закрыт
      const allLocked = moduleLessons.length > 0 && moduleLessons.every(l => adminOverrides?.locks?.[l.id])
      if (allLocked) {
        if (unlocked.has(mod.id)) unlocked.delete(mod.id)
        continue
      }

      // Если хотя бы один урок модуля принудительно открыт — модуль открыт
      const hasManualUnlock = moduleLessons.some(l => adminOverrides?.unlocks?.[l.id])
      if (hasManualUnlock) {
        unlocked.add(mod.id)
        if (i + 1 < filteredModules.length) unlocked.add(filteredModules[i + 1].id)
        continue
      }

      if (!unlocked.has(mod.id)) break

      if (isModuleComplete(mod.id) && i + 1 < filteredModules.length) {
        unlocked.add(filteredModules[i + 1].id)
      }
    }

    return unlocked
  }

  const unlockedModules = getUnlockedModules()

  if (isLoading || isLoadingTariffs || lessonsLoading || hwLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FFF8F5]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка модулей...</p>
        </motion.div>
      </div>
    )
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const }
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
        <h1 className="text-xl font-bold text-orange-500">{tariffNames[tariffSlug || ''] || 'Курс'}</h1>
        <p className="text-sm text-gray-400 mt-1">{filteredModules.length} модулей</p>
      </motion.div>

      {/* Список модулей */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Нет доступных модулей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredModules.map((module, index) => {
            const isUnlocked = unlockedModules.has(module.id)
            const complete = isModuleComplete(module.id)

            if (!isUnlocked) {
              return (
                <motion.div
                  key={module.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={cardVariants}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 backdrop-blur-sm border border-gray-100 opacity-50"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-300 flex items-center justify-center text-sm font-semibold">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-400 truncate">{module.title}</div>
                    <div className="text-xs text-gray-300 mt-0.5">Завершите предыдущий модуль</div>
                  </div>
                </motion.div>
              )
            }

            return (
              <motion.div
                key={module.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <div
                  onClick={() => navigate(`/school/${tariffSlug}/${module.id}`)}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold shadow-sm ${complete
                      ? 'bg-gradient-to-br from-green-50 to-green-100 text-green-500'
                      : 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-500'
                    }`}>
                    {complete ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <BookOpen className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{module.title}</div>
                    <div className="text-sm text-gray-400 mt-0.5">{module.lessons_count} уроков</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}







