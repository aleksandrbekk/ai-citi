import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { getTelegramUser, getInitData, getTelegramWebApp, getStartParam } from '../lib/telegram'

export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string
  last_name: string | null
  avatar_url: string | null
  language_code?: string
  created_at?: string
  updated_at?: string
}

export interface Profile {
  level: number
  xp: number
  xp_to_next_level: number
  coins: number
  premium_coins: number
  subscription: 'free' | 'pro' | 'business'
  stats: {
    learning: number
    content: number
    sales: number
    discipline: number
  }
  id?: string
  user_id?: string
  subscription_expires_at?: string | null
  created_at?: string
  updated_at?: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  tariffs: string[]
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  debugInfo: string | null
  login: () => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<Profile>) => void
  setTariffs: (tariffs: string[]) => void
  hasPremium: () => boolean
}

const DEFAULT_PROFILE: Profile = {
  level: 1,
  xp: 0,
  xp_to_next_level: 100,
  coins: 0, // Новые пользователи без монет, но с 1 бесплатной генерацией
  premium_coins: 0,
  subscription: 'free',
  stats: { learning: 0, content: 0, sales: 0, discipline: 0 },
}

// Таймаут для fetch запросов
const fetchWithTimeout = async (promise: Promise<any>, timeoutMs: number): Promise<any> => {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  })
  return Promise.race([promise, timeout])
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      tariffs: [],
      isLoading: false,
      isAuthenticated: false,
      error: null,
      debugInfo: null,

      login: async () => {
        // Проверяем startParam для реферальной и промо системы
        const startParam = getStartParam()
        const hasReferral = startParam && startParam.startsWith('ref_')
        const hasPromo = startParam && !startParam.startsWith('ref_') // Промокод - любой startParam не начинающийся с ref_
        const hasSpecialLink = hasReferral || hasPromo
        const telegramUser = getTelegramUser()

        // DEBUG: показываем что нашли
        console.log('🔍 LOGIN DEBUG:', { startParam, hasReferral, hasPromo })

        // КРИТИЧНО: Если есть реферальная или промо ссылка - ОЧИЩАЕМ КЕШ чтобы Edge Function вызвался
        if (hasSpecialLink) {
          console.log('🔥 Special link detected - clearing cache to force Edge Function call')
          localStorage.removeItem('auth-storage')
        }

        // Проверяем, совпадает ли закешированный пользователь с текущим Telegram пользователем
        const cachedUser = get().user
        const isSameUser = cachedUser && telegramUser && cachedUser.telegram_id === telegramUser.id

        // Если уже авторизован тот же пользователь И нет специальной ссылки — обновляем только профиль
        if (get().isAuthenticated && isSameUser && !hasSpecialLink) {
          console.log('Already authenticated, refreshing profile from server...')
          try {
            const cachedUserId = cachedUser?.id
            if (cachedUserId && cachedUserId !== 'dev-user' && !cachedUserId.startsWith('tg-')) {
              const { data: freshProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', cachedUserId)
                .single()

              if (freshProfile) {
                console.log('Profile refreshed, coins:', freshProfile.coins)
                set({ profile: freshProfile })
              }
            }
          } catch (e) {
            console.log('Profile refresh failed, using cached data')
          }
          return
        }

        // Если пользователь другой - очищаем кеш
        if (cachedUser && telegramUser && cachedUser.telegram_id !== telegramUser.id) {
          console.log('Different user detected, clearing cache. Cached:', cachedUser.telegram_id, 'Current:', telegramUser.id)
          localStorage.removeItem('auth-storage')
        }

        // Если есть реферальная ссылка — принудительно вызываем Edge Function
        if (hasReferral) {
          console.log('Referral link detected, forcing Edge Function call:', startParam)
        }

        set({ isLoading: true, error: null })

        try {
          const webApp = getTelegramWebApp()
          const initData = getInitData()

          const debugInfo = {
            hasWebApp: !!webApp,
            hasInitData: !!initData,
            initDataLength: initData?.length || 0,
            initDataPreview: initData?.substring(0, 100) || 'none',
            hasTelegramUser: !!telegramUser,
            telegramUserId: telegramUser?.id || null,
            telegramUserName: telegramUser?.first_name || null,
          }

          console.log('=== FRONTEND AUTH DEBUG ===')
          console.log('debugInfo:', debugInfo)

          set({ debugInfo: JSON.stringify(debugInfo, null, 2) })

          // Если нет данных Telegram — dev режим
          if (!initData || !telegramUser) {
            console.log('No Telegram data, using dev mode')
            set({
              user: {
                id: 'dev-user',
                telegram_id: 0,
                username: 'developer',
                first_name: 'Developer',
                last_name: null,
                avatar_url: null,
              },
              profile: DEFAULT_PROFILE,
              isLoading: false,
              isAuthenticated: true,
            })
            return
          }

          console.log('Calling Edge Function...')
          console.log('initData length:', initData.length)
          console.log('startParam:', startParam)

          // Вызываем Edge Function с таймаутом 10 секунд
          const { data, error } = await fetchWithTimeout(
            supabase.functions.invoke('auth-telegram', {
              body: { initData, startParam },
            }),
            10000
          )

          console.log('Edge Function response:', { data, error })

          if (error) {
            console.error('Edge Function error:', error)
            throw new Error(error.message || 'Auth failed')
          }

          if (!data) {
            console.error('No data in response')
            throw new Error('Empty response from server')
          }

          if (data.error) {
            console.error('Server error:', data.error)
            throw new Error(data.error)
          }

          if (!data.user) {
            console.error('No user in response:', data)
            throw new Error('No user data')
          }

          console.log('Auth successful:', data.user.first_name)

          set({
            user: data.user,
            profile: data.profile || DEFAULT_PROFILE,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          })

        } catch (error: any) {
          console.error('Auth error:', error)

          // При ошибке — пробуем использовать данные из Telegram напрямую
          const telegramUser = getTelegramUser()
          if (telegramUser) {
            console.log('Falling back to Telegram user data')
            set({
              user: {
                id: `tg-${telegramUser.id}`,
                telegram_id: telegramUser.id,
                username: telegramUser.username || null,
                first_name: telegramUser.first_name,
                last_name: telegramUser.last_name || null,
                avatar_url: telegramUser.photo_url || null,
              },
              profile: DEFAULT_PROFILE,
              isLoading: false,
              isAuthenticated: true,
              error: `Offline mode: ${error.message}`,
            })
          } else {
            // Полный fallback на dev режим
            set({
              user: {
                id: 'dev-user',
                telegram_id: 0,
                username: 'developer',
                first_name: 'Developer',
                last_name: null,
                avatar_url: null,
              },
              profile: DEFAULT_PROFILE,
              isLoading: false,
              isAuthenticated: true,
              error: error.message,
            })
          }
        }
      },

      logout: () => {
        localStorage.removeItem('auth-storage')
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          error: null,
          debugInfo: null,
          isLoading: false,
        })
        // Перезагружаем страницу для полной очистки
        window.location.reload()
      },

      updateProfile: (updates) => {
        const currentProfile = get().profile
        if (currentProfile) {
          set({ profile: { ...currentProfile, ...updates } })
        }
      },

      setTariffs: (tariffs) => {
        set({ tariffs })
      },

      hasPremium: () => {
        return get().tariffs.includes('platinum')
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        tariffs: state.tariffs,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)
