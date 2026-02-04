import { X, LogOut, CreditCard, Loader2, AlertTriangle } from 'lucide-react'
import { haptic } from '@/lib/haptic'
import { useState } from 'react'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  hasActiveSubscription?: boolean
  subscriptionPlan?: string
  subscriptionExpiry?: string
  onCancelSubscription?: () => Promise<void>
}

export function SettingsDrawer({
  isOpen,
  onClose,
  onLogout,
  hasActiveSubscription,
  subscriptionPlan,
  subscriptionExpiry,
  onCancelSubscription
}: SettingsDrawerProps) {
  const [isCancelling, setIsCancelling] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (!isOpen) return null

  const handleCancelSubscription = async () => {
    if (!onCancelSubscription) return

    setIsCancelling(true)
    try {
      await onCancelSubscription()
      setShowConfirm(false)
    } finally {
      setIsCancelling(false)
    }
  }

  const formatPlanName = (plan: string) => {
    const names: Record<string, string> = {
      'pro': 'PRO',
      'elite': 'ELITE',
      'PRO': 'PRO',
      'ELITE': 'ELITE'
    }
    return names[plan] || plan.toUpperCase()
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 safe-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Настройки</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Subscription Management */}
        <div className="px-6 py-6">
          {hasActiveSubscription ? (
            <>
              {/* Active Subscription Card */}
              <div className="bg-gradient-to-r from-orange-50 to-cyan-50 rounded-2xl p-4 mb-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      Подписка {formatPlanName(subscriptionPlan || '')}
                    </p>
                    <p className="text-sm text-gray-500">
                      {subscriptionExpiry ? `Активна ${subscriptionExpiry}` : 'Активна'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cancel Button / Confirm */}
              {!showConfirm ? (
                <button
                  onClick={() => {
                    haptic.tap()
                    setShowConfirm(true)
                  }}
                  className="w-full py-3 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-colors cursor-pointer text-sm"
                >
                  Отменить подписку
                </button>
              ) : (
                <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-100">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">Отменить подписку?</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Доступ сохранится до конца оплаченного периода.
                        Нейроны на балансе останутся.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl cursor-pointer"
                    >
                      Назад
                    </button>
                    <button
                      onClick={() => {
                        haptic.tap()
                        handleCancelSubscription()
                      }}
                      disabled={isCancelling}
                      className="flex-1 py-2.5 bg-red-500 text-white font-medium rounded-xl cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Отмена...
                        </>
                      ) : (
                        'Подтвердить'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">У вас нет активной подписки</p>
              <p className="text-sm text-gray-400 mt-1">
                Оформите подписку в магазине для получения нейронов ежемесячно
              </p>
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="px-6 pb-12 pt-4 border-t border-gray-100">
          <button
            onClick={() => {
              haptic.tap()
              onLogout()
            }}
            className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            Выйти из аккаунта
          </button>
        </div>
      </div>
    </div>
  )
}
