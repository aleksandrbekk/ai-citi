import { Link, useLocation } from 'react-router-dom'
import { Map, User, Target, Bot, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'

const navItems = [
  { path: '/', icon: Map, label: 'Город' },
  { path: '/agents', icon: Bot, label: 'Агенты' },
  { path: '/school', icon: GraduationCap, label: 'Школа' },
  { path: '/missions', icon: Target, label: 'Миссии' },
  { path: '/profile', icon: User, label: 'Профиль' },
]

export function BottomNav() {
  const location = useLocation()
  const isKeyboardOpen = useUIStore((s) => s.isKeyboardOpen)

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-800 transition-transform duration-200 ${
      isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
    }`}>
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
                isActive 
                  ? "text-amber-400" 
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}





