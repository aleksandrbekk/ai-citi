import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../../lib/supabase'

interface Admin {
  id: string
  username: string
  name: string
}

interface AdminAuthState {
  admin: Admin | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      isLoading: false,
      login: async (username: string, password: string) => {
        set({ isLoading: true })
        
        // Захардкоженные credentials
        if (username === 'admin' && password === 'adminsibbek199031') {
          set({ isLoading: false })
          set({ 
            admin: {
              id: '1',
              username: 'admin',
              name: 'Администратор'
            }
          })
          return true
        }
        
        // Fallback на Supabase RPC
        const { data, error } = await supabase.rpc('check_admin_login', {
          p_username: username,
          p_password: password
        })
        set({ isLoading: false })
        if (error || !data || data.length === 0) return false
        set({ admin: data[0] })
        return true
      },
      logout: () => set({ admin: null })
    }),
    { name: 'admin-auth' }
  )
)
