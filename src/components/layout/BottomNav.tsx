import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { CityIcon, SchoolIcon, BotIcon, ShopIcon, UserIcon } from '@/components/ui/icons'
import { Shield } from 'lucide-react'
import { useState, useEffect } from 'react'

// ID администраторов
const ADMIN_IDS = [643763835, 190202791, 1762872372]

const navItems = [
  { path: '/', Icon: CityIcon, label: 'Город' },
  { path: '/school', Icon: SchoolIcon, label: 'Школа' },
  { path: '/agents', Icon: BotIcon, label: 'Агенты' },
  { path: '/shop', Icon: ShopIcon, label: 'Магазин' },
  { path: '/profile', Icon: UserIcon, label: 'Профиль' },
]

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

    if (telegramId && ADMIN_IDS.includes(telegramId)) {
      setIsAdmin(true)
    }
  }, [])

  // Скрываем навигацию на страницах где она мешает
  if (
    location.pathname.startsWith('/quiz/') ||
    location.pathname.startsWith('/carousel-designs') ||
    location.pathname.startsWith('/agents/carousel') ||
    location.pathname.startsWith('/admin')  // Скрываем в админке
  ) {
    return null
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 nav-glass transition-transform duration-200 safe-bottom ${isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}>
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const { Icon } = item

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
                isActive
                  ? "text-orange-500"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={22} className={isActive ? 'text-orange-500' : ''} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}

        {/* Кнопка Админ - только для админов */}
        {isAdmin && (
          <Link
            to="/admin"
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

