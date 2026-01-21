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
    <div className="px-6 pb-3">
      <div className="relative px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex items-center gap-3">
        {/* Аватар */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={fullName}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/60 shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400/30 to-cyan-400/30 border-2 border-white/60 flex items-center justify-center shadow-sm">
              <span className="text-foreground font-semibold text-base">
                {user.first_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* Информация о пользователе */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-foreground font-semibold text-base truncate">
              {fullName}
            </span>
            {hasActiveSubscription && (
              <Check className="w-4 h-4 text-[#FFD700] flex-shrink-0" strokeWidth={2.5} />
            )}
          </div>
          {subscriptionDate && hasActiveSubscription ? (
            <p className="text-foreground/60 text-xs">
              До: {subscriptionDate}
            </p>
          ) : (
            <p className="text-foreground/50 text-xs">
              Без подписки
            </p>
          )}
        </div>

        {/* Иконка справа */}
        <div className="flex-shrink-0">
          <Hexagon className="w-5 h-5 text-foreground/30" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  )
}
