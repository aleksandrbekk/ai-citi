import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getReferralStats, getReferralLink, copyReferralLink, getUserReferralCode, type ReferralStats } from '../lib/referral'
import { getTelegramUser } from '../lib/telegram'

export function useReferrals() {
  const telegramUser = getTelegramUser()
  const [isCopied, setIsCopied] = useState(false)

  // Логируем для отладки
  useEffect(() => {
    console.log('useReferrals - telegramUser:', telegramUser)
  }, [telegramUser])

  // Получаем referral_code пользователя
  const {
    data: referralCode,
    isLoading: isLoadingCode,
    error: codeError
  } = useQuery<string | null>({
    queryKey: ['referral-code', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return null
      console.log('Fetching referral code for:', telegramUser.id)
      const code = await getUserReferralCode(telegramUser.id)
      console.log('Got referral code:', code)
      return code
    },
    enabled: !!telegramUser?.id,
    staleTime: 60000,
  })

  // Логируем ошибку
  useEffect(() => {
    if (codeError) {
      console.error('Error fetching referral code:', codeError)
    }
  }, [codeError])

  // Получаем статистику рефералов
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch
  } = useQuery<ReferralStats | null>({
    queryKey: ['referral-stats', telegramUser?.id],
    queryFn: () => telegramUser?.id ? getReferralStats(telegramUser.id) : null,
    enabled: !!telegramUser?.id,
    staleTime: 30000,
  })

  const referralLink = referralCode ? getReferralLink(referralCode) : ''

  // Логируем результат
  useEffect(() => {
    console.log('useReferrals result:', { referralCode, referralLink, stats, isLoadingCode, isLoadingStats })
  }, [referralCode, referralLink, stats, isLoadingCode, isLoadingStats])

  const handleCopyLink = async () => {
    if (!referralCode) return false
    const success = await copyReferralLink(referralCode)
    if (success) {
      setIsCopied(true)
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
