import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getReferralStats, getReferralLink, copyReferralLink, getUserReferralCode, type ReferralStats } from '../lib/referral'
import { getTelegramUser } from '../lib/telegram'

export function useReferrals() {
  const telegramUser = getTelegramUser()
  const [isCopied, setIsCopied] = useState(false)

  // Получаем referral_code пользователя
  const {
    data: referralCode,
    isLoading: isLoadingCode
  } = useQuery<string | null>({
    queryKey: ['referral-code', telegramUser?.id],
    queryFn: () => telegramUser?.id ? getUserReferralCode(telegramUser.id) : null,
    enabled: !!telegramUser?.id,
    staleTime: 60000, // 1 минута
  })

  // Получаем статистику рефералов
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch
  } = useQuery<ReferralStats | null>({
    queryKey: ['referral-stats', telegramUser?.id],
    queryFn: () => telegramUser?.id ? getReferralStats(telegramUser.id) : null,
    enabled: !!telegramUser?.id,
    staleTime: 30000, // 30 секунд
  })

  const referralLink = referralCode ? getReferralLink(referralCode) : ''

  const handleCopyLink = async () => {
    if (!referralCode) return false
    const success = await copyReferralLink(referralCode)
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
    isLoading: isLoadingCode || isLoadingStats,
    refetch,
    referralLink,
    referralCode,
    handleCopyLink,
    isCopied,
    telegramId: telegramUser?.id
  }
}
