import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTelegramUser } from '@/lib/telegram'
import { getCoinBalance, getUserTariffInfo, type UserTariffInfo } from '@/lib/supabase'
import { useReferrals } from '@/hooks/useReferrals'
import { useAuthStore } from '@/store/authStore'
import { toast } from 'sonner'
import {
  ProfileHeader,
  BalanceCard,
  QuickActions,
  QRCodeModal,
  SettingsDrawer
} from '@/components/profile'

export default function Profile() {
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Пользователь'
  const photoUrl = telegramUser?.photo_url

  const [coinBalance, setCoinBalance] = useState<number>(0)
  const [isLoadingCoins, setIsLoadingCoins] = useState(true)
  const [tariffInfo, setTariffInfo] = useState<UserTariffInfo | null>(null)

  // Modals
  const [showSettings, setShowSettings] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  const { stats, referralLink, referralCode } = useReferrals()

  useEffect(() => {
    const loadData = async () => {
      if (telegramUser?.id) {
        const [balance, tariff] = await Promise.all([
          getCoinBalance(telegramUser.id),
          getUserTariffInfo(telegramUser.id)
        ])
        setCoinBalance(balance)
        setTariffInfo(tariff)
      }
      setIsLoadingCoins(false)
    }
    loadData()
  }, [telegramUser?.id])

  // Форматирование даты окончания тарифа
  const formatTariffExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Бессрочно'
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

  const handleHistory = () => {
    toast.info('История транзакций скоро будет доступна')
  }

  const handlePromoCode = () => {
    toast.info('Промокоды скоро будут доступны')
  }

  const handleUpgrade = () => {
    toast.info('Тарифы скоро будут доступны')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white pb-24">
      {/* Header */}
      <ProfileHeader
        firstName={firstName}
        photoUrl={photoUrl}
        tariffName={currentTariffName}
        tariffExpiry={tariffExpiry}
        isFreeTariff={isFreeTariff}
        onSettingsClick={() => setShowSettings(true)}
        onUpgradeClick={handleUpgrade}
      />

      <div className="px-4 space-y-4">
        {/* Balance Card */}
        <BalanceCard
          balance={coinBalance}
          giftCoins={0}
          spent={0}
          earned={stats?.total_coins_earned || 0}
          isLoading={isLoadingCoins}
        />

        {/* Quick Actions */}
        <QuickActions
          referralsCount={stats?.total_referrals || 0}
          onBuyCoins={handleBuyCoins}
          onPartners={handlePartners}
          onHistory={handleHistory}
          onPromoCode={handlePromoCode}
          onQRCode={() => setShowQRCode(true)}
        />
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        referralLink={referralLink || `https://t.me/Neirociti_bot/app?startapp=ref_${referralCode}`}
        referralCode={referralCode || ''}
      />

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onLogout={logout}
      />
    </div>
  )
}
