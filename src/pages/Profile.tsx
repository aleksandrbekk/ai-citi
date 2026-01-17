import { useState, useEffect } from 'react'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { Wallet, UserPlus, Copy, Check, TrendingUp, Gift, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'
  const photoUrl = telegramUser?.photo_url
  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)

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
    <div className="min-h-screen pb-24">
      {/* Тёмный градиентный хедер */}
      <div className="relative bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] pt-8 pb-20 px-4">
        {/* Декоративные элементы */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="absolute top-20 right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col items-center">
          {/* Аватар с оранжевым кольцом */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-br from-orange-400 to-orange-600">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={firstName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-3xl font-bold text-orange-400">
                  {firstName[0]?.toUpperCase()}
                </div>
              )}
            </div>
            {/* Зелёный индикатор онлайн */}
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-[#1a1a2e]" />
          </div>

          {/* Имя пользователя */}
          <h1 className="mt-4 text-2xl font-bold text-white">
            {firstName}
          </h1>

          {/* Статус */}
          <div className="mt-2 flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400 font-medium">Активен</span>
          </div>
        </div>
      </div>

      {/* Белая карточка с балансом */}
      <div className="px-4 -mt-12">
        <div className="bg-white rounded-3xl shadow-xl p-5 space-y-5">

          {/* Баланс монет */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-yellow-900" />
              </div>
              {/* Кольцо вокруг монеты */}
              <div className="absolute inset-0 rounded-full border-4 border-orange-400/30" />
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
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((coinBalance % 100) + 10, 100)}%` }}
            />
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500 text-sm">Генерации</span>
                <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {generationsCount > 0 ? generationsCount : '1'}
                {generationsCount === 0 && <span className="text-xs font-normal text-gray-400 ml-1">бесплатная</span>}
              </p>
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

          {/* Кнопки */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/shop"
              className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-orange-500 to-orange-400 text-white font-semibold rounded-2xl shadow-lg shadow-orange-200 hover:shadow-orange-300 transition-all"
            >
              <Wallet className="w-5 h-5" />
              Пополнить
            </Link>

            <button
              onClick={handleCopyLink}
              disabled={!referralCode}
              className="flex items-center justify-center gap-2 py-3.5 bg-white border-2 border-orange-200 text-orange-500 font-semibold rounded-2xl hover:bg-orange-50 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-5 h-5" />
              Пригласить
            </button>
          </div>

          {/* Реферальная ссылка */}
          {referralCode && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-4 h-4 text-orange-500" />
              </div>
              <p className="flex-1 text-sm text-gray-600 truncate font-mono">
                {referralLink ? referralLink.replace('https://', '') : `t.me/...?startapp=ref_${referralCode}`}
              </p>
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  isCopied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                }`}
              >
                {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {isCopied ? 'Скопировано' : 'Копировать'}
              </button>
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
      </div>
    </div>
  )
}
