import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { LoaderIcon } from '@/components/ui/icons'
import { useUtmTracking } from '@/hooks/useUtmTracking'
import { useAuthStore } from '@/store/authStore'

export function Layout() {
  const { isLoading } = useAuth()
  const user = useAuthStore((state) => state.user)

  // UTM трекинг
  useUtmTracking(user?.telegram_id)

  // Проверяем, запущено ли в Telegram Mini App на мобильном
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const needsPadding = isTMA && isMobile

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon size={48} className="text-orange-500" />
          <span className="text-gray-500">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 flex flex-col ${needsPadding ? 'pt-[100px]' : ''}`}>
      <main className="flex-1 overflow-auto">
        <div className="pb-20">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
