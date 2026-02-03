import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useReferrals } from '@/hooks/useReferrals'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export default function ReferralDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { stats } = useReferrals()
  const user = useAuthStore((s) => s.user)

  // Найти партнёра по telegram_id
  const referral = stats?.referrals?.find(
    (r) => r.telegram_id?.toString() === id
  )

  // Получаем заработок с этого партнёра
  const { data: earnings } = useQuery({
    queryKey: ['partner-earnings', user?.telegram_id, id],
    queryFn: async () => {
      if (!user?.telegram_id || !id) return { registration: 0, purchases: 0, spending: 0 }

      const { data, error } = await supabase.rpc('get_partner_earnings', {
        p_referrer_telegram_id: user.telegram_id,
        p_partner_telegram_id: parseInt(id)
      })

      if (error) {
        console.error('Error fetching partner earnings:', error)
        return { registration: 0, purchases: 0, spending: 0 }
      }

      return data || { registration: 0, purchases: 0, spending: 0 }
    },
    enabled: !!user?.telegram_id && !!id
  })

  if (!referral) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Партнёр не найден</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-shrink-0 px-4 py-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Детализация партнёра</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 space-y-6">
        {/* Инфо о партнере */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-2xl">
            {referral.first_name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <p className="font-bold text-gray-900 text-lg">
              {referral.first_name || referral.username || `ID: ${referral.telegram_id}`}
            </p>
            {referral.username && (
              <p className="text-sm text-gray-500">@{referral.username}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">
              Присоединился: {new Date(referral.created_at).toLocaleDateString('ru-RU')}
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
            <p className="text-2xl font-bold text-green-600">+{earnings?.registration || 0}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl border border-orange-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                <span className="text-white text-xl">💰</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">За покупки (20% монет)</p>
                <p className="text-xs text-gray-500">{earnings?.purchases ? 'Бонус от покупок партнёра' : 'Партнёр ещё не покупал'}</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-600">{earnings?.purchases ? `+${earnings.purchases}` : '0'}</p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                <span className="text-white text-xl">✨</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">За генерации (10%)</p>
                <p className="text-xs text-gray-500">{earnings?.spending ? 'Бонус от генераций партнёра' : 'Партнёр ещё не генерировал'}</p>
              </div>
            </div>
            <p className="text-2xl font-bold text-purple-600">{earnings?.spending ? `+${earnings.spending}` : '0'}</p>
          </div>
        </div>

        {/* Итого */}
        <div className="p-4 bg-gray-900 rounded-2xl">
          <div className="flex items-center justify-between">
            <p className="text-white font-semibold">Всего заработано:</p>
            <p className="text-3xl font-bold text-yellow-400">{(earnings?.registration || 0) + (earnings?.purchases || 0) + (earnings?.spending || 0)} монет</p>
          </div>
        </div>
      </div>
    </div>
  )
}
