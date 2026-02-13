import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Lock, Star, Clock, Mail, GraduationCap, ClipboardCheck } from 'lucide-react'
import { getUserTariffsById, getUserTariffWithExpiry, checkIsCurator, supabase } from '@/lib/supabase'
import { useFeatureAccess, FEATURES } from '@/hooks/useSubscription'
import { motion } from 'framer-motion'

export default function SchoolIndex() {
  const navigate = useNavigate()
  const [userTariffs, setUserTariffs] = useState<string[]>([])
  const [tariffExpiry, setTariffExpiry] = useState<string | null>(null)
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true)
  const [isCurator, setIsCurator] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [emailInput, setEmailInput] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [emailChecked, setEmailChecked] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Проверка подписки PRO/ELITE
  const { data: academyAccess, isLoading: isLoadingAccess } = useFeatureAccess(FEATURES.AI_ACADEMY)

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    const savedUser = localStorage.getItem('tg_user')
    let telegramId = tg?.initDataUnsafe?.user?.id
    if (!telegramId && savedUser) {
      telegramId = JSON.parse(savedUser).id
    }

    if (telegramId) {
      // Загружаем тарифы
      getUserTariffsById(telegramId).then(tariffs => {
        setUserTariffs(tariffs)
        setIsLoadingTariffs(false)
      })

      // Загружаем срок
      getUserTariffWithExpiry(telegramId).then(info => {
        if (info) setTariffExpiry(info.expires_at)
      })

      // Проверяем куратор ли + загружаем email
      const checkUserData = async () => {
        const { data: userData } = await supabase
          .from('users')
          .select('id, email')
          .eq('telegram_id', telegramId)
          .single()

        if (userData) {
          setCurrentUserId(userData.id)
          setUserEmail(userData.email || null)
          const curator = await checkIsCurator(userData.id)
          setIsCurator(curator)
        }
        setEmailChecked(true)
      }
      checkUserData()
    } else {
      setIsLoadingTariffs(false)
      setEmailChecked(true)
    }
  }, [])

  // Определи название тарифа для отображения
  const tariffName = userTariffs.includes('platinum') ? 'ПЛАТИНА' :
    userTariffs.includes('standard') ? 'СТАНДАРТ' : 'Нет доступа'
  const tariffSlug = userTariffs.includes('platinum') ? 'platinum' :
    userTariffs.includes('standard') ? 'standard' : null

  // Вычисляем оставшиеся дни
  const daysLeft = tariffExpiry
    ? Math.ceil((new Date(tariffExpiry).getTime() - Date.now()) / 86400000)
    : null

  // Доступ есть если: подписка PRO/ELITE ИЛИ куплен курс ИЛИ куратор
  const hasSubscriptionAccess = academyAccess?.has_access || false
  const hasAccess = hasSubscriptionAccess || !!tariffSlug || isCurator

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSaveEmail = async () => {
    if (!currentUserId || !isValidEmail(emailInput.trim())) return
    setSavingEmail(true)
    await supabase
      .from('users')
      .update({ email: emailInput.trim() })
      .eq('id', currentUserId)
    setUserEmail(emailInput.trim())
    setSavingEmail(false)
  }

  // Нужно показать модалку email если: есть доступ, email проверен, email пустой
  const needsEmail = hasAccess && emailChecked && !userEmail

  if (isLoadingTariffs || isLoadingAccess) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Загрузка курсов...</p>
        </motion.div>
      </div>
    )
  }

  // Если нет доступа - показываем экран блокировки
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center">
              <Lock size={18} className="text-gray-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Академия</h1>
              <p className="text-xs text-gray-400">Требуется подписка PRO или ELITE</p>
            </div>
          </div>
        </div>

        {/* Locked content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-sm"
          >
            <div className="w-20 h-20 glass-card flex items-center justify-center mx-auto mb-6">
              <Lock size={32} className="text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
            <p className="text-gray-500 mb-2">
              AI Академия доступна для подписчиков PRO и ELITE.
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Оформи подписку и получи доступ к обучающим материалам и курсам.
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              Оформить подписку
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  // Если email не заполнен — просим заполнить
  if (needsEmail) {
    return (
      <div className="min-h-screen bg-[#FFF8F5] flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-20 h-20 glass-card flex items-center justify-center mx-auto mb-6">
            <Mail size={32} className="text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Укажите email</h2>
          <p className="text-gray-500 text-sm mb-6">Для доступа к курсам нам нужна ваша почта</p>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-4 py-3 glass-input text-gray-900 placeholder-gray-400 mb-4 text-center"
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEmail()}
          />
          <button
            onClick={handleSaveEmail}
            disabled={!isValidEmail(emailInput.trim()) || savingEmail}
            className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 active:scale-[0.98] disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            {savingEmail ? 'Сохранение...' : 'Продолжить'}
          </button>
        </motion.div>
      </div>
    )
  }

  // Анимация staggered карточек
  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const }
    })
  }

  return (
    <div className="min-h-screen bg-[#FFF8F5] text-gray-900 p-4 pb-24">
      <motion.h1
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-2xl font-bold mb-6"
      >
        📚 Мои курсы
      </motion.h1>

      <div className="space-y-3">
        {/* Доступ по подписке PRO/ELITE */}
        {hasSubscriptionAccess && !tariffSlug && (
          <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
            <Link
              to="/school/subscription"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-cyan-200 active:scale-[0.98] transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-50 to-cyan-100 flex items-center justify-center shadow-sm">
                <Star className="w-5 h-5 text-cyan-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base text-cyan-600">AI Академия</div>
                <div className="text-sm text-gray-400">Доступ по подписке PRO/ELITE</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </Link>
          </motion.div>
        )}

        {/* Курс (купленный) */}
        {tariffSlug && (
          <motion.div custom={hasSubscriptionAccess && !tariffSlug ? 1 : 0} initial="hidden" animate="visible" variants={cardVariants}>
            <Link
              to={`/school/${tariffSlug}`}
              className="block p-5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-orange-200 active:scale-[0.98] transition-all duration-200"
            >
              {/* Верхняя часть: иконка + название + стрелка */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-sm">
                  <GraduationCap className="w-5 h-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-base text-orange-500">{tariffName}</div>
                  <div className="text-sm text-gray-400">
                    {tariffSlug === 'platinum' ? '11 модулей • Полный доступ' : 'Доступ к стандартным модулям'}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
              </div>

              {/* Статус доступа */}
              {daysLeft !== null ? (
                <div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${daysLeft > 14 ? 'bg-gradient-to-r from-orange-400 to-orange-500' :
                          daysLeft > 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                            'bg-red-400'
                        }`}
                      style={{ width: `${Math.max(0, Math.min(100, (daysLeft / 90) * 100))}%` }}
                    />
                  </div>
                  <div className={`flex items-center gap-1 text-xs mt-2 ${daysLeft > 7 ? 'text-gray-400' : daysLeft > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                    <Clock className="w-3 h-3" />
                    {daysLeft > 0 ? `Осталось ${daysLeft} дн.` : 'Доступ истёк'}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  Бессрочный доступ
                </div>
              )}
            </Link>
          </motion.div>
        )}

        {/* Проверка ДЗ для кураторов */}
        {isCurator && (
          <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
            <Link
              to="/curator"
              className="flex items-center gap-4 p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm hover:shadow-md hover:border-green-200 active:scale-[0.98] transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center shadow-sm">
                <ClipboardCheck className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base text-green-600">Проверка ДЗ</div>
                <div className="text-sm text-gray-400">Проверить работы учеников</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}
