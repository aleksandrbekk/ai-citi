import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance, getUserTariffInfo, getGiftCoinBalance, getUserSpendStats, cancelSubscription, type UserTariffInfo } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { toast } from 'sonner'
import {
  ProfileHeader,
  BalanceCard,
  QuickActions,
  QRCodeModal,
  SettingsDrawer,
  TransactionHistoryModal
} from '@/components/profile'

export default function Profile() {
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Пользователь'
  const photoUrl = telegramUser?.photo_url

  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [giftCoinBalance, setGiftCoinBalance] = useState<number>(0)
  const [spendStats, setSpendStats] = useState<{ total_spent: number; total_earned: number }>({ total_spent: 0, total_earned: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [tariffInfo, setTariffInfo] = useState<UserTariffInfo | null>(null)

  // Modals
  const [showSettings, setShowSettings] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const { stats, referralLink, referralCode } = useReferrals()

  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        const [balance, giftBalance, tariff, spendStatsData] = await Promise.all([
          getCoinBalance(telegramUser.id),
          getGiftCoinBalance(telegramUser.id),
          getUserTariffInfo(telegramUser.id),
          getUserSpendStats(telegramUser.id)
        ])
        setCoinBalance(balance)
        setGiftCoinBalance(giftBalance)
        setTariffInfo(tariff)
        setSpendStats(spendStatsData)
      }
      setIsLoading(false)
    }
    loadData()
  }, [telegramUser?.id])

  // Форматирование даты окончания тарифа
  const formatTariffExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return ''
    const date = new Date(expiresAt)
    return `до ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  // Название тарифа
  const getTariffName = (slug: string) => {
    const names: Record<string, string> = {
      'platinum': 'Platinum',
      'standard': 'Standard',
      'basic': 'Basic',
      'free': 'Free'
    }
    return names[slug] || slug
  }

  const currentTariffName = tariffInfo
    ? getTariffName(tariffInfo.tariff_slug)
    : 'Free'

  const tariffExpiry = tariffInfo
    ? formatTariffExpiry(tariffInfo.expires_at)
    : ''

  const isFreeTariff = !tariffInfo || tariffInfo.tariff_slug === 'free'

  // Handlers
  const handleBuyCoins = () => navigate('/shop')
  const handlePartners = () => navigate('/referrals')
  const handleHistory = () => setShowHistory(true)
  const handleUpgrade = () => navigate('/shop')

  const handleCancelSubscription = async () => {
    if (!telegramUser?.id) return

    const result = await cancelSubscription(telegramUser.id)
    if (result.ok) {
      toast.success(result.message || 'Подписка отменена')
      const tariff = await getUserTariffInfo(telegramUser.id)
      setTariffInfo(tariff)
    } else {
      toast.error(result.error || 'Ошибка отмены подписки')
    }
  }

  // Проверяем, является ли тариф платной подпиской
  const isPaidSubscription = tariffInfo &&
    ['pro', 'elite', 'PRO', 'ELITE'].includes(tariffInfo.tariff_slug)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white pb-24">
      {/* Header */}
      <ProfileHeader
        firstName={firstName}
        photoUrl={photoUrl}
        tariffName={currentTariffName}
        tariffExpiry={tariffExpiry}
        isFreeTariff={isFreeTariff}
        isLoading={isLoading}
        onSettingsClick={() => setShowSettings(true)}
        onUpgradeClick={handleUpgrade}
      />

      <div className="px-4 space-y-4">
        {/* Balance Card */}
        <BalanceCard
          balance={coinBalance}
          giftCoins={giftCoinBalance}
          spent={spendStats.total_spent}
          earned={stats?.total_coins_earned || spendStats.total_earned}
          isLoading={isLoading}
        />

        {/* Quick Actions */}
        <QuickActions
          referralsCount={stats?.total_referrals || 0}
          onBuyCoins={handleBuyCoins}
          onPartners={handlePartners}
          onHistory={handleHistory}
          onQRCode={() => setShowQRCode(true)}
        />

        {/* Support */}
        <div className="mt-2 bg-white/70 backdrop-blur-sm border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-400 mb-2.5 font-medium">Техподдержка</p>
          <div className="flex gap-2">
            <a
              href="https://t.me/dmbekk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm text-gray-600 font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              @dmbekk
            </a>
            <a
              href="https://t.me/aleksandrbekk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors text-sm text-gray-600 font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              @aleksandrbekk
            </a>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        referralLink={referralLink || `https://t.me/Neirociti_bot?start=ref_${referralCode}`}
        referralCode={referralCode || ''}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        hasActiveSubscription={!!isPaidSubscription}
        subscriptionPlan={tariffInfo?.tariff_slug}
        subscriptionExpiry={tariffExpiry}
        onCancelSubscription={handleCancelSubscription}
      />

      {/* Transaction History Modal */}
      <TransactionHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
      />
    </div>
  )
}
