import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  telegram_id: number
  username: string | null
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  language_code: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  level: number
  xp: number
  xp_to_next_level: number
  coins: number
  premium_coins: number
  subscription: 'free' | 'pro' | 'business'
  subscription_expires_at: string | null
  stats: {
    learning: number
    content: number
    sales: number
    discipline: number
  }
  created_at: string
  updated_at: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  login: (initData: string) => Promise<void>
  logout: () => void
  setLoading: (loading: boolean) => void
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,

      login: async (initData: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/auth-telegram`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ initData }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Authentication failed')
          }

          const { user, profile } = await response.json()
          
          set({
            user,
            profile,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error) {
          console.error('Login error:', error)
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
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

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

