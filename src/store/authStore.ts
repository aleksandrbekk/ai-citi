import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { getTelegramUser, getInitData } from '../lib/telegram'

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
  id?: string
  user_id?: string
  level: number
  xp: number
  xp_to_next_level: number
  coins: number
  premium_coins: number
  subscription: 'free' | 'pro' | 'business'
  subscription_expires_at?: string | null
  stats: {
    learning: number
    content: number
    sales: number
    discipline: number
  }
  created_at?: string
  updated_at?: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
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

      login: async () => {
        set({ isLoading: true, error: null })

        try {
          const initData = getInitData()
          const telegramUser = getTelegramUser()

          // Если нет данных Telegram — работаем в режиме браузера (dev)
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

          // Вызываем Edge Function для авторизации
          const { data, error } = await supabase.functions.invoke('auth-telegram', {
            body: { initData },
          })

          if (error) throw error

          set({
            user: data.user,
            profile: data.profile,
            isLoading: false,
            isAuthenticated: true,
          })
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
        })
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
      partialize: (state) => ({ user: state.user, profile: state.profile }),
    }
  )
)
