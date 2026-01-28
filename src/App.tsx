import { useState, useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expandWebApp } from './lib/telegram'
import { getOrCreateUser, getUserTariffs, updateLastActive } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import AccessDenied from './components/AccessDenied'
import Login from './pages/Login'
import { Layout } from '@/components/layout/Layout'
import { PageLoader } from '@/components/ui/PageLoader'

// Быстрые страницы - обычный импорт
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import { Agents } from '@/pages/Agents'
import { Missions } from '@/pages/Missions'
import { Shop } from '@/pages/Shop'
import { Offer } from './pages/Offer'
import Chat from './pages/Chat'
import PaymentSuccess from './pages/PaymentSuccess'

// Lazy Loading - тяжёлые страницы грузятся по требованию
const Referrals = lazy(() => import('@/pages/Referrals'))
const ReferralDetail = lazy(() => import('@/pages/ReferralDetail'))

// Poster
const PosterDashboard = lazy(() => import('@/pages/tools/poster'))
const PosterCreate = lazy(() => import('@/pages/tools/poster/create'))
const PosterEdit = lazy(() => import('@/pages/tools/poster/edit'))
const PosterCalendar = lazy(() => import('@/pages/tools/poster/calendar'))

// School
const SchoolIndex = lazy(() => import('@/pages/school/index'))
const TariffPage = lazy(() => import('@/pages/school/TariffPage'))
const ModulePage = lazy(() => import('@/pages/school/ModulePage'))
const LessonPage = lazy(() => import('@/pages/school/LessonPage'))

// Curator
const CuratorReview = lazy(() => import('./pages/CuratorReview'))

// Carousel
const CarouselIndex = lazy(() => import('./pages/agents/carousel/index'))
const CarouselSettings = lazy(() => import('./pages/agents/carousel/settings'))
const CarouselContent = lazy(() => import('./pages/agents/carousel/content'))
const CarouselGenerating = lazy(() => import('./pages/agents/carousel/generating'))
const CarouselResult = lazy(() => import('./pages/agents/carousel/result'))
const CarouselDesignsPage = lazy(() => import('./pages/carousel-designs/index'))

// Karmalogik
const KarmalogikChat = lazy(() => import('./pages/agents/karmalogik'))

// Quizzes
const QuizzesDashboard = lazy(() => import('./pages/quizzes/index'))
const QuizBuilder = lazy(() => import('./pages/quizzes/builder'))
const TakeQuiz = lazy(() => import('./pages/quizzes/take'))
const QuizAnalytics = lazy(() => import('./pages/quizzes/analytics'))

// Admin (самая тяжёлая часть)
const AdminPanel = lazy(() => import('./pages/admin/index'))
const MiniAdmin = lazy(() => import('./pages/mini-admin/index'))
const DebugReferral = lazy(() => import('./pages/DebugReferral'))

// Admin imports - lazy
const AdminLayout = lazy(() => import('./components/admin').then(m => ({ default: m.AdminLayout })))
const AdminProtectedRoute = lazy(() => import('./components/admin').then(m => ({ default: m.AdminProtectedRoute })))
const AdminLogin = lazy(() => import('./pages/admin/Login').then(m => ({ default: m.AdminLogin })))
const AdminCRM = lazy(() => import('./pages/admin/CRM').then(m => ({ default: m.AdminCRM })))
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.AdminSettings })))
const MlmDashboard = lazy(() => import('./pages/admin/mlm/MlmDashboard').then(m => ({ default: m.MlmDashboard })))
const ModulesList = lazy(() => import('./pages/admin/modules/ModulesList').then(m => ({ default: m.ModulesList })))
const ModuleEdit = lazy(() => import('./pages/admin/modules/ModuleEdit').then(m => ({ default: m.ModuleEdit })))
const LessonEdit = lazy(() => import('./pages/admin/modules/LessonEdit').then(m => ({ default: m.LessonEdit })))
const StudentsList = lazy(() => import('./pages/admin/students/StudentsList').then(m => ({ default: m.StudentsList })))
const StudentCreate = lazy(() => import('./pages/admin/students/StudentCreate').then(m => ({ default: m.StudentCreate })))
const StudentEdit = lazy(() => import('./pages/admin/students/StudentEdit').then(m => ({ default: m.StudentEdit })))
const AdminHomeworkReview = lazy(() => import('./pages/admin/HomeworkReview'))
const AdminWhitelist = lazy(() => import('./pages/admin/Whitelist'))
const QuizzesList = lazy(() => import('./pages/admin/quizzes/QuizzesList').then(m => ({ default: m.QuizzesList })))
const AdminQuizBuilder = lazy(() => import('./pages/admin/quizzes/QuizBuilder'))
const AdminQuizAnalytics = lazy(() => import('./pages/admin/quizzes/QuizAnalytics'))
const AdminQuizImageEditor = lazy(() => import('./pages/admin/quizzes/QuizImageEditor').then(m => ({ default: m.AdminQuizImageEditor })))
const AiAnalytics = lazy(() => import('./pages/admin/AiAnalytics'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
      gcTime: 10 * 60 * 1000,   // 10 минут - кэш хранится
    },
  },
})

