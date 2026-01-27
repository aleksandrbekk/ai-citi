import { useEffect, useCallback } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { LoaderIcon } from '@/components/ui/icons'
import { useUtmTracking } from '@/hooks/useUtmTracking'
import { useAuthStore } from '@/store/authStore'

export function Layout() {
  const { isLoading } = useAuth()
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === '/'

  // UTM трекинг
  useUtmTracking(user?.telegram_id)

  // Telegram BackButton — показываем на всех страницах кроме главной
  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    if (isHomePage) {
      tg.BackButton.hide()
    } else {
      tg.BackButton.show()
      tg.BackButton.onClick(handleBack)
    }

    return () => {
      tg.BackButton.offClick(handleBack)
    }
  }, [isHomePage, handleBack])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon size={48} className="text-orange-500" />
          <span className="text-gray-500">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <main className={`flex-1 overflow-auto ${isHomePage ? 'h-screen overflow-hidden' : ''}`}>
        <div className={isHomePage ? '' : 'pb-20'}>
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
