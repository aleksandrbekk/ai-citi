import { supabase } from './supabase'

/**
 * Интерфейс статистики рефералов
 */
export interface ReferralStats {
  total_referrals: number
  total_coins_earned: number
  total_partner_spent: number
  total_partner_purchased: number
  referrals: Array<{
    telegram_id: number
    username: string | null
    first_name: string | null
    avatar_url: string | null
    created_at: string
    earnings: number
  }>
}

/**
 * Получить реферальную ссылку пользователя по referral_code
 * Формат: ?start= открывает бота с приветственным сообщением
 * (не /app?startapp= который открывает Mini App напрямую)
 */
export function getReferralLink(referralCode: string): string {
  return `https://t.me/Neirociti_bot?start=ref_${referralCode}`
}

/**
 * Скопировать реферальную ссылку в буфер обмена
 */
export async function copyReferralLink(referralCode: string): Promise<boolean> {
  try {
    const link = getReferralLink(referralCode)
    await navigator.clipboard.writeText(link)
    return true
  } catch (error) {
    console.error('Failed to copy referral link:', error)
    // Fallback для старых браузеров
    try {
      const textArea = document.createElement('textarea')
      textArea.value = getReferralLink(referralCode)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Получить referral_code пользователя по telegram_id
 * Использует RPC функцию с SECURITY DEFINER для обхода RLS
 */
export async function getUserReferralCode(telegramId: number): Promise<string | null> {
  console.log('getUserReferralCode called with:', telegramId)

  const { data, error } = await supabase.rpc('get_user_referral_code', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error fetching referral code via RPC:', error)
    return null
  }

  console.log('RPC get_user_referral_code returned:', data)
  return data || null
}

/**
 * Получить статистику рефералов пользователя
 */
export async function getReferralStats(telegramId: number): Promise<ReferralStats | null> {
  const { data, error } = await supabase.rpc('get_referral_stats', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error fetching referral stats:', error)
    return null
  }

  return data as ReferralStats
}

/**
 * Начислить реферальный бонус при покупке монет
 */
export async function payReferralPurchaseBonus(
  buyerTelegramId: number,
  coinsPurchased: number
): Promise<{ success: boolean; bonusPaid?: number; hasReferrer?: boolean }> {
  const { data, error } = await supabase.rpc('pay_referral_purchase_bonus', {
    p_buyer_telegram_id: buyerTelegramId,
    p_coins_purchased: coinsPurchased
  })

  if (error) {
    console.error('Error paying referral purchase bonus:', error)
    return { success: false }
  }

  return {
    success: true,
    bonusPaid: data?.bonus_paid,
    hasReferrer: data?.has_referrer
  }
}

/**
 * Получить start_param из Telegram
 */
export function getStartParam(): string | null {
  const webApp = window.Telegram?.WebApp
  return (webApp as any)?.initDataUnsafe?.start_param || null
}

/**
 * Проверка, является ли start_param реферальным
 */
export function isReferralLink(startParam: string | null): boolean {
  return startParam?.startsWith('ref_') || false
}

/**
 * Извлечь referral_code реферера из start_param
 */
export function getReferrerCode(startParam: string | null): string | null {
  if (!startParam || !startParam.startsWith('ref_')) return null
  return startParam.replace('ref_', '')
}

/**
 * Проверить есть ли у пользователя реферер
 */
export async function getReferrerForUser(telegramId: number): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_referrer_telegram_id', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error getting referrer:', error)
    return null
  }

  return data
}
