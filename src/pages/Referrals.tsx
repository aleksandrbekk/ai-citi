import { useQuery } from '@tanstack/react-query'
import { getTelegramUser } from '@/lib/telegram'
import { getPartnerEarnings, type PartnerEarnings } from '@/lib/referral'
import { ChevronLeft, Gift, Sparkles, TrendingUp, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Referrals() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()

  const { data: partners, isLoading } = useQuery<PartnerEarnings[]>({
    queryKey: ['partner-earnings', telegramUser?.id],
    queryFn: () => telegramUser?.id ? getPartnerEarnings(telegramUser.id) : Promise.resolve([]),
    enabled: !!telegramUser?.id,
  })

  const totalEarned = partners?.reduce((sum, p) => sum + p.total_earned, 0) || 0

  return (
    <div className="min-h-screen bg-[#FFF8F5] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f0f23] px-4 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-bold text-white">Твои партнёры</h1>
        </div>

        {/* Статистика */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm mb-1">Всего партнёров</p>
              <p className="text-3xl font-bold text-white">{partners?.length || 0}</p>
            </div>
            <div className="text-right">
              <p className="text-white/70 text-sm mb-1">Заработано</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-orange-400">{totalEarned}</p>
                <Sparkles className="w-7 h-7 text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Список партнёров */}
      <div className="px-4 pt-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Загрузка...</p>
          </div>
        ) : partners && partners.length > 0 ? (
          <div className="space-y-3">
            {partners.map((partner) => (
              <div key={partner.referred_telegram_id} className="bg-white rounded-3xl p-4 shadow-lg">
                {/* Заголовок партнёра */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg">
                    {partner.referred_first_name?.[0] || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {partner.referred_first_name || partner.referred_username || `ID: ${partner.referred_telegram_id}`}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {partner.referred_username && <span>@{partner.referred_username}</span>}
                      <span>•</span>
                      <span>{new Date(partner.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-full">
                      <span className="font-bold text-orange-600">{partner.total_earned}</span>
                      <Sparkles className="w-4 h-4 text-orange-500" />
                    </div>
                  </div>
                </div>

                {/* Детализация заработка */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Регистрация */}
                  <div className="bg-green-50 rounded-xl p-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 mx-auto mb-2">
                      <Gift className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-xs text-green-600 text-center font-medium mb-1">Регистрация</p>
                    <p className="text-lg font-bold text-green-700 text-center">+{partner.registration_bonus}</p>
                  </div>

                  {/* Покупки */}
                  <div className={`rounded-xl p-3 ${partner.purchase_bonus > 0 ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mx-auto mb-2 ${partner.purchase_bonus > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <ShoppingCart className={`w-4 h-4 ${partner.purchase_bonus > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-xs text-center font-medium mb-1 ${partner.purchase_bonus > 0 ? 'text-blue-600' : 'text-gray-400'}`}>Покупки</p>
                    <p className={`text-lg font-bold text-center ${partner.purchase_bonus > 0 ? 'text-blue-700' : 'text-gray-400'}`}>+{partner.purchase_bonus}</p>
                  </div>

                  {/* Траты */}
                  <div className={`rounded-xl p-3 ${partner.spend_bonus > 0 ? 'bg-purple-50' : 'bg-gray-50'}`}>
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full mx-auto mb-2 ${partner.spend_bonus > 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      <TrendingUp className={`w-4 h-4 ${partner.spend_bonus > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
                    </div>
                    <p className={`text-xs text-center font-medium mb-1 ${partner.spend_bonus > 0 ? 'text-purple-600' : 'text-gray-400'}`}>Траты</p>
                    <p className={`text-lg font-bold text-center ${partner.spend_bonus > 0 ? 'text-purple-700' : 'text-gray-400'}`}>+{partner.spend_bonus}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Gift className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium mb-2">Пока нет партнёров</p>
            <p className="text-gray-400 text-sm">Поделись реферальной ссылкой с друзьями</p>
          </div>
        )}
      </div>
    </div>
  )
}
