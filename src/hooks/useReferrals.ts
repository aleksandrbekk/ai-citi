import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getReferralStats, getReferralLink, copyReferralLink, type ReferralStats } from '../lib/referral'
import { getTelegramUser } from '../lib/telegram'

export function useReferrals() {
  const telegramUser = getTelegramUser()
  const [isCopied, setIsCopied] = useState(false)

  const {
    data: stats,
    isLoading,
    refetch
  } = useQuery<ReferralStats | null>({
    queryKey: ['referral-stats', telegramUser?.id],
    queryFn: () => telegramUser?.id ? getReferralStats(telegramUser.id) : null,
    enabled: !!telegramUser?.id,
    staleTime: 30000, // 30 секунд
  })

  const referralLink = telegramUser?.id ? getReferralLink(telegramUser.id) : ''

  const handleCopyLink = async () => {
    if (!telegramUser?.id) return false
    const success = await copyReferralLink(telegramUser.id)
    if (success) {
      setIsCopied(true)
      // Haptic feedback для Telegram
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success')
      setTimeout(() => setIsCopied(false), 2000)
    }
    return success
  }

  return {
    stats,
    isLoading,
    refetch,
    referralLink,
    handleCopyLink,
    isCopied,
    telegramId: telegramUser?.id
  }
}
