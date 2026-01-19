import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/authStore'
import { Wallet, Copy, Check, TrendingUp, Gift, Sparkles, HelpCircle, X, LogOut, Bug } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Profile() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'
  const photoUrl = telegramUser?.photo_url
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const logout = useAuthStore((state) => state.logout)

  const { stats, referralLink, referralCode, handleCopyLink, isCopied } = useReferrals()

  useEffect(() => {
    const loadCoins = async () => {
      if (telegramUser?.id) {
        const balance = await getCoinBalance(telegramUser.id)
        setCoinBalance(balance)
      }
      setIsLoadingCoins(false)
    }
    loadCoins()
  }, [telegramUser?.id])

  // Количество генераций (10 монет = 1 генерация)
  const generationsCount = Math.floor(coinBalance / 10)
  const referralEarnings = stats?.total_coins_earned || 0

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Тёмный градиентный хедер */}
      <div className="relative bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] pt-8 pb-8 px-4">
        {/* Декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-1/2 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative">
            <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg shadow-orange-500/30">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-4xl font-bold text-orange-400">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 rounded-full border-[3px] border-[#16213e] shadow-lg" />
          </div>

          {/* Имя пользователя */}
          <h1 className="mt-4 text-2xl font-bold text-white">
            {firstName}
          </h1>

          {/* Статус */}
          <div className="mt-3 flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-orange-400 font-semibold">Активен</span>
          </div>
        </div>
      </div>

      {/* Белая карточка с балансом */}
      <div className="px-4 pt-4">
        <div className="bg-white rounded-3xl shadow-xl p-5 space-y-5">

          {/* Баланс монет */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                <Sparkles className="w-8 h-8 text-yellow-900" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold text-gray-900">
                  {isLoadingCoins ? '...' : coinBalance}
                </span>
                <TrendingUp className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-gray-500 text-sm">Монет</p>
            </div>
          </div>

          {/* Прогресс бар */}
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((coinBalance % 100) + 10, 100)}%` }}
            />
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Доступно</span>
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {generationsCount}
                <span className="text-xs font-normal text-gray-400 ml-1">генераций</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">10 монет = 1 карусель</p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Реферальные</span>
                <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                  <Gift className="w-3.5 h-3.5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {referralEarnings}
                <span className="text-xs font-normal text-gray-400 ml-1">монет</span>
              </p>
            </div>
          </div>

          {/* Кнопка Пополнить */}
          <Link
            to="/shop"
            className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-2xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all text-lg"
          >
            <Wallet className="w-5 h-5" />
            Пополнить баланс
          </Link>
        </div>

        {/* Реферальная секция */}
        <div className="mt-4 bg-white rounded-3xl shadow-lg p-5">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              <h3 className="font-semibold text-gray-900">Ваша реферальная ссылка</h3>
            </div>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Как это работает?</span>
            </button>
          </div>

          {/* Ссылка и кнопка копирования */}
          {referralCode ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                <p className="flex-1 text-sm text-gray-700 truncate font-mono">
                  {referralLink ? referralLink.replace('https://', '') : `t.me/Neirociti_bot/app?startapp=ref_${referralCode}`}
                </p>
              </div>

              <button
                onClick={handleCopyLink}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold transition-all ${
                  isCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300'
                }`}
              >
                {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {isCopied ? 'Ссылка скопирована!' : 'Скопировать и пригласить друга'}
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 text-sm">Загрузка ссылки...</p>
            </div>
          )}
        </div>

        {/* Статистика рефералов */}
        {stats && stats.total_referrals > 0 && (
          <div className="mt-4 bg-white rounded-3xl shadow-lg p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Gift className="w-5 h-5 text-orange-500" />
              Твои партнёры ({stats.total_referrals})
            </h3>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {stats.referrals?.map((ref) => (
                <div key={ref.telegram_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold">
                    {ref.first_name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {ref.first_name || ref.username || `ID: ${ref.telegram_id}`}
                    </p>
                    {ref.username && (
                      <p className="text-xs text-gray-500">@{ref.username}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(ref.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Кнопка Debug */}
        <div className="mt-4">
          <button
            onClick={() => navigate('/debug-referral')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:bg-purple-700 transition-colors"
          >
            <Bug className="w-5 h-5" />
            🔍 Debug Referral System
          </button>
        </div>

        {/* Кнопка Выйти */}
        <div className="mt-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Выйти из аккаунта
          </button>
        </div>
      </div>

      {/* Модальное окно "Как это работает?" */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Как это работает?</h3>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-500 font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Поделись ссылкой</p>
                  <p className="text-sm text-gray-500">Отправь реферальную ссылку другу</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-500 font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Друг регистрируется</p>
                  <p className="text-sm text-gray-500">Ты получаешь <span className="text-orange-500 font-semibold">+2 монеты</span> сразу</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-500 font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Друг покупает монеты</p>
                  <p className="text-sm text-gray-500">Ты получаешь <span className="text-orange-500 font-semibold">20%</span> от его покупки</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-orange-500 font-bold">4</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Друг тратит монеты</p>
                  <p className="text-sm text-gray-500">Ты получаешь <span className="text-orange-500 font-semibold">20%</span> от его трат</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowHowItWorks(false)}
              className="mt-6 w-full py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-2xl"
            >
              Понятно!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
