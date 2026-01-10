import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { isMobileTelegram } from '@/lib/telegram'
import { LoaderIcon } from '@/components/ui/icons'

export function Layout() {
  const { isLoading } = useAuth()
  const isMobile = isMobileTelegram()
  const location = useLocation()

  // На страницах каруселей не нужен отступ сверху — там своя шапка
  const isCarouselPage = location.pathname.startsWith('/agents/carousel')

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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 flex flex-col">
      {/* Фиксированная шапка для мобильного Telegram — плавный градиент без границы */}
      {isMobile && !isCarouselPage && (
        <div
          className="fixed top-0 left-0 right-0 h-[100px] z-50 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 70%, rgba(255,255,255,0) 100%)'
          }}
        />
      )}

      <main className="flex-1 overflow-auto">
        <div className={`${isMobile && !isCarouselPage ? 'pt-[100px]' : 'pt-0'} pb-20`}>
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
