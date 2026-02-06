import { useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  HelpCircle,
  GraduationCap,
  Settings,
  LogOut,
  LayoutDashboard,
  Home,
  Palette,
  BookOpen,
  UserCheck,
  ClipboardCheck
} from 'lucide-react'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminLayout() {

  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAdminAuth((s) => s.logout)

  // Делаем body светлым для админки
  useEffect(() => {
    document.body.style.backgroundColor = '#ffffff'
    document.documentElement.style.backgroundColor = '#ffffff'
    return () => {
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    }
  }, [])

  // Telegram BackButton — показываем на всех страницах админки
  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    tg.BackButton.show()
    tg.BackButton.onClick(handleBack)

    return () => {
      tg.BackButton.offClick(handleBack)
    }
  }, [handleBack])

  const isSchoolActive = location.pathname.startsWith('/admin/mlm')

  const handleLogout = () => {
    logout()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Mobile Header - без меню, только хедер */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg bg-orange-500 text-white"
            >
              <Home size={20} />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Админ-панель</h1>
          </div>
          {/* Кнопка на дашборд с плитками */}
          <Link
            to="/admin"
            className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <LayoutDashboard size={20} />
          </Link>
        </div>
      </header>

      <div className="flex bg-white">
        {/* Desktop Sidebar - Fixed позиция */}
        <aside className="hidden lg:flex w-64 bg-gray-50 border-r border-gray-200 flex-col h-screen fixed top-0 left-0 overflow-hidden z-40">
          <div className="shrink-0 p-5 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Home size={18} />
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Админ-панель</h1>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
            {/* CRM */}
            <NavLink
              to="/admin/crm"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 ring-2 ring-orange-300'
                  : 'bg-gradient-to-r from-orange-400 to-orange-500'
                }`
              }
            >
              <Users className="w-5 h-5" />
              CRM
            </NavLink>

            {/* Квизы */}
            <NavLink
              to="/admin/quizzes"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-600 ring-2 ring-cyan-300'
                  : 'bg-gradient-to-r from-cyan-400 to-teal-500'
                }`
              }
            >
              <HelpCircle className="w-5 h-5" />
              Квизы
            </NavLink>

            {/* Карусели */}
            <NavLink
              to="/admin/carousel-styles"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 ring-2 ring-rose-300'
                  : 'bg-gradient-to-r from-orange-400 to-rose-400'
                }`
              }
            >
              <Palette className="w-5 h-5" />
              Карусели
            </NavLink>

            {/* Школа */}
            <NavLink
              to="/admin/mlm"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive || isSchoolActive
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-600 ring-2 ring-teal-300'
                  : 'bg-gradient-to-r from-teal-400 to-cyan-500'
                }`
              }
            >
              <GraduationCap className="w-5 h-5" />
              Школа
            </NavLink>

            {/* Подпункты Школы */}
            {isSchoolActive && (
              <div className="ml-3 space-y-1">
                <NavLink
                  to="/admin/mlm/modules"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <BookOpen className="w-4 h-4" />
                  Модули
                </NavLink>
                <NavLink
                  to="/admin/mlm/students"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <UserCheck className="w-4 h-4" />
                  Ученики
                </NavLink>
                <NavLink
                  to="/admin/mlm/homework"
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                      ? 'bg-teal-100 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Проверка ДЗ
                </NavLink>
              </div>
            )}

            {/* Настройки */}
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-white font-medium shadow-sm hover:shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] ${isActive
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600 ring-2 ring-gray-400'
                  : 'bg-gradient-to-r from-gray-400 to-gray-500'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Настройки
            </NavLink>
          </nav>

          <div className="shrink-0 p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </aside>

        {/* Main Content - с отступом под fixed sidebar */}
        <main className="flex-1 min-h-screen bg-white overflow-x-hidden lg:ml-64">
          <div className="p-4 lg:p-6 max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
