import { useReferrals } from '../hooks/useReferrals'
import { Copy, Check, Users, Coins, Gift } from 'lucide-react'

export function ReferralSection() {
  const { stats, isLoading, referralLink, referralCode, handleCopyLink, isCopied, telegramId } = useReferrals()

  // Отладка
  console.log('ReferralSection render:', { referralLink, referralCode, telegramId, isLoading })

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-purple-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  // Если нет telegramId - показываем сообщение
  if (!telegramId) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4">
        <p className="text-gray-500 text-sm">Реферальная программа доступна в Telegram</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Реферальная ссылка */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Пригласи друга</h3>
            <p className="text-xs text-gray-500">Получай 10% от каждой генерации!</p>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink || 'Загрузка...'}
            readOnly
            className="flex-1 px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-sm text-gray-600 truncate"
          />
          <button
            onClick={handleCopyLink}
            disabled={!referralCode}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
              isCopied
                ? 'bg-green-500 text-white'
                : !referralCode
                ? 'bg-gray-300 text-gray-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Скопировано</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Скопировать</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          10% от каждой генерации партнёра
        </p>

        {/* Показываем код для отладки */}
        {referralCode && (
          <p className="text-xs text-purple-500 mt-2">
            Твой код: {referralCode}
          </p>
        )}
      </div>

      {/* Статистика */}
      {stats && (stats.total_referrals > 0 || stats.total_coins_earned > 0) && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Твоя статистика</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-purple-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Партнёры</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{stats.total_referrals}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3">
              <div className="flex items-center gap-2 text-yellow-600 mb-1">
                <Coins className="w-4 h-4" />
                <span className="text-xs">Заработано</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{stats.total_coins_earned}</p>
            </div>
          </div>

          {/* Список рефералов */}
          {stats.referrals && stats.referrals.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-500 mb-2">Твои партнёры</h5>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stats.referrals.map((ref) => (
                  <div
                    key={ref.telegram_id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
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
      )}
    </div>
  )
}
