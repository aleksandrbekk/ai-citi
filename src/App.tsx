import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expandWebApp } from './lib/telegram'
import { checkWhitelist } from './lib/supabase'
import AccessDenied from './components/AccessDenied'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import Profile from '@/pages/Profile'
import { Agents } from '@/pages/Agents'
import { Missions } from '@/pages/Missions'
import { Shop } from '@/pages/Shop'
import PosterDashboard from '@/pages/tools/poster'
import PosterCreate from '@/pages/tools/poster/create'
import PosterEdit from '@/pages/tools/poster/edit'
import PosterCalendar from '@/pages/tools/poster/calendar'
import SchoolIndex from '@/pages/school/index'
import TariffPage from '@/pages/school/TariffPage'
import ModulePage from '@/pages/school/ModulePage'
import LessonPage from '@/pages/school/LessonPage'

const queryClient = new QueryClient()

function App() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    expandWebApp()
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg?.initDataUnsafe?.user?.id) {
      checkWhitelist(tg.initDataUnsafe.user.id).then(setHasAccess)
    } else {
      // Для веб-версии без Telegram - пока блокируем
      setHasAccess(false)
    }
  }, [])

  if (hasAccess === null) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Проверка доступа...</p>
      </div>
    )
  }

  if (hasAccess === false) {
    return <AccessDenied />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<Profile />} />
            <Route path="agents" element={<Agents />} />
            <Route path="school" element={<SchoolIndex />} />
            <Route path="school/:tariffSlug" element={<TariffPage />} />
            <Route path="school/:tariffSlug/:moduleId" element={<ModulePage />} />
            <Route path="school/:tariffSlug/:moduleId/lesson/:lessonId" element={<LessonPage />} />
            <Route path="missions" element={<Missions />} />
            <Route path="shop" element={<Shop />} />
            <Route path="tools/poster" element={<PosterDashboard />} />
            <Route path="tools/poster/create" element={<PosterCreate />} />
            <Route path="tools/poster/calendar" element={<PosterCalendar />} />
            <Route path="tools/poster/:id/edit" element={<PosterEdit />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
