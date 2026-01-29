import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Users,
  HelpCircle,
  GraduationCap,
  Settings,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  UserCheck,
  ClipboardCheck,
  ChevronDown,
  Home,
  Cpu
} from 'lucide-react'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [schoolOpen, setSchoolOpen] = useState(false)
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

  const mainLinks = [
    { to: '/admin', icon: Users, label: 'CRM' },
    { to: '/admin/quizzes', icon: HelpCircle, label: 'Квизы' },
    { to: '/admin/ai-analytics', icon: Cpu, label: 'AI Аналитика' },
  ]

  const schoolLinks = [
    { to: '/admin/mlm', icon: LayoutDashboard, label: 'Обзор' },
    { to: '/admin/mlm/modules', icon: BookOpen, label: 'Модули' },
    { to: '/admin/mlm/students', icon: UserCheck, label: 'Ученики' },
    { to: '/admin/mlm/homework', icon: ClipboardCheck, label: 'Проверка ДЗ' },
  ]

  const isSchoolActive = location.pathname.startsWith('/admin/mlm')

  const handleLogout = () => {
    logout()
    window.location.href = '/admin/login'
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden" style={{ overscrollBehavior: 'none' }}>
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-2 rounded-lg bg-orange-500 text-white"
            >
              <Home size={20} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI CiTY</h1>
              <p className="text-xs text-gray-500">Админ-панель</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-gray-100 text-gray-700"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-xl max-h-[70vh] overflow-y-auto">
            <nav className="p-4 space-y-2">
              {/* Кнопка на главную */}
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-50 text-orange-600 border border-orange-200"
              >
                <Home className="w-5 h-5" />
                На главную
              </Link>

              <div className="my-2 border-t border-gray-200" />

              {mainLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/admin'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </NavLink>
              ))}

              {/* School dropdown */}
              <button
                onClick={() => setSchoolOpen(!schoolOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isSchoolActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5" />
                  Школа
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${schoolOpen ? 'rotate-180' : ''}`} />
              </button>

              {schoolOpen && (
                <div className="ml-4 space-y-1">
                  {schoolLinks.map(link => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/admin/mlm'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${isActive
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                        }`
                      }
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}

              <div className="my-2 border-t border-gray-200" />

              <NavLink
                to="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <Settings className="w-5 h-5" />
                Настройки
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex bg-white">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-gray-50 border-r border-gray-200 flex-col h-screen sticky top-0">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
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

          <nav className="flex-1 p-4 space-y-1">
            {mainLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            ))}

            <div className="pt-2">
              <button
                onClick={() => setSchoolOpen(!schoolOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isSchoolActive ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5" />
                  Школа
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${schoolOpen ? 'rotate-180' : ''}`} />
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
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
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

            <div className="my-4 border-t border-gray-200" />

            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Настройки
            </NavLink>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5" />
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
