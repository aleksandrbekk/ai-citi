import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { isAdmin, ADMIN_IDS } from '../../config/admins'
import { getTelegramUser } from '../../lib/telegram'

interface Admin {
  id: string
  username: string
  name: string
  telegram_id: number
}

interface AdminAuthState {
  admin: Admin | null
  isLoading: boolean
  // Автоматический вход по Telegram ID
  loginByTelegramId: () => boolean
  // Ручной логин (для dev режима)
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      isLoading: false,

      // Автоматический вход по Telegram ID
      loginByTelegramId: () => {
        const tgUser = getTelegramUser()

        if (tgUser?.id && isAdmin(tgUser.id)) {
          set({
            admin: {
              id: String(tgUser.id),
              username: tgUser.username || 'admin',
              name: tgUser.first_name || 'Администратор',
              telegram_id: tgUser.id
            }
          })
          return true
        }
        return false
      },

      // Ручной логин только для dev режима (без пароля в коде!)
      login: async (username: string, password: string) => {
        set({ isLoading: true })

        // Dev режим - проверяем только в dev окружении
        if (import.meta.env.DEV && username === 'dev' && password === 'dev') {
          set({
            isLoading: false,
            admin: {
              id: 'dev-admin',
              username: 'dev',
              name: 'Developer Admin',
              telegram_id: 0
            }
          })
          return true
        }

        // В production пароль не работает - только Telegram ID
        set({ isLoading: false })
        return false
      },

      logout: () => set({ admin: null })
    }),
    { name: 'admin-auth' }
  )
)

// Хелпер для быстрой проверки админа
export const checkIsAdmin = (): boolean => {
  const tgUser = getTelegramUser()
  return isAdmin(tgUser?.id)
}

// Экспортируем для обратной совместимости
export { ADMIN_IDS, isAdmin }
