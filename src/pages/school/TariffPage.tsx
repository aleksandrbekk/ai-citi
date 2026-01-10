import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useModules } from '@/hooks/useCourse'
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react'
import { getUserTariffsById } from '@/lib/supabase'

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

  if (isLoading || isLoadingTariffs) {
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
      <div className="flex items-center gap-3 mb-6">
        <Link to="/school" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-orange-500">{tariffNames[tariffSlug || ''] || 'Курс'}</h1>
      </div>

      {/* Список модулей */}
      {filteredModules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Нет доступных модулей</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredModules.map((module) => (
            <div
              key={module.id}
              onClick={() => navigate(`/school/${tariffSlug}/${module.id}`)}
              className="flex items-center gap-3 p-4 rounded-xl glass-card border border-gray-200 hover:border-orange-500 transition-all cursor-pointer"
            >
              <BookOpen className="w-5 h-5 text-orange-500" />
              <div className="flex-1">
                <div className="font-medium">{module.title}</div>
                <div className="text-sm text-gray-500">{module.lessons_count} уроков</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}







