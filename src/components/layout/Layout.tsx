import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { isMobileTelegram } from '@/lib/telegram'

export function Layout() {
  const { isLoading } = useAuth()
  const isMobile = isMobileTelegram()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400">Загрузка...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Фиксированная шапка только для мобильного Telegram */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-[100px] bg-black z-50" />
      )}
      
      <main className="flex-1 overflow-auto">
        <div className={`${isMobile ? 'pt-[100px]' : 'pt-4'} pb-20`}>
          <Outlet />
        </div>
      </main>
      
      <BottomNav />
    </div>
  )
}











