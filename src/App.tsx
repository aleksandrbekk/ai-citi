import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expandWebApp } from './lib/telegram'
import { checkWhitelist, getOrCreateUser, getUserTariffs } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import AccessDenied from './components/AccessDenied'
import Login from './pages/Login'
import PasswordLogin from './pages/PasswordLogin'
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
import QuizzesDashboard from './pages/quizzes/index'
import QuizBuilder from './pages/quizzes/builder'
import TakeQuiz from './pages/quizzes/take'
import QuizAnalytics from './pages/quizzes/analytics'
import AdminPanel from './pages/admin/index'
import CarouselDesignsPage from './pages/carousel-designs/index'

const queryClient = new QueryClient()

function AppContent() {
  const location = useLocation()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const setTariffs = useAuthStore((state) => state.setTariffs)

  // Проверяем, является ли текущий путь страницей прохождения квиза или просмотра дизайнов
  const isPublicPage = location.pathname.startsWith('/quiz/') || location.pathname.startsWith('/carousel-designs')
  // Админка и куратор - отдельные страницы, не требуют публичного доступа
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/curator')

  useEffect(() => {
    expandWebApp()
  }, [])

  useEffect(() => {
    // Если это публичная страница, пропускаем проверку авторизации
    if (isPublicPage) {
      setIsChecking(false)
      setHasAccess(true)
      return
    }

    // Для админки и куратора - пропускаем проверку whitelist, но проверяем авторизацию
    if (isAdminPage) {
      const isPasswordAuth = sessionStorage.getItem('app_authenticated') === 'true'
      const tg = window.Telegram?.WebApp
      const savedUser = localStorage.getItem('tg_user')
      
      if (isPasswordAuth || tg?.initDataUnsafe?.user?.id || savedUser) {
        setIsChecking(false)
        setHasAccess(true)
      } else {
        setIsChecking(false)
        setHasAccess(null) // Покажет форму входа
      }
      return
    }

    const checkAccess = async () => {
      // Проверяем пароль для главной страницы (если не авторизован через пароль)
      const isPasswordAuth = sessionStorage.getItem('app_authenticated') === 'true'
      
      // Если нет парольной авторизации, проверяем Telegram
      if (!isPasswordAuth) {
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
      } else {
        // Парольная авторизация прошла успешно
        setHasAccess(true)
      }
      
      setIsChecking(false)
    }

    checkAccess()
  }, [isPublicPage, isAdminPage, setTariffs])

  if (isChecking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white">Загрузка...</p>
      </div>
    )
  }

  // Если это публичная страница, показываем сразу
  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/quiz/:id" element={<TakeQuiz />} />
          <Route path="/carousel-designs" element={<CarouselDesignsPage />} />
        </Routes>
      </QueryClientProvider>
    )
  }

  // Проверяем парольную авторизацию для главной страницы
  const isPasswordAuth = sessionStorage.getItem('app_authenticated') === 'true'
  
  // Админские Telegram ID (исключения из редиректа)
  const ADMIN_TELEGRAM_IDS = [190202791, 643763835]
  
  // Редирект на Telegram для главной страницы (только в обычном браузере, НЕ в Telegram Mini App)
  useEffect(() => {
    const isMainPage = location.pathname === '/' || location.pathname === ''
    const tgWebApp = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    const telegramRedirect = import.meta.env.VITE_TELEGRAM_REDIRECT_URL || 'https://t.me/aleksandrbekk'
    
    // ВАЖНО: Если открыто через Telegram Mini App - НЕ делать редирект
    const isInTelegramMiniApp = !!tgWebApp
    
    // Проверяем, является ли пользователь админом
    let telegramUserId: number | null = null
    if (tgWebApp?.initDataUnsafe?.user?.id) {
      telegramUserId = tgWebApp.initDataUnsafe.user.id
    } else if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        telegramUserId = parsed.id
      } catch {}
    }
    
    const isAdmin = telegramUserId && ADMIN_TELEGRAM_IDS.includes(telegramUserId)
    
    // Редирект только если:
    // 1. Это главная страница
    // 2. НЕ открыто через Telegram Mini App
    // 3. Нет парольной авторизации
    // 4. Пользователь НЕ админ
    // 5. Нет Telegram пользователя и нет сохраненного пользователя
    const hasTelegramUser = tgWebApp?.initDataUnsafe?.user?.id
    if (isMainPage && !isInTelegramMiniApp && !isPasswordAuth && !isAdmin && !hasTelegramUser && !savedUser) {
      window.location.href = telegramRedirect
    }
  }, [location.pathname, isPasswordAuth])
  
  // Нет авторизации вообще (ни пароль, ни TG Mini App, ни localStorage)
  const tg = window.Telegram?.WebApp
  const savedUser = localStorage.getItem('tg_user')
  const isInTelegramMiniApp = !!tg
  
  // Проверяем, является ли пользователь админом (для главной страницы)
  let telegramUserId: number | null = null
  if (tg?.initDataUnsafe?.user?.id) {
    telegramUserId = tg.initDataUnsafe.user.id
  } else if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser)
      telegramUserId = parsed.id
    } catch {}
  }
  const isAdmin = telegramUserId && ADMIN_TELEGRAM_IDS.includes(telegramUserId)
  
  if (!isPasswordAuth && !tg?.initDataUnsafe?.user?.id && !savedUser) {
    // Для админки и куратора - показываем форму входа
    if (isAdminPage) {
      return <Login />
    }
    
    // Для главной страницы
    if (location.pathname === '/' || location.pathname === '') {
      // Если открыто через Telegram Mini App - показываем Login (не редирект)
      if (isInTelegramMiniApp) {
        return <Login />
      }
      // Если админ в обычном браузере - показываем форму пароля
      if (isAdmin) {
        return <PasswordLogin />
      }
      // Для не-админов в обычном браузере - показываем загрузку (редирект в useEffect)
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Перенаправление на Telegram...</p>
          </div>
        </div>
      )
    }
    return <Login />
  }

  if (hasAccess === false) {
    return <AccessDenied />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route path="/curator" element={<CuratorReview />} />
        <Route path="/admin" element={<AdminPanel />} />
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
          <Route path="quizzes" element={<QuizzesDashboard />} />
          <Route path="quizzes/builder" element={<QuizBuilder />} />
          <Route path="quizzes/builder/:id" element={<QuizBuilder />} />
          <Route path="quizzes/:id/analytics" element={<QuizAnalytics />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
