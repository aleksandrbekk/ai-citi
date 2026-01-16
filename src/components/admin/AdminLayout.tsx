import { useState, useEffect } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
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
  ChevronDown
} from 'lucide-react'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'

export function AdminLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [schoolOpen, setSchoolOpen] = useState(false)
  const location = useLocation()
  const logout = useAdminAuth((s) => s.logout)

  // Проверяем TMA на мобильном
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const needsTopPadding = isTMA && isMobile

  // Делаем body тёмным для админки
  useEffect(() => {
    document.body.style.backgroundColor = '#09090b'
    document.documentElement.style.backgroundColor = '#09090b'
    return () => {
      document.body.style.backgroundColor = ''
      document.documentElement.style.backgroundColor = ''
    }
  }, [])

  const mainLinks = [
    { to: '/admin', icon: Users, label: 'CRM' },
    { to: '/admin/quizzes', icon: HelpCircle, label: 'Квизы' },
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
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden" style={{ backgroundColor: '#09090b', overscrollBehavior: 'none' }}>
      {/* Safe area background for iOS TMA only - TOP */}
      {needsTopPadding && (
        <div className="lg:hidden fixed top-0 left-0 right-0 h-[100px] z-40" style={{ backgroundColor: '#09090b' }} />
      )}

      {/* Safe area background for iOS TMA only - BOTTOM */}
      {needsTopPadding && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-[50px] z-40" style={{ backgroundColor: '#09090b' }} />
      )}

      {/* Mobile Header */}
      <header className={`lg:hidden sticky top-0 z-50 ${needsTopPadding ? 'pt-[100px]' : ''}`} style={{ backgroundColor: '#18181b' }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">AI CITI</h1>
            <p className="text-xs text-zinc-500">Админ-панель</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-zinc-800 text-white"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-zinc-900 border-b border-zinc-800 shadow-xl max-h-[70vh] overflow-y-auto">
            <nav className="p-4 space-y-2">
              {mainLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/admin'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
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
                  isSchoolActive ? 'bg-zinc-800 text-white' : 'text-zinc-400'
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
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800'
                        }`
                      }
                    >
                      <link.icon className="w-4 h-4" />
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              )}

              <div className="my-2 border-t border-zinc-800" />

              <NavLink
                to="/admin/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-800'
                  }`
                }
              >
                <Settings className="w-5 h-5" />
                Настройки
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                Выйти
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex" style={{ backgroundColor: '#09090b' }}>
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-zinc-900 border-r border-zinc-800 flex-col h-screen sticky top-0">
          <div className="p-6 border-b border-zinc-800">
            <h1 className="text-xl font-bold text-white">AI CITI</h1>
            <p className="text-zinc-500 text-sm">Админ-панель</p>
          </div>

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

            <div className="pt-2">
              <button
                onClick={() => setSchoolOpen(!schoolOpen)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                  isSchoolActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800'
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
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800'
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

            <div className="my-4 border-t border-zinc-800" />

            <NavLink
              to="/admin/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-400 hover:bg-zinc-800'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Настройки
            </NavLink>
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Выйти
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen bg-zinc-950 overflow-x-hidden" style={{ backgroundColor: '#09090b' }}>
          <div className={`p-4 lg:p-6 text-white max-w-full overflow-x-hidden ${needsTopPadding ? 'pb-[70px]' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
