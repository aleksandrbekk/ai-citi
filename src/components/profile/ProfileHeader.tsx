import { Settings, Crown, ChevronRight, User } from 'lucide-react'
import { haptic } from '@/lib/haptic'

interface ProfileHeaderProps {
  firstName: string
  photoUrl?: string
  tariffName: string
  tariffExpiry: string
  isFreeTariff: boolean
  isLoading?: boolean
  onSettingsClick: () => void
  onUpgradeClick: () => void
}

export function ProfileHeader({
  firstName,
  photoUrl,
  tariffName,
  tariffExpiry,
  isFreeTariff,
  isLoading = false,
  onSettingsClick,
  onUpgradeClick
}: ProfileHeaderProps) {
  return (
    <div className="px-4 pt-6 pb-4">
      {/* Settings Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => {
            haptic.tap()
            onSettingsClick()
          }}
          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          aria-label="Настройки"
        >
          <Settings className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Profile Info */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/20">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={firstName}
                className="w-full h-full rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-bold text-orange-500">
                {firstName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-[3px] border-white shadow-sm" />
        </div>

        {/* Name & Tariff */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">
            {firstName}
          </h1>

          {/* Tariff Badge with Loading State */}
          <div className="mt-1 flex items-center gap-1.5">
            {isLoading ? (
              <>
                <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
              </>
            ) : isFreeTariff ? (
              /* FREE тариф — без короны и без срока */
              <>
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">
                  Бесплатная подписка
                </span>
              </>
            ) : (
              /* Платные тарифы — с короной и сроком */
              <>
                <Crown className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-amber-600">
                  {tariffName}
                </span>
                {tariffExpiry && (
                  <span className="text-xs text-gray-400">
                    {tariffExpiry}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Upgrade Button - only show when loaded and free */}
          {!isLoading && isFreeTariff && (
            <button
              onClick={() => {
                haptic.tap()
                onUpgradeClick()
              }}
              className="mt-2 flex items-center gap-1 text-sm text-orange-500 font-medium hover:text-orange-600 transition-colors cursor-pointer"
            >
              Улучшить тариф
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
