import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'

export function Layout() {
  const { isLoading } = useAuth()

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
    <div className="h-[var(--tg-viewport-stable-height,100vh)] flex flex-col bg-zinc-950 text-white overflow-hidden">
      <main className="flex-1 overflow-auto safe-top">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}











