import { Check } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'

export function UserProfileCard() {
  const user = useAuthStore((state) => state.user)
  const profile = useAuthStore((state) => state.profile)

  if (!user || !profile) {
    return null
  }

  // Формируем полное имя
  const fullName = `${user.first_name}${user.last_name ? ` ${user.last_name}` : ''}`

  // Проверяем, есть ли активная подписка
  const hasActiveSubscription = profile.subscription !== 'free' && 
    profile.subscription_expires_at && 
    new Date(profile.subscription_expires_at) > new Date()

  // Форматируем дату окончания подписки
  const subscriptionDate = profile.subscription_expires_at
    ? format(new Date(profile.subscription_expires_at), 'dd.MM.yyyy')
    : null

  return (
    <div className="flex justify-center px-4 pb-3">
      <div className="relative px-4 py-2.5 rounded-full bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 shadow-lg flex items-center gap-2.5 max-w-fit">
        {/* Аватар */}
        <div className="flex-shrink-0 relative">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={fullName}
              className="w-9 h-9 rounded-full object-cover border border-zinc-700"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500/40 to-cyan-500/40 border border-zinc-700 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* Информация о пользователе */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-white font-semibold text-sm truncate">
              {fullName}
            </span>
            {hasActiveSubscription && (
              <Check className="w-3.5 h-3.5 text-[#FFD700] flex-shrink-0" strokeWidth={2.5} />
            )}
          </div>
          {subscriptionDate && hasActiveSubscription ? (
            <p className="text-zinc-400 text-xs">
              До: {subscriptionDate}
            </p>
          ) : (
            <p className="text-zinc-500 text-xs">
              Без подписки
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