function AppContent() {
  const location = useLocation()
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [isChecking, setIsChecking] = useState(true)
  const setTariffs = useAuthStore((state) => state.setTariffs)
  const login = useAuthStore((state) => state.login)

  // Проверяем, является ли текущий путь страницей прохождения квиза или просмотра дизайнов
  const isPublicPage = location.pathname.startsWith('/quiz/') || location.pathname.startsWith('/carousel-designs') || location.pathname === '/offer' || location.pathname === '/debug-referral' || location.pathname === '/payment-success'

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
          } catch { }
        }
      }

      if (telegramUser?.id) {
        // Вызываем login() который использует Edge Function для создания пользователя
        // Edge Function правильно обрабатывает реферальные ссылки
        await login()

        // Проверяем существующего пользователя для тарифов
        const user = await getOrCreateUser(telegramUser)

        // Загружаем тарифы пользователя
        if (user?.id) {
          const tariffs = await getUserTariffs(user.id)
          setTariffs(tariffs)
        }

        // Обновляем время последней активности
        updateLastActive(telegramUser.id)

        // Всем разрешаем доступ к приложению
        setHasAccess(true)
      } else {
        setHasAccess(null)
      }

      setIsChecking(false)
    }

    checkAccess()
  }, [isPublicPage, setTariffs, login])

  if (isChecking) {
    return <PageLoader />
  }

  // Если это публичная страница, показываем сразу
  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/offer" element={<Offer />} />
            <Route path="/quiz/:id" element={<TakeQuiz />} />
            <Route path="/carousel-designs" element={<CarouselDesignsPage />} />
            <Route path="/debug-referral" element={<DebugReferral />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
          </Routes>
        </Suspense>
      </QueryClientProvider>
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
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/curator" element={<CuratorReview />} />
          <Route path="/admin" element={<AdminPanel />} />

          {/* ========== АДМИНКА ========== */}
          <Route path="/admin/login" element={<AdminLogin />} />

          <Route path="/admin" element={<AdminProtectedRoute />}>
            <Route element={<AdminLayout />}>
              {/* CRM */}
              <Route index element={<AdminCRM />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="ai-analytics" element={<AiAnalytics />} />
              <Route path="whitelist" element={<AdminWhitelist />} />
              <Route path="quizzes" element={<QuizzesList />} />
              <Route path="quizzes/new" element={<AdminQuizBuilder />} />
              <Route path="quizzes/:id" element={<AdminQuizBuilder />} />
              <Route path="quizzes/:id/edit" element={<AdminQuizBuilder />} />
              <Route path="quizzes/:id/analytics" element={<AdminQuizAnalytics />} />
              <Route path="quizzes/:id/images" element={<AdminQuizImageEditor />} />

              {/* МЛМ Лагерь */}
              <Route path="mlm" element={<MlmDashboard />} />
              <Route path="mlm/modules" element={<ModulesList />} />
              <Route path="mlm/modules/:id" element={<ModuleEdit />} />
              <Route path="mlm/modules/:moduleId/lessons/:lessonId" element={<LessonEdit />} />
              <Route path="mlm/students" element={<StudentsList />} />
              <Route path="mlm/students/new" element={<StudentCreate />} />
              <Route path="mlm/students/:id" element={<StudentEdit />} />
              <Route path="mlm/homework" element={<AdminHomeworkReview />} />
            </Route>
          </Route>

          <Route path="/mini-admin" element={<MiniAdmin />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/debug-referral" element={<DebugReferral />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<Profile />} />
            <Route path="referrals" element={<Referrals />} />
            <Route path="referral/:id" element={<ReferralDetail />} />
            <Route path="settings" element={<Settings />} />
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
            <Route path="agents/karmalogik" element={<KarmalogikChat />} />
            <Route path="quizzes" element={<QuizzesDashboard />} />
            <Route path="quizzes/builder" element={<QuizBuilder />} />
            <Route path="quizzes/builder/:id" element={<QuizBuilder />} />
            <Route path="quizzes/:id/analytics" element={<QuizAnalytics />} />
          </Route>
        </Routes>
      </Suspense>
    </QueryClientProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <Toaster position="top-center" richColors />
    </BrowserRouter>
  )
}

export default App
