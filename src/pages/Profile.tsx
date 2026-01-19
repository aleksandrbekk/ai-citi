import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/authStore'
import { Wallet, ShoppingCart, Network, Settings, Users, Copy, Check, X, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Пользователь'
  const photoUrl = telegramUser?.photo_url
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [showReferrals, setShowReferrals] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<any>(null)
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

  // Блокируем скролл body когда открыта модалка
  useEffect(() => {
    if (showReferrals || showSettings || selectedReferral) {
      document.body.style.overflow = 'hidden'
      document.body.style.height = '100vh'
    } else {
      document.body.style.overflow = ''
      document.body.style.height = ''
    }
  }, [showReferrals, showSettings, selectedReferral])

  // Количество генераций (10 монет = 1 генерация)
  const generationsCount = Math.floor(coinBalance / 10)

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Профиль пользователя */}
      <div className="px-4 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-orange-400 to-orange-600">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-3xl font-bold text-orange-500">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 rounded-full border-4 border-[#FFF8F5]" />
          </div>

          {/* Имя и статус */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">
              {firstName}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-lg text-green-600 font-medium">Активен</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Большая карточка с балансом */}
        <div className="bg-white rounded-3xl shadow-lg p-1 overflow-hidden">
          <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-400 rounded-[22px] px-6 py-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-5xl font-bold text-white">
                {isLoadingCoins ? '...' : coinBalance}
              </p>
              <p className="text-white/90 text-lg mt-1">монет</p>
            </div>
          </div>
        </div>

        {/* Сетка с 4 плитками */}
        <div className="grid grid-cols-2 gap-3">
          {/* Купить монеты */}
          <Link
            to="/shop"
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Купить монеты</p>
          </Link>

          {/* Генерации */}
          <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-3">
              <Network className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Генерации ({generationsCount})</p>
          </div>

          {/* Рефералы */}
          <button
            onClick={() => setShowReferrals(true)}
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Рефералы ({stats?.total_referrals || 0})</p>
          </button>

          {/* Настройки */}
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white rounded-3xl shadow-lg p-6 flex flex-col items-start hover:shadow-xl transition-all text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">Настройки</p>
          </button>
        </div>
      </div>

      {/* Модалка Referrals */}
      {showReferrals && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowReferrals(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-2xl font-bold text-gray-900">Реферальная программа</h3>
              <button
                onClick={() => setShowReferrals(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="p-4 space-y-4 overflow-y-scroll"
              style={{
                height: '80vh',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Статистика */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 text-center border border-green-100">
                  <p className="text-3xl font-bold text-green-600">{stats?.total_referrals || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Партнеров</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 text-center border border-orange-100">
                  <p className="text-3xl font-bold text-orange-600">{stats?.total_coins_earned || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Заработано</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-4 text-center border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600">{stats?.total_partner_purchased || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Покупок</p>
                </div>
              </div>

              {/* Реферальная ссылка */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-700">Ваша реферальная ссылка:</p>
                <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200">
                  <p className="flex-1 text-sm text-gray-700 truncate font-mono">
                    {referralLink ? referralLink.replace('https://', '') : `t.me/Neirociti_bot/app?startapp=ref_${referralCode}`}
                  </p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold transition-all ${
                    isCopied
                      ? 'bg-green-500 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl'
                  }`}
                >
                  {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {isCopied ? 'Ссылка скопирована!' : 'Скопировать ссылку'}
                </button>
              </div>

              {/* Как это работает */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-4 border border-orange-100">
                <p className="font-semibold text-gray-900 mb-3">Как работает реферальная программа:</p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>🎁 <span className="font-semibold">+2 монеты</span> за регистрацию друга</p>
                  <p>💰 <span className="font-semibold">20% монет</span> от покупок партнера</p>
                  <p>✨ <span className="font-semibold">20% монет</span> от трат партнера</p>
                </div>
              </div>

              {/* Список партнеров */}
              {stats && stats.total_referrals > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Ваши партнеры:</h4>
                  <div className="space-y-2">
                    {stats.referrals?.map((ref) => (
                      <button
                        key={ref.telegram_id}
                        onClick={() => setSelectedReferral(ref)}
                        className="w-full flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
                      >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {ref.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {ref.first_name || ref.username || `ID: ${ref.telegram_id}`}
                          </p>
                          {ref.username && (
                            <p className="text-sm text-gray-500">@{ref.username}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-400">
                            {new Date(ref.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модалка детализации реферала */}
      {selectedReferral && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedReferral(null)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Детализация партнера</h3>
              <button
                onClick={() => setSelectedReferral(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="p-6 space-y-4 overflow-y-scroll"
              style={{
                maxHeight: '70vh',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Инфо о партнере */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
                  {selectedReferral.first_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-lg">
                    {selectedReferral.first_name || selectedReferral.username || `ID: ${selectedReferral.telegram_id}`}
                  </p>
                  {selectedReferral.username && (
                    <p className="text-sm text-gray-500">@{selectedReferral.username}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Присоединился: {new Date(selectedReferral.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              {/* Статистика заработка */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xl">🎁</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">За регистрацию</p>
                      <p className="text-xs text-gray-500">Разовый бонус</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600">+2</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                      <span className="text-white text-xl">💰</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">За покупки (20% монет)</p>
                      <p className="text-xs text-gray-500">Скоро будет доступно</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-orange-600">0</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-xl">✨</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">За траты (20% монет)</p>
                      <p className="text-xs text-gray-500">Скоро будет доступно</p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">0</p>
                </div>
              </div>

              {/* Итого */}
              <div className="p-4 bg-gray-900 rounded-2xl">
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold">Всего заработано:</p>
                  <p className="text-3xl font-bold text-yellow-400">2 монеты</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модалка Settings */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 p-4 flex items-center justify-between rounded-t-3xl">
              <h3 className="text-2xl font-bold text-gray-900">Настройки</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="p-6 space-y-3 overflow-y-scroll"
              style={{
                height: '40vh',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-500 text-white font-semibold rounded-2xl shadow-lg hover:bg-red-600 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Выйти из аккаунта
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
