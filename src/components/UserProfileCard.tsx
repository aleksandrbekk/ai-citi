import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'

export function UserProfileCard() {
  const navigate = useNavigate()
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

  const subscriptionLabel =
    profile.subscription === 'business' ? 'BUSINESS' :
    profile.subscription === 'pro' ? 'PRO' :
    null

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      className="group flex items-center gap-3 rounded-full bg-white/75 backdrop-blur-2xl border border-black/5 shadow-[0_10px_30px_rgba(0,0,0,0.12)] px-3 py-2 max-w-[320px] w-full"
      aria-label="Открыть профиль"
    >
      {/* Аватар */}
      <div className="flex-shrink-0">
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={fullName}
            className="w-9 h-9 rounded-full object-cover ring-1 ring-black/10 shadow-sm"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400/35 to-cyan-400/35 ring-1 ring-black/10 flex items-center justify-center shadow-sm">
            <span className="text-foreground font-semibold text-sm">
              {user.first_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        )}
      </div>

      {/* Текст */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-foreground truncate">
            {fullName}
          </span>
          {hasActiveSubscription && subscriptionLabel && (
            <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white bg-gradient-to-r from-orange-400 to-orange-500 shadow-sm">
              {subscriptionLabel}
            </span>
          )}
        </div>

        <div className="text-[11px] text-foreground/60 truncate">
          {subscriptionDate && hasActiveSubscription ? `До: ${subscriptionDate}` : 'Без подписки'}
        </div>
      </div>

      {/* affordance */}
      <div className="flex-shrink-0 text-foreground/35 group-hover:text-foreground/55 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  )
}
