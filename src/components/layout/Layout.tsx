import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { LoaderIcon } from '@/components/ui/icons'
import { useUtmTracking } from '@/hooks/useUtmTracking'
import { useAuthStore } from '@/store/authStore'
import { TelegramHeaderLogo } from '@/components/TelegramHeaderLogo'
import { isMobileTelegram } from '@/lib/telegram'

export function Layout() {
  const { isLoading } = useAuth()
  const user = useAuthStore((state) => state.user)
  const location = useLocation()
  const isHomePage = location.pathname === '/'

  // UTM трекинг
  useUtmTracking(user?.telegram_id)

  // Проверяем, запущено ли в Telegram Mini App на мобильном
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const needsPadding = isTMA && isMobile && !isHomePage
  const showTelegramHeaderLogo = isTMA && isMobileTelegram()

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

  // Вычисляем отступ для контента от нижней части логотипа
  // ТОЛЬКО на мобильных устройствах, где показывается логотип
  // Логотип: top = calc(env(safe-area-inset-top, 0px) + 65px), height = 58px
  // Нижняя граница логотипа: safe-area-top + 65px + 58px = safe-area-top + 123px
  // Добавляем отступ после логотипа (уменьшен на 20%: было 20px, стало 16px)
  // Итого: safe-area-top + 114px (уменьшено на 20% от 143px)
  // На десктопе - без отступа (0px)
  const logoBottomOffset = showTelegramHeaderLogo 
    ? 'calc(env(safe-area-inset-top, 0px) + 114px)' 
    : '0px'

  return (
    <div className={`min-h-screen bg-white text-gray-900 flex flex-col ${needsPadding && !showTelegramHeaderLogo ? 'pt-[100px]' : ''}`}>
      {/* Логотип между кнопками "Закрыть" и "..." в Telegram header (только fullscreen mobile) */}
      {showTelegramHeaderLogo && <TelegramHeaderLogo />}
      
      <main 
        className={`flex-1 overflow-auto ${isHomePage ? 'h-screen overflow-hidden' : ''}`}
        style={{
          paddingTop: logoBottomOffset
        }}
      >
        <div className={isHomePage ? '' : 'pb-20'}>
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
