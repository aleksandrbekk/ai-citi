import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { HomeIcon, UserIcon, ShopIcon } from '@/components/ui/icons'
import { Shield, GraduationCap } from 'lucide-react'
import { useState, useEffect } from 'react'
import { isAdmin as checkIsAdmin, canSeeFullMenu as checkCanSeeFullMenu } from '@/config/admins'
import { haptic } from '@/lib/haptic'
import { getUserTariffsById, checkIsCurator, supabase } from '@/lib/supabase'

export function BottomNav() {
  const location = useLocation()
  const isKeyboardOpen = useUIStore((s) => s.isKeyboardOpen)
  const [isAdmin, setIsAdmin] = useState(false)
  const [canSeeFullMenu, setCanSeeFullMenu] = useState(false)
  const [hasSchoolAccess, setHasSchoolAccess] = useState(false)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    let telegramId = tg?.initDataUnsafe?.user?.id

    if (!telegramId && savedUser) {
      try {
        telegramId = JSON.parse(savedUser).id
      } catch {
        // ignore
      }
    }

    if (checkIsAdmin(telegramId)) {
      setIsAdmin(true)
    }
    if (checkCanSeeFullMenu(telegramId)) {
      setCanSeeFullMenu(true)
    }

    // Проверяем доступ к школе: тарифы ИЛИ подписка PRO/ELITE ИЛИ куратор
    if (telegramId) {
      const checkSchool = async () => {
        // 1. Проверяем тарифы (platinum/standard)
        const tariffs = await getUserTariffsById(telegramId)
        if (tariffs.length > 0) {
          setHasSchoolAccess(true)
          return
        }

        // 2. Проверяем подписку PRO/ELITE через check_feature_access
        const { data: featureData } = await supabase.rpc('check_feature_access', {
          p_telegram_id: telegramId,
          p_feature_id: 'ai_academy',
        })
        if (featureData?.has_access) {
          setHasSchoolAccess(true)
          return
        }

        // 3. Проверяем куратор ли
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()
        if (userData) {
          const curator = await checkIsCurator(userData.id)
          if (curator) {
            setHasSchoolAccess(true)
          }
        }
      }
      checkSchool()
    }
  }, [])

  // Скрываем навигацию на страницах где она мешает
  if (
    location.pathname.startsWith('/quiz/') ||
    location.pathname.startsWith('/carousel-designs') ||
    location.pathname.startsWith('/agents/carousel') ||
    location.pathname.startsWith('/agents/karmalogik') ||
    location.pathname.startsWith('/chat') ||
    location.pathname.startsWith('/admin')
  ) {
    return null
  }

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 nav-glass transition-transform duration-200 safe-bottom ${isKeyboardOpen ? 'translate-y-full' : 'translate-y-0'
      }`}>
      <div className="flex items-center justify-around h-16 px-2">
        {/* Главная — для админов и тестеров */}
        {canSeeFullMenu && (
          <Link
            to="/"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname === '/'
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <HomeIcon size={22} className={location.pathname === '/' ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-medium">Главная</span>
          </Link>
        )}

        {/* Магазин — для админов и тестеров */}
        {canSeeFullMenu && (
          <Link
            to="/shop"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname === '/shop'
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <ShopIcon size={22} className={location.pathname === '/shop' ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-medium">Магазин</span>
          </Link>
        )}

        {/* Школа — только для тех, у кого есть доступ */}
        {hasSchoolAccess && (
          <Link
            to="/school"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname.startsWith('/school')
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <GraduationCap size={22} className={location.pathname.startsWith('/school') ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-medium">Школа</span>
          </Link>
        )}

        {/* Профиль — для админов и тестеров */}
        {canSeeFullMenu && (
          <Link
            to="/profile"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname === '/profile'
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <UserIcon size={22} className={location.pathname === '/profile' ? 'text-orange-500' : ''} />
            <span className="text-[10px] font-medium">Профиль</span>
          </Link>
        )}

        {/* Админ - ТОЛЬКО для админов */}
        {isAdmin && (
          <Link
            to="/admin"
            onClick={() => haptic.tap()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors",
              location.pathname.startsWith('/admin')
                ? "text-amber-500"
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <Shield size={22} className={location.pathname.startsWith('/admin') ? 'text-amber-500' : ''} />
            <span className="text-[10px] font-medium">Админ</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
