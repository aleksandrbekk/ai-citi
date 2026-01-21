import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import { useReferrals } from '@/hooks/useReferrals'

export default function Referrals() {
  const navigate = useNavigate()
  const { stats, referralLink, referralCode, handleCopyLink, isCopied } = useReferrals()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold">
          Реферальная <span className="text-orange-500">программа</span>
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-6">
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
            <p>🎁 <span className="font-semibold">+6 монет</span> за регистрацию друга</p>
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
                  onClick={() => navigate(`/referral/${ref.telegram_id}`)}
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
  )
}
