import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Folder, ChevronRight, Lock } from 'lucide-react'
import { getUserTariffsById, checkIsCurator, supabase } from '@/lib/supabase'

export default function SchoolIndex() {
  const navigate = useNavigate()
  const [userTariffs, setUserTariffs] = useState<string[]>([])
  const [isLoadingTariffs, setIsLoadingTariffs] = useState(true)
  const [isCurator, setIsCurator] = useState(false)

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

      // Проверяем куратор ли
      const checkCuratorStatus = async () => {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', telegramId)
          .single()

        if (userData) {
          const curator = await checkIsCurator(userData.id)
          setIsCurator(curator)
        }
      }
      checkCuratorStatus()
    } else {
      setIsLoadingTariffs(false)
    }
  }, [])

  // Определи название тарифа для отображения
  const tariffName = userTariffs.includes('platinum') ? 'ПЛАТИНА' :
    userTariffs.includes('standard') ? 'СТАНДАРТ' : 'Нет доступа'
  const tariffSlug = userTariffs.includes('platinum') ? 'platinum' :
    userTariffs.includes('standard') ? 'standard' : null

  if (isLoadingTariffs) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    )
  }

  // Если нет подписки и не куратор - показываем экран блокировки
  if (!tariffSlug && !isCurator) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Школа AI</h1>
              <p className="text-xs text-gray-400">Требуется подписка</p>
            </div>
          </div>
        </div>

        {/* Locked content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Lock size={40} className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
            <p className="text-gray-500 mb-6">
              Школа AI доступна для пользователей с активной подпиской. Оформи подписку, чтобы получить доступ к курсам.
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
            >
              Оформить подписку
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 p-4 pb-24">
      <h1 className="text-2xl font-bold mb-6">📚 Мои курсы</h1>

      <div className="space-y-3">
        {/* Курс */}
        {tariffSlug && (
          <Link
            to={`/school/${tariffSlug}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 border border-amber-500/50 hover:border-amber-400 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-500/30 flex items-center justify-center">
              <Folder className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg text-orange-500">{tariffName}</div>
              <div className="text-sm text-gray-500">
                {tariffSlug === 'platinum' ? '11 модулей • Полный доступ' : 'Доступ к стандартным модулям'}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-orange-500" />
          </Link>
        )}

        {/* Проверка ДЗ для кураторов */}
        {isCurator && (
          <Link
            to="/curator"
            className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/10 border border-blue-500/50 hover:border-blue-400 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg text-blue-600">Проверка ДЗ</div>
              <div className="text-sm text-gray-500">Проверить работы учеников</div>
            </div>
            <ChevronRight className="w-5 h-5 text-blue-500" />
          </Link>
        )}
      </div>
    </div>
  )
}
