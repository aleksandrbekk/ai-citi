import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { getStartParam } from '@/lib/telegram'
import { useAuthStore } from '@/store/authStore'
import { triggerCoinReward } from '@/components/CoinReward'

interface PromoResult {
    success: boolean
    coins?: number
    message?: string
    error?: string
}

/**
 * Хук для обработки промокодов из startParam
 * Формат ссылки: https://t.me/Neirociti_bot?start=BONUS50
 * 
 * Промокод активируется один раз для каждого пользователя
 */
export function usePromoCode() {
    const { user, isAuthenticated, updateProfile, profile } = useAuthStore()
    const [isChecking, setIsChecking] = useState(false)
    const [promoResult, setPromoResult] = useState<PromoResult | null>(null)
    const processedRef = useRef(false)

    useEffect(() => {
        // Пропускаем если уже обработали или не авторизован
        if (processedRef.current || !isAuthenticated || !user) return

        const startParam = getStartParam()

        // Пропускаем реферальные ссылки (они обрабатываются отдельно)
        if (!startParam || startParam.startsWith('ref_')) return

        // Это промокод — обрабатываем
        console.log('🎁 [usePromoCode] Processing promo code:', startParam)
        const claimPromoCode = async () => {
            processedRef.current = true
            setIsChecking(true)

            console.log('🎁 Claiming promo code:', startParam)

            try {
                const { data, error } = await supabase.rpc('claim_promo_code', {
                    p_code: startParam,
                    p_user_id: user.telegram_id.toString()
                })

                if (error) {
                    console.error('Promo claim error:', error)
                    setPromoResult({ success: false, error: error.message })
                    return
                }

                const result = data as PromoResult
                setPromoResult(result)

                if (result.success && result.coins) {
                    // Обновляем профиль локально
                    const currentCoins = profile?.coins || 0
                    updateProfile({ coins: currentCoins + result.coins })

                    // Показываем красивую анимацию начисления
                    triggerCoinReward(result.coins, result.message || 'Бонус активирован!')

                    console.log('✅ Promo claimed successfully:', result)
                } else if (result.error) {
                    // Не показываем ошибку "уже активировали" — просто логируем
                    console.log('⚠️ Promo not claimed:', result.error)
                }

            } catch (err) {
                console.error('Promo claim exception:', err)
                setPromoResult({ success: false, error: 'Ошибка при активации промокода' })
            } finally {
                setIsChecking(false)
            }
        }

        // Небольшая задержка чтобы авторизация точно завершилась
        const timer = setTimeout(claimPromoCode, 1000)
        return () => clearTimeout(timer)

    }, [isAuthenticated, user, profile, updateProfile])

    return { isChecking, promoResult }
}
