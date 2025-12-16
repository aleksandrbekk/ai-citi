import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { getTelegramUser, getInitData, getTelegramWebApp } from '../lib/telegram'

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
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  debugInfo: string | null
  login: () => Promise<void>
  logout: () => void
  updateProfile: (updates: Partial<Profile>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      debugInfo: null,

      login: async () => {
        set({ isLoading: true, error: null })

        try {
          // Отладочная информация
          const webApp = getTelegramWebApp()
          const initData = getInitData()
          const telegramUser = getTelegramUser()
          
          const debugInfo = {
            hasWebApp: !!webApp,
            hasInitData: !!initData,
            initDataLength: initData?.length || 0,
            hasTelegramUser: !!telegramUser,
            telegramUser: telegramUser,
          }
          
          console.log('=== AUTH DEBUG ===')
          console.log('WebApp:', webApp)
          console.log('initData:', initData)
          console.log('telegramUser:', telegramUser)
          console.log('debugInfo:', debugInfo)
          console.log('==================')

          set({ debugInfo: JSON.stringify(debugInfo, null, 2) })

          // Если нет initData — пробуем подождать и проверить ещё раз
          if (!initData || !telegramUser) {
            console.log('No Telegram data on first try, waiting 500ms...')
            
            await new Promise(resolve => setTimeout(resolve, 500))
            
            const initDataRetry = getInitData()
            const telegramUserRetry = getTelegramUser()
            
            console.log('After wait - initData:', initDataRetry)
            console.log('After wait - telegramUser:', telegramUserRetry)
            
            if (!initDataRetry || !telegramUserRetry) {
              console.log('Still no Telegram data, using dev mode')
              set({
                user: {
                  id: 'dev-user',
                  telegram_id: 0,
                  username: 'developer',
                  first_name: 'Developer',
                  last_name: null,
                  avatar_url: null,
                },
                profile: {
                  level: 1,
                  xp: 0,
                  xp_to_next_level: 100,
                  coins: 0,
                  premium_coins: 0,
                  subscription: 'free',
                  stats: { learning: 0, content: 0, sales: 0, discipline: 0 },
                },
                isLoading: false,
                isAuthenticated: true,
              })
              return
            }
          }

          // Получаем актуальные данные после возможного ожидания
          const finalInitData = getInitData()!

          console.log('Calling Edge Function with initData...')

          // Вызываем Edge Function для авторизации
          const { data, error } = await supabase.functions.invoke('auth-telegram', {
            body: { initData: finalInitData },
          })

          console.log('Edge Function response:', { data, error })

          if (error) {
            console.error('Edge Function error:', error)
            throw error
          }

          if (!data || !data.user) {
            console.error('No user in response:', data)
            throw new Error('No user data in response')
          }

          set({
            user: data.user,
            profile: data.profile,
            isLoading: false,
            isAuthenticated: true,
          })
          
          console.log('Auth successful:', data.user.first_name)

        } catch (error: any) {
          console.error('Auth error:', error)
          set({
            error: error.message || 'Ошибка авторизации',
            isLoading: false,
            isAuthenticated: false,
          })
        }
      },

      logout: () => {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          error: null,
          debugInfo: null,
        })
        // Очищаем localStorage
        localStorage.removeItem('auth-storage')
      },

      updateProfile: (updates) => {
        const currentProfile = get().profile
        if (currentProfile) {
          set({ profile: { ...currentProfile, ...updates } })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        profile: state.profile,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)
