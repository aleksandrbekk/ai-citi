import { Link } from 'react-router-dom'
import { useModules } from '@/hooks/useCourse'
import { Lock, BookOpen, ChevronRight } from 'lucide-react'

export default function SchoolIndex() {
  const { data: modules, isLoading } = useModules()
  
  // Временно: считаем что у пользователя тариф "standard"
  const userTariff: string = 'standard'
  
  const hasAccess = (minTariff: string) => {
    if (userTariff === 'platinum') return true
    if (userTariff === 'standard' && minTariff === 'standard') return true
    return false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">🎬 КИНОСКОП</h1>
      
      <div className="space-y-3">
        {modules?.map((module) => {
          const locked = !hasAccess(module.min_tariff)
          
          return (
            <Link
              key={module.id}
              to={locked ? '#' : `/school/${module.id}`}
              className={`block p-4 rounded-xl border transition-all ${
                locked 
                  ? 'bg-zinc-900/50 border-zinc-800 opacity-60' 
                  : 'bg-zinc-900 border-zinc-700 hover:border-orange-500'
              }`}
              onClick={(e) => locked && e.preventDefault()}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {locked ? (
                      <Lock className="w-4 h-4 text-zinc-500" />
                    ) : (
                      <BookOpen className="w-4 h-4 text-orange-500" />
                    )}
                    <span className="font-medium">{module.title}</span>
                  </div>
                  <div className="text-sm text-zinc-400">
                    {module.lessons_count} уроков
                    {locked && <span className="ml-2 text-orange-500">• Тариф Платина</span>}
                  </div>
                </div>
                {!locked && <ChevronRight className="w-5 h-5 text-zinc-500" />}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

