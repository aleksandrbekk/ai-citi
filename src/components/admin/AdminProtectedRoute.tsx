import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../hooks/admin/useAdminAuth'
import { getTelegramUser } from '../../lib/telegram'

// Telegram ID админов с автодоступом
const AUTO_ADMIN_IDS = [190202791, 643763835]

export function AdminProtectedRoute() {
  const admin = useAdminAuth((s) => s.admin)

  // Автологин для админов по telegram_id
  useEffect(() => {
    if (admin) return // Уже залогинен

    const tgUser = getTelegramUser()
    if (tgUser?.id && AUTO_ADMIN_IDS.includes(tgUser.id)) {
      // Автоматически устанавливаем админа
      useAdminAuth.setState({
        admin: {
          id: String(tgUser.id),
          username: tgUser.username || 'admin',
          name: tgUser.first_name || 'Администратор'
        }
      })
    }
  }, [admin])

  // Проверяем telegram_id для автодоступа
  const tgUser = getTelegramUser()
  const isAutoAdmin = tgUser?.id && AUTO_ADMIN_IDS.includes(tgUser.id)

  if (!admin && !isAutoAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return <Outlet />
}
