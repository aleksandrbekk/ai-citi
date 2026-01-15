import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/hooks/useAuth'
import { LoaderIcon } from '@/components/ui/icons'

export function Layout() {
  const { isLoading } = useAuth()

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
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 flex flex-col pt-[100px]">
      <main className="flex-1 overflow-auto">
        <div className="pb-20">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
