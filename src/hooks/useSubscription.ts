import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export type SubscriptionPlan = 'free' | 'pro' | 'elite'

export interface SubscriptionFeature {
  id: string
  name: string
  description: string
  min_plan: SubscriptionPlan
  has_access: boolean
}

export interface UserSubscription {
  id: string
  plan: SubscriptionPlan
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  started_at: string
  expires_at: string
  next_charge_at: string | null
  amount_rub: number
  neurons_per_month: number
}

export interface UserFeatures {
  user_plan: SubscriptionPlan
  plan_level: number
  features: SubscriptionFeature[]
}

// Получить активную подписку пользователя
export function useSubscription() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['subscription', user?.telegram_id],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!user?.telegram_id) return null

      const { data, error } = await supabase.rpc('get_active_subscription', {
        p_telegram_id: user.telegram_id
      })

      if (error) {
        console.error('Error fetching subscription:', error)
        return null
      }

      return data?.[0] || null
    },
    enabled: !!user?.telegram_id
  })
}

// Получить все функции с флагом доступа
export function useUserFeatures() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['user-features', user?.telegram_id],
    queryFn: async (): Promise<UserFeatures> => {
      if (!user?.telegram_id) {
        return { user_plan: 'free', plan_level: 0, features: [] }
      }

      const { data, error } = await supabase.rpc('get_user_features', {
        p_telegram_id: user.telegram_id
      })

      if (error) {
        console.error('Error fetching user features:', error)
        return { user_plan: 'free', plan_level: 0, features: [] }
      }

      return data as UserFeatures
    },
    enabled: !!user?.telegram_id
  })
}

// Проверить доступ к конкретной функции
export function useFeatureAccess(featureId: string) {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['feature-access', user?.telegram_id, featureId],
    queryFn: async (): Promise<{ has_access: boolean; required_plan: SubscriptionPlan }> => {
      if (!user?.telegram_id) {
        return { has_access: false, required_plan: 'pro' }
      }

      const { data, error } = await supabase.rpc('check_feature_access', {
        p_telegram_id: user.telegram_id,
        p_feature_id: featureId
      })

      if (error) {
        console.error('Error checking feature access:', error)
        return { has_access: false, required_plan: 'pro' }
      }

      return {
        has_access: data?.has_access || false,
        required_plan: data?.required_plan || 'pro'
      }
    },
    enabled: !!user?.telegram_id && !!featureId
  })
}

// Получить скидку на стили
export function useStyleDiscount() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['style-discount', user?.telegram_id],
    queryFn: async (): Promise<number> => {
      if (!user?.telegram_id) return 0

      const { data, error } = await supabase.rpc('get_style_discount', {
        p_telegram_id: user.telegram_id
      })

      if (error) {
        console.error('Error fetching style discount:', error)
        return 0
      }

      return data || 0
    },
    enabled: !!user?.telegram_id
  })
}

// Получить количество доступных стилей
export function useAvailableStylesCount() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['available-styles-count', user?.telegram_id],
    queryFn: async (): Promise<number> => {
      if (!user?.telegram_id) return 5

      const { data, error } = await supabase.rpc('get_available_styles_count', {
        p_telegram_id: user.telegram_id
      })

      if (error) {
        console.error('Error fetching available styles count:', error)
        return 5
      }

      return data || 5
    },
    enabled: !!user?.telegram_id
  })
}

// Feature IDs для использования в приложении
export const FEATURES = {
  AI_ACADEMY: 'ai_academy',
  CLOSED_CLUB: 'closed_club',
  TRANSCRIBER_BOT: 'transcriber_bot',
  STYLE_DISCOUNT: 'style_discount',
  EXTRA_STYLES: 'extra_styles',
  PRIORITY_GENERATION: 'priority_generation',
  STYLE_COUPON: 'style_coupon'
} as const
