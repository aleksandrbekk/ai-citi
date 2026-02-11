import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  BookOpen,
  UserCheck,
  ClipboardCheck,
  ChevronDown,
  ChevronRight,
  LogOut,
  HelpCircle,
  Zap,
  Palette
} from 'lucide-react'
import { useState } from 'react'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminSidebar() {
  const location = useLocation()
  const logout = useAdminAuth((s) => s.logout)
  const [schoolOpen, setSchoolOpen] = useState(
    location.pathname.startsWith('/admin/mlm')
  )

  const mainLinks = [
    { to: '/admin', icon: Users, label: 'CRM' },
    { to: '/admin/quizzes', icon: HelpCircle, label: 'Квизы' },
    { to: '/admin/carousel-styles', icon: Palette, label: 'Карусели' },
    { to: '/admin/ai-engine', icon: Zap, label: 'AI Engine' },
  ]

  const schoolLinks = [
    { to: '/admin/mlm', icon: LayoutDashboard, label: 'Обзор' },
    { to: '/admin/mlm/modules', icon: BookOpen, label: 'Модули' },
    { to: '/admin/mlm/students', icon: UserCheck, label: 'Ученики' },
    { to: '/admin/mlm/homework', icon: ClipboardCheck, label: 'Проверка ДЗ' },
  ]

  const bottomLinks = [
    { to: '/admin/settings', icon: Settings, label: 'Настройки' },
  ]

  const isSchoolActive = location.pathname.startsWith('/admin/mlm')

  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-screen sticky top-0">
      {/* Логотип */}
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white">AI CITI</h1>
        <p className="text-zinc-500 text-sm">Админ-панель</p>
      </div>

      {/* Навигация */}
      <nav className="flex-1 p-4 space-y-1">
        {mainLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}

        {/* Школа (Курс) - раскрывающийся */}
        <div className="pt-2">
          <button
            onClick={() => setSchoolOpen(!schoolOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${isSchoolActive
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5" />
              Школа
            </div>
            {schoolOpen ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {schoolOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {schoolLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/admin/mlm'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`
                  }
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Разделитель */}
        <div className="my-4 border-t border-zinc-800" />

        {/* Дополнительные разделы */}
        {bottomLinks.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-blue-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Выход */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={() => {
            logout()
            window.location.href = '/admin/login'
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Выйти
        </button>
      </div>
    </aside>
  )
}
