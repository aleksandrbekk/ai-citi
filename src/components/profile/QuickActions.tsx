import { ShoppingCart, Users, History, Ticket, QrCode } from 'lucide-react'
import { haptic } from '@/lib/haptic'

interface QuickActionsProps {
  referralsCount: number
  onBuyCoins: () => void
  onPartners: () => void
  onHistory: () => void
  onPromoCode: () => void
  onQRCode: () => void
}

export function QuickActions({
  referralsCount,
  onBuyCoins,
  onPartners,
  onHistory,
  onPromoCode,
  onQRCode
}: QuickActionsProps) {
  const actions = [
    {
      id: 'buy',
      icon: ShoppingCart,
      label: 'Купить монеты',
      subtitle: 'Пополнить баланс',
      color: 'orange',
      onClick: onBuyCoins
    },
    {
      id: 'partners',
      icon: Users,
      label: 'Партнёры',
      subtitle: `${referralsCount} приглашённых`,
      color: 'cyan',
      onClick: onPartners
    },
    {
      id: 'history',
      icon: History,
      label: 'История',
      subtitle: 'Транзакции',
      color: 'gray',
      onClick: onHistory
    },
    {
      id: 'promo',
      icon: Ticket,
      label: 'Промокод',
      subtitle: 'Ввести код',
      color: 'gray',
      onClick: onPromoCode
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'orange':
        return {
          border: 'border-orange-200 hover:border-orange-400',
          icon: 'from-orange-400 to-orange-500 shadow-orange-500/20',
          shadow: 'hover:shadow-orange-500/10'
        }
      case 'cyan':
        return {
          border: 'border-cyan-200 hover:border-cyan-400',
          icon: 'from-cyan-400 to-cyan-500 shadow-cyan-500/20',
          shadow: 'hover:shadow-cyan-500/10'
        }
      default:
        return {
          border: 'border-gray-200 hover:border-gray-300',
          icon: 'from-gray-400 to-gray-500 shadow-gray-500/20',
          shadow: 'hover:shadow-gray-500/10'
        }
    }
  }

  return (
    <div className="space-y-3">
      {/* Main Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map(action => {
          const colors = getColorClasses(action.color)
          return (
            <button
              key={action.id}
              onClick={() => {
                haptic.tap()
                action.onClick()
              }}
              className={`group bg-white rounded-2xl p-4 flex flex-col text-left border-2 ${colors.border} hover:shadow-lg ${colors.shadow} transition-all duration-200 cursor-pointer active:scale-[0.98]`}
            >
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center mb-2.5 shadow-md group-hover:scale-105 transition-transform duration-200`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.subtitle}</p>
            </button>
          )
        })}
      </div>

      {/* QR Code Button */}
      <button
        onClick={() => {
          haptic.tap()
          onQRCode()
        }}
        className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-50 to-orange-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:border-orange-300 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      >
        <QrCode className="w-5 h-5 text-orange-500" />
        Показать QR-код для приглашения
      </button>
    </div>
  )
}
