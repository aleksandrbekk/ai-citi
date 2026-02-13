import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../../../hooks/admin/useAdminAuth'
import { Users, FileText, Layers, Link2 } from 'lucide-react'

export function MlmDashboard() {
  const admin = useAdminAuth((s) => s.admin)
  const navigate = useNavigate()

  const sections = [
    {
      label: 'Модули',
      icon: Layers,
      path: '/admin/mlm/modules',
      color: 'from-orange-400 to-orange-500',
    },
    {
      label: 'Ученики',
      icon: Users,
      path: '/admin/mlm/students',
      color: 'from-cyan-400 to-cyan-500',
    },
    {
      label: 'Проверка ДЗ',
      icon: FileText,
      path: '/admin/mlm/homework',
      color: 'from-amber-400 to-amber-500',
    },
    {
      label: 'Ссылки доступа',
      icon: Link2,
      path: '/admin/mlm/invite-links',
      color: 'from-cyan-400 to-cyan-500',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        Добро пожаловать, {admin?.name || 'Администратор'}!
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <button
            key={s.path}
            onClick={() => navigate(s.path)}
            className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all cursor-pointer text-left"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
              <s.icon className="w-6 h-6 text-white" />
            </div>
            <div className="font-semibold text-gray-900 text-lg">{s.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
