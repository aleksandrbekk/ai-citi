import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  TrendingUp,
  Gift,
  Share2,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react'
import { useReferrals } from '@/hooks/useReferrals'

// Ключ для localStorage
const REFERRAL_ONBOARDING_KEY = 'referral_onboarding_completed'

export default function Referrals() {
  const navigate = useNavigate()
  const { stats, referralLink, referralCode, handleCopyLink, isCopied, isLoading } = useReferrals()
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Проверяем нужен ли онбординг
  useEffect(() => {
    const completed = localStorage.getItem(REFERRAL_ONBOARDING_KEY)
    if (!completed) {
      const timer = setTimeout(() => setShowOnboarding(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const completeOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem(REFERRAL_ONBOARDING_KEY, 'true')
  }

  // Шаринг через Telegram
  const handleShare = () => {
    const text = '🎁 Привет! Присоединяйся к AI CITI — получи бонусные нейроны для генерации контента!'
    const url = referralLink || `https://t.me/Neirociti_bot/app?startapp=ref_${referralCode}`

    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`

    if (window.Telegram?.WebApp) {
      // Используем window.open как fallback
      window.open(shareUrl, '_blank')
    } else {
      window.open(shareUrl, '_blank')
    }
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
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Партнёрская программа</h1>
          <p className="text-sm text-gray-500">Приглашай друзей — зарабатывай</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {/* Hero Stats Card */}
        <div className="bg-gradient-to-br from-orange-400 via-orange-500 to-cyan-500 rounded-3xl p-5 text-white shadow-xl shadow-orange-500/25">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Всего заработано</p>
              <p className="text-3xl font-bold">{stats?.total_coins_earned || 0} <span className="text-lg">нейронов</span></p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/15 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-white/70" />
                <span className="text-white/70 text-xs">Партнёров</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_referrals || 0}</p>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-white/70" />
                <span className="text-white/70 text-xs">От трат партнёров</span>
              </div>
              <p className="text-2xl font-bold">{stats?.total_partner_spent || 0}</p>
            </div>
          </div>
        </div>

        {/* Referral Link Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-500/5 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-gray-900">Твоя ссылка</span>
            </div>
            <p className="text-xs text-gray-500">Отправь друзьям и получай бонусы</p>
          </div>

          <div className="p-4 bg-gray-50/50">
            <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-200 mb-3">
              <p className="flex-1 text-sm text-gray-600 truncate font-mono">
                {referralLink ? referralLink.replace('https://', '') : `t.me/Neirociti_bot/app?startapp=ref_${referralCode}`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyLink}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                  isCopied
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {isCopied ? 'Скопировано!' : 'Копировать'}
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
              >
                <Share2 className="w-5 h-5" />
                Поделиться
              </button>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-500" />
            Как это работает
          </h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Отправь ссылку другу</p>
                <p className="text-sm text-gray-500">Он регистрируется по твоей реферальной ссылке</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">Друг создаёт карусели</p>
                <p className="text-sm text-gray-500">Он тратит нейроны на генерацию контента</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900">Ты получаешь бонус</p>
                <p className="text-sm text-gray-500"><span className="font-semibold bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent">10% от каждой карусели</span> партнёра — твои!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Partners List */}
        {stats && stats.referrals && stats.referrals.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-500" />
                Твои партнёры
              </h3>
              <span className="text-sm text-gray-500">{stats.referrals.length} чел.</span>
            </div>

            <div className="divide-y divide-gray-100">
              {stats.referrals.map((ref) => (
                <button
                  key={ref.telegram_id}
                  onClick={() => navigate(`/referral/${ref.telegram_id}`)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {ref.first_name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-gray-900 truncate">
                      {ref.first_name || ref.username || `ID: ${ref.telegram_id}`}
                    </p>
                    {ref.username && (
                      <p className="text-sm text-gray-500">@{ref.username}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {new Date(ref.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {stats && (!stats.referrals || stats.referrals.length === 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-100 to-cyan-100 flex items-center justify-center">
              <Users className="w-8 h-8 text-orange-500" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Пока нет партнёров</h3>
            <p className="text-sm text-gray-500 mb-4">
              Поделись ссылкой с друзьями и начни зарабатывать нейроны!
            </p>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl transition-all cursor-pointer active:scale-[0.98]"
            >
              <Share2 className="w-5 h-5" />
              Пригласить друзей
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <ReferralOnboarding onComplete={completeOnboarding} />
      )}
    </div>
  )
}

// Компонент онбординга
function ReferralOnboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(true)

  const steps = [
    {
      emoji: '👋',
      title: 'Партнёрка',
      message: 'Привет! Здесь ты можешь зарабатывать нейроны, приглашая друзей!',
    },
    {
      emoji: '🎯',
      title: 'Как это работает',
      message: 'Отправляешь ссылку другу → он создаёт карусели → ты получаешь бонус',
    },
    {
      emoji: '💰',
      title: 'Пассивный доход',
      message: '10% от каждой карусели твоего партнёра — твои! Это работает вечно 🚀',
    },
  ]

  const currentStep = steps[step]
  const isLastStep = step === steps.length - 1

  // Эффект печатания
  useEffect(() => {
    setIsTyping(true)
    setDisplayedText('')

    let index = 0
    const text = currentStep.message

    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(typeInterval)
      }
    }, 25)

    return () => clearInterval(typeInterval)
  }, [step, currentStep.message])

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setStep(prev => prev + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => !isTyping && handleNext()}>
      <div className="absolute inset-0 bg-black/70" />

      <div
        className="relative w-full max-w-md mx-4 mb-6 animate-in slide-in-from-bottom-4 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-end gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-orange-400 rounded-full blur-lg opacity-50 animate-pulse" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 p-0.5 shadow-xl">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <img src="/images/neurochik.png" alt="AI помощник" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </div>

          {/* Bubble */}
          <div className="flex-1 relative">
            <div className="absolute bottom-3 -left-2 w-4 h-4 bg-white transform rotate-45 rounded-sm" />

            <div className="relative bg-white rounded-2xl rounded-bl-md shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-50 to-orange-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentStep.emoji}</span>
                  <span className="font-bold text-gray-900 text-sm">{currentStep.title}</span>
                </div>
                <button onClick={onComplete} className="p-1 rounded-full hover:bg-gray-200/50 cursor-pointer">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Message */}
              <div className="px-4 py-3">
                <p className="text-gray-700 text-sm leading-relaxed min-h-[40px]">
                  {displayedText}
                  {isTyping && <span className="inline-block w-0.5 h-4 bg-cyan-500 ml-0.5 animate-pulse" />}
                </p>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === step
                          ? 'w-6 bg-gradient-to-r from-orange-400 to-cyan-500'
                          : i < step
                          ? 'w-1.5 bg-orange-400'
                          : 'w-1.5 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={isTyping}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                    isTyping
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/25'
                  }`}
                >
                  {isLastStep ? 'Понятно! 🎉' : 'Далее'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-3">
          Нажми куда угодно чтобы продолжить
        </p>
      </div>
    </div>
  )
}
