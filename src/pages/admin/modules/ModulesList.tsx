import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useModules } from '../../../hooks/admin/useModules'
import { Switch } from '../../../components/ui/switch'
import { Plus, BookOpen } from 'lucide-react'

export function ModulesList() {
  const navigate = useNavigate()
  const { modules, isLoading, error, updateModule } = useModules()
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())

  const getTariffLabel = (tariff: string) => {
    return tariff === 'platinum' ? 'Platinum' : 'Standard'
  }

  const handleToggleActive = async (moduleId: string, currentActive: boolean) => {
    setTogglingIds(prev => new Set(prev).add(moduleId))

    const success = await updateModule(moduleId, { is_active: !currentActive })

    if (!success) {
      console.error('Failed to update module active status')
    }

    setTogglingIds(prev => {
      const next = new Set(prev)
      next.delete(moduleId)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Ошибка загрузки модулей</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Модули курса</h1>
        <button
          onClick={() => navigate('/admin/mlm/modules/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Добавить модуль
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules?.map((module) => (
          <div
            key={module.id}
            className="bg-zinc-800 rounded-xl p-6 hover:bg-zinc-750 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen size={24} className="text-blue-500" />
                <h2 className="text-xl font-semibold text-white">{module.title}</h2>
              </div>
            </div>

            {module.description && (
              <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                {module.description}
              </p>
            )}

            <div className="flex items-center justify-between text-sm mb-4">
              <div className="text-zinc-400">
                Уроков: <span className="text-white font-semibold">{module.lessons_count}</span>
              </div>
              <div className="text-zinc-400">
                Тариф: <span className="text-white font-semibold">{getTariffLabel(module.min_tariff)}</span>
              </div>
            </div>

            <div className="text-xs text-zinc-500 mb-4">
              Порядок: {module.order_index}
            </div>

            {/* Переключатель активности */}
            <div className="flex items-center justify-between mb-4 py-2 px-3 bg-zinc-700/50 rounded-lg">
              <span className="text-sm text-zinc-300">
                {module.is_active ? 'Активен' : 'Неактивен'}
              </span>
              <Switch
                checked={module.is_active}
                onCheckedChange={() => handleToggleActive(module.id, module.is_active)}
                disabled={togglingIds.has(module.id)}
              />
            </div>

            <button
              onClick={() => navigate(`/admin/mlm/modules/${module.id}`)}
              className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
            >
              Редактировать
            </button>
          </div>
        ))}

        {modules?.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-400">
            Модули не найдены
          </div>
        )}
      </div>
    </div>
  )
}
