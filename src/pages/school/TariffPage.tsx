import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useModules } from '@/hooks/useCourse'
import { BookOpen, ChevronRight, Lock, CheckCircle2 } from 'lucide-react'
import { supabase, getUserTariffsById } from '@/lib/supabase'

function getTelegramId(): number | null {
  const tg = (window as any).Telegram?.WebApp
  if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id
  const saved = localStorage.getItem('tg_user')
  if (saved) { try { return JSON.parse(saved).id } catch {} }
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 p-4 pb-24">
      {/* Шапка */}
      <h1 className="text-xl font-bold text-orange-500 mb-6">{tariffNames[tariffSlug || ''] || 'Курс'}</h1>

      {/* Список модулей */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Нет доступных модулей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredModules.map((module) => {
            const isUnlocked = unlockedModules.has(module.id)

            if (!isUnlocked) {
              return (
                <div
                  key={module.id}
                  className="flex items-center gap-3 p-4 rounded-xl bg-gray-100/60 border border-gray-200 opacity-60"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-400">{module.title}</div>
                    <div className="text-sm text-gray-400">Завершите предыдущий модуль</div>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={module.id}
                onClick={() => navigate(`/school/${tariffSlug}/${module.id}`)}
                className="flex items-center gap-3 p-4 rounded-xl glass-card border border-gray-200 hover:border-orange-500 transition-all cursor-pointer"
              >
                {isModuleComplete(module.id) ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <BookOpen className="w-5 h-5 text-orange-500" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{module.title}</div>
                  <div className="text-sm text-gray-500">{module.lessons_count} уроков</div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}







