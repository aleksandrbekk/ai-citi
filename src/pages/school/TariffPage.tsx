import { useParams, Link, useNavigate } from 'react-router-dom'
import { useModules } from '@/hooks/useCourse'
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { canAccessModule } from '@/lib/supabase'

export default function TariffPage() {
  const { tariffSlug } = useParams<{ tariffSlug: string }>()
  const navigate = useNavigate()
  const { data: modules, isLoading } = useModules()
  const userTariffs = useAuthStore((state) => state.tariffs)
  
  const tariffNames: Record<string, string> = {
    'platinum': 'ПЛАТИНА',
    'standard': 'СТАНДАРТ'
  }

  // Фильтруем модули по доступу
  const accessibleModules = modules?.filter(m => canAccessModule(m.min_tariff, userTariffs)) || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Шапка */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/school" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-amber-400">{tariffNames[tariffSlug || ''] || 'Курс'}</h1>
      </div>

      {/* Список модулей */}
      <div className="space-y-3">
        {modules?.map((module) => {
          const hasAccess = canAccessModule(module.min_tariff, userTariffs)
          
          return (
            <div
              key={module.id}
              onClick={() => hasAccess && navigate(`/school/${tariffSlug}/${module.id}`)}
              className={`flex items-center gap-3 p-4 rounded-xl bg-zinc-900 border transition-all ${
                hasAccess 
                  ? 'border-zinc-700 hover:border-orange-500 cursor-pointer' 
                  : 'border-zinc-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <BookOpen className={`w-5 h-5 ${hasAccess ? 'text-orange-500' : 'text-zinc-600'}`} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {!hasAccess && <span className="text-yellow-500">🔒</span>}
                  {module.title}
                </div>
                <div className="text-sm text-zinc-400">{module.lessons_count} уроков</div>
              </div>
              {hasAccess && <ChevronRight className="w-5 h-5 text-zinc-500" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}







