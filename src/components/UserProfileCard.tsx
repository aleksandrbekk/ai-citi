import { Check, Hexagon } from 'lucide-react'
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
    <div className="px-4 pt-4 pb-2" style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px) + 16px)' }}>
      <div className="bg-zinc-900/80 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800/50 flex items-center gap-3 shadow-lg">
        {/* Аватар */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={fullName}
              className="w-12 h-12 rounded-full object-cover border-2 border-zinc-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-cyan-500/20 border-2 border-zinc-700 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* Информация о пользователе */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-semibold text-base truncate">
              {fullName}
            </span>
            {hasActiveSubscription && (
              <Check className="w-4 h-4 text-[#FFD700] flex-shrink-0" strokeWidth={2.5} />
            )}
          </div>
          {subscriptionDate && hasActiveSubscription && (
            <p className="text-zinc-400 text-xs">
              До: {subscriptionDate}
            </p>
          )}
          {!hasActiveSubscription && (
            <p className="text-zinc-500 text-xs">
              Без подписки
            </p>
          )}
        </div>

        {/* Иконка справа */}
        <div className="flex-shrink-0">
          <Hexagon className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
