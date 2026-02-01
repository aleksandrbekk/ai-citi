import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { HomeIcon, UserIcon } from '@/components/ui/icons'
import { Shield } from 'lucide-react'
import { useState, useEffect } from 'react'
import { isAdmin as checkIsAdmin } from '@/config/admins'
import { haptic } from '@/lib/haptic'

export function BottomNav() {
  const location = useLocation()
  const isKeyboardOpen = useUIStore((s) => s.isKeyboardOpen)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    let telegramId = tg?.initDataUnsafe?.user?.id

    if (!telegramId && savedUser) {
      try {
        telegramId = JSON.parse(savedUser).id
      } catch {
        // ignore
      }
    }

    if (checkIsAdmin(telegramId)) {
      setIsAdmin(true)
    }
  }, [])

  // Скрываем навигацию на страницах где она мешает
  if (
    location.pathname.startsWith('/quiz/') ||
    location.pathname.startsWith('/carousel-designs') ||
    location.pathname.startsWith('/agents/carousel') ||
    location.pathname.startsWith('/admin')
  ) {
    return null
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 nav-glass transition-transform duration-200 safe-bottom ${isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}>
      <div className="flex items-center justify-around h-16 px-2">
        {/* Главная — только для админов */}
        {isAdmin && (
          <Link
            to="/"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname === '/'
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <HomeIcon size={22} className={location.pathname === '/' ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-medium">Главная</span>
          </Link>
        )}

        {/* Профиль */}
        <Link
          to="/profile"
          onClick={() => haptic.tap()}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
            location.pathname === '/profile'
              ? "text-orange-500"
              : "text-gray-400 hover:text-gray-600"
          )}
        >
          <UserIcon size={22} className={location.pathname === '/profile' ? 'text-orange-500' : ''} />
          <span className="text-[10px] font-medium">Профиль</span>
        </Link>

        {/* Магазин — скрыт */}

        {/* Админ - только для админов */}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname.startsWith('/admin')
                ? "text-amber-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Shield size={22} className={location.pathname.startsWith('/admin') ? 'text-amber-500' : ''} />
            <span className="text-[10px] font-medium">Админ</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
