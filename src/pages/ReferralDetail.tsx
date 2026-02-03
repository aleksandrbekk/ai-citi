import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MessageCircle, TrendingUp, User, Send } from 'lucide-react'
import { useReferrals } from '@/hooks/useReferrals'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useState } from 'react'
import { SendCoinsModal } from '@/components/referrals/SendCoinsModal'
import { haptic } from '@/lib/haptic'

export default function ReferralDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { stats, refetch } = useReferrals()
  const user = useAuthStore((s) => s.user)
  const [showSendModal, setShowSendModal] = useState(false)

  // Найти партнёра по telegram_id
  const referral = stats?.referrals?.find(
    (r) => r.telegram_id?.toString() === id
  )

  // Получаем статистику партнёра
  const { data: partnerStats } = useQuery({
    queryKey: ['partner-stats', user?.telegram_id, id],
    queryFn: async () => {
      if (!user?.telegram_id || !id) return { earned: 0, generations: 0 }

      // Получаем сколько заработано от генераций этого партнёра
      const { data, error } = await supabase.rpc('get_partner_earnings', {
        p_referrer_telegram_id: user.telegram_id,
        p_partner_telegram_id: parseInt(id)
      })

      if (error) {
        console.error('Error fetching partner stats:', error)
        return { earned: 0, generations: 0 }
      }

      // spending = заработано от генераций (10%)
      // Если spending = 3, значит партнёр потратил 30 нейронов на генерации
      const earned = (data?.spending || 0)
      const generations = earned > 0 ? Math.round(earned / 3) : 0 // ~30 нейронов = 1 карусель = 3 нейрона бонус

      return { earned, generations }
    },
    enabled: !!user?.telegram_id && !!id
  })

  // Открыть Telegram чат с партнёром
  const openTelegramChat = () => {
    haptic.tap()
    if (referral?.username) {
      window.open(`https://t.me/${referral.username}`, '_blank')
    } else {
      // Попытка открыть по ID (работает не всегда)
      window.open(`tg://user?id=${referral?.telegram_id}`, '_blank')
    }
  }

  // Обработка успешной отправки нейронов
  const handleSendSuccess = () => {
    setShowSendModal(false)
    refetch()
  }

  if (!referral) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white flex items-center justify-center">
        <p className="text-gray-500">Партнёр не найден</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft size={24} className="text-gray-800" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Профиль партнёра</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-5">
        {/* Карточка партнёра */}
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-orange-500/5 border border-orange-100">
          {/* Аватар и имя */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 p-1 shadow-lg shadow-orange-500/25 mb-4">
              <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                {referral.avatar_url ? (
                  <img
                    src={referral.avatar_url}
                    alt={referral.first_name || 'Партнёр'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                    <User className="w-10 h-10 text-orange-400" />
                  </div>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900">
              {referral.first_name || referral.username || `ID: ${referral.telegram_id}`}
            </h2>
            {referral.username && (
              <p className="text-gray-500">@{referral.username}</p>
            )}
            <p className="text-sm text-gray-400 mt-1">
              С вами с {new Date(referral.created_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>

          {/* Статистика */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-orange-50 rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <img src="/neirocoin.png" alt="Нейроны" className="w-8 h-8 object-contain" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{partnerStats?.earned || 0}</p>
              <p className="text-xs text-gray-500">Принёс нейронов</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{partnerStats?.generations || 0}</p>
              <p className="text-xs text-gray-500">Генераций сделал</p>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="space-y-3">
            <button
              onClick={() => {
                haptic.tap()
                setShowSendModal(true)
              }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
            >
              <Send className="w-5 h-5" />
              Отправить нейроны
            </button>

            <button
              onClick={openTelegramChat}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold bg-[#0088cc] text-white hover:bg-[#0077b5] transition-all cursor-pointer active:scale-[0.98]"
            >
              <MessageCircle className="w-5 h-5" />
              Написать в Telegram
            </button>
          </div>
        </div>

        {/* Информация о партнёрской программе */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm text-gray-600 text-center">
            Вы получаете <span className="font-semibold text-orange-500">10%</span> от каждой генерации этого партнёра
          </p>
        </div>
      </div>

      {/* Модалка отправки нейронов */}
      <SendCoinsModal
        isOpen={showSendModal}
        partner={{
          telegram_id: referral.telegram_id,
          username: referral.username,
          first_name: referral.first_name,
          avatar_url: referral.avatar_url,
          created_at: referral.created_at
        }}
        onClose={() => setShowSendModal(false)}
        onSuccess={() => {
          handleSendSuccess()
        }}
      />
    </div>
  )
}
