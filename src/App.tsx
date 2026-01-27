import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { expandWebApp } from './lib/telegram'
import { getOrCreateUser, getUserTariffs } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import AccessDenied from './components/AccessDenied'
import Login from './pages/Login'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'
import Profile from '@/pages/Profile'
import Referrals from '@/pages/Referrals'
import ReferralDetail from '@/pages/ReferralDetail'
import Settings from '@/pages/Settings'
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
import KarmalogikChat from './pages/agents/karmalogik'
import QuizzesDashboard from './pages/quizzes/index'
import QuizBuilder from './pages/quizzes/builder'
import TakeQuiz from './pages/quizzes/take'
import QuizAnalytics from './pages/quizzes/analytics'
import AdminPanel from './pages/admin/index'
import CarouselDesignsPage from './pages/carousel-designs/index'
import MiniAdmin from './pages/mini-admin/index'
import { Offer } from './pages/Offer'
import Chat from './pages/Chat'
import DebugReferral from './pages/DebugReferral'
import PaymentSuccess from './pages/PaymentSuccess'

// Admin imports
import { AdminLayout, AdminProtectedRoute } from './components/admin'
import { AdminLogin } from './pages/admin/Login'
import { AdminCRM } from './pages/admin/CRM'
import { AdminSettings } from './pages/admin/Settings'
import { MlmDashboard } from './pages/admin/mlm/MlmDashboard'
import { ModulesList } from './pages/admin/modules/ModulesList'
import { ModuleEdit } from './pages/admin/modules/ModuleEdit'
import { LessonEdit } from './pages/admin/modules/LessonEdit'
import { StudentsList } from './pages/admin/students/StudentsList'
import { StudentCreate } from './pages/admin/students/StudentCreate'
import { StudentEdit } from './pages/admin/students/StudentEdit'
import AdminHomeworkReview from './pages/admin/HomeworkReview'
import AdminWhitelist from './pages/admin/Whitelist'
import { QuizzesList } from './pages/admin/quizzes/QuizzesList'
import AdminQuizBuilder from './pages/admin/quizzes/QuizBuilder'
import AdminQuizAnalytics from './pages/admin/quizzes/QuizAnalytics'
import { AdminQuizImageEditor } from './pages/admin/quizzes/QuizImageEditor'
import AiAnalytics from './pages/admin/AiAnalytics'

const queryClient = new QueryClient()

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
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Если это публичная страница, показываем сразу
  if (isPublicPage) {
    return (
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/offer" element={<Offer />} />
          <Route path="/quiz/:id" element={<TakeQuiz />} />
          <Route path="/carousel-designs" element={<CarouselDesignsPage />} />
          <Route path="/debug-referral" element={<DebugReferral />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
        </Routes>
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
