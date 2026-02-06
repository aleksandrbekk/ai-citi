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
  Palette
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
        {/* Desktop Sidebar - Плитки */}
        <aside className="hidden lg:flex w-72 bg-gray-50 border-r border-gray-200 flex-col h-screen sticky top-0">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                <Home size={18} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI CiTY</h1>
                <p className="text-gray-500 text-sm">Админ-панель</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 overflow-y-auto">
            {/* Сетка плиток 2x2 */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* CRM */}
              <NavLink
                to="/admin/crm"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isActive
                    ? 'bg-gradient-to-br from-orange-500 to-orange-700 ring-2 ring-orange-300'
                    : 'bg-gradient-to-br from-orange-400 to-orange-600'
                  }`
                }
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-semibold">CRM</span>
              </NavLink>

              {/* Квизы */}
              <NavLink
                to="/admin/quizzes"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isActive
                    ? 'bg-gradient-to-br from-cyan-500 to-teal-700 ring-2 ring-cyan-300'
                    : 'bg-gradient-to-br from-cyan-400 to-teal-600'
                  }`
                }
              >
                <HelpCircle className="w-6 h-6" />
                <span className="text-sm font-semibold">Квизы</span>
              </NavLink>

              {/* Карусели */}
              <NavLink
                to="/admin/carousel-styles"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isActive
                    ? 'bg-gradient-to-br from-orange-500 to-rose-600 ring-2 ring-rose-300'
                    : 'bg-gradient-to-br from-orange-400 to-rose-500'
                  }`
                }
              >
                <Palette className="w-6 h-6" />
                <span className="text-sm font-semibold">Карусели</span>
              </NavLink>

              {/* Школа */}
              <NavLink
                to="/admin/mlm"
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isActive || isSchoolActive
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-700 ring-2 ring-teal-300'
                    : 'bg-gradient-to-br from-teal-400 to-cyan-600'
                  }`
                }
              >
                <GraduationCap className="w-6 h-6" />
                <span className="text-sm font-semibold">Школа</span>
              </NavLink>
            </div>

            {/* Настройки */}
            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 ${isActive
                  ? 'bg-gradient-to-br from-gray-500 to-gray-700 ring-2 ring-gray-300'
                  : 'bg-gradient-to-br from-gray-400 to-gray-600'
                }`
              }
            >
              <Settings className="w-6 h-6" />
              <span className="text-sm font-semibold">Настройки</span>
            </NavLink>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen bg-white overflow-x-hidden">
          <div className="p-4 lg:p-6 max-w-full overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
