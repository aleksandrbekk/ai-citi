import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expandWebApp } from './lib/telegram'
import { checkWhitelist, getOrCreateUser, getUserTariffs } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import AccessDenied from './components/AccessDenied'
import Login from './pages/Login'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
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
import CuratorReview from './pages/CuratorReview'
import CarouselIndex from './pages/agents/carousel/index'
import CarouselSettings from './pages/agents/carousel/settings'
import CarouselContent from './pages/agents/carousel/content'
import CarouselGenerating from './pages/agents/carousel/generating'
import CarouselResult from './pages/agents/carousel/result'

const queryClient = new QueryClient()

function App() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const setTariffs = useAuthStore((state) => state.setTariffs)

  useEffect(() => {
    expandWebApp()
  }, [])

  useEffect(() => {
    const checkAccess = async () => {
      let telegramUser: any = null

      // Проверяем Telegram Mini App
      const tg = window.Telegram?.WebApp
      if (tg?.initDataUnsafe?.user) {
        telegramUser = tg.initDataUnsafe.user
      } else {
        // Проверяем localStorage (веб-авторизация)
        const savedUser = localStorage.getItem('tg_user')
        if (savedUser) {
          try {
            telegramUser = JSON.parse(savedUser)
          } catch {}
        }
      }

      if (telegramUser?.id) {
        // Проверяем whitelist
        const allowed = await checkWhitelist(telegramUser.id)
        
        if (allowed) {
          // Создаём или получаем пользователя из базы
          const user = await getOrCreateUser(telegramUser)
          
          // Загружаем тарифы пользователя
          if (user?.id) {
            const tariffs = await getUserTariffs(user.id)
            setTariffs(tariffs)
          }
        }
        
        setHasAccess(allowed)
      } else {
        setHasAccess(null)
      }
      
      setIsChecking(false)
    }

    checkAccess()
  }, [])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Загрузка...</p>
      </div>
    )
  }

  // Нет авторизации вообще (ни TG Mini App, ни localStorage)
  const tg = window.Telegram?.WebApp
  const savedUser = localStorage.getItem('tg_user')
  if (!tg?.initDataUnsafe?.user?.id && !savedUser) {
    return <Login />
  }

  if (hasAccess === false) {
    return <AccessDenied />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/curator" element={<CuratorReview />} />
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
            <Route path="agents/carousel" element={<CarouselIndex />} />
            <Route path="agents/carousel/settings" element={<CarouselSettings />} />
            <Route path="agents/carousel/content" element={<CarouselContent />} />
            <Route path="agents/carousel/generating" element={<CarouselGenerating />} />
            <Route path="agents/carousel/result" element={<CarouselResult />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
