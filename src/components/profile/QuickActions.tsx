import { ShoppingCart, Users, History, QrCode } from 'lucide-react'
import { haptic } from '@/lib/haptic'

interface QuickActionsProps {
  referralsCount: number
  onBuyCoins: () => void
  onPartners: () => void
  onHistory: () => void
  onQRCode: () => void
}

export function QuickActions({
  referralsCount,
  onBuyCoins,
  onPartners,
  onHistory,
  onQRCode
}: QuickActionsProps) {
  const actions = [
    {
      id: 'buy',
      icon: ShoppingCart,
      label: 'Купить нейроны',
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
      {/* Main Actions Grid - 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        {actions.map(action => {
          const colors = getColorClasses(action.color)
          return (
            <button
              key={action.id}
              onClick={() => {
                haptic.tap()
                action.onClick()
              }}
              className={`group bg-white rounded-2xl p-3 flex flex-col items-center text-center border-2 ${colors.border} hover:shadow-lg ${colors.shadow} transition-all duration-200 cursor-pointer active:scale-[0.98]`}
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors.icon} flex items-center justify-center mb-2 shadow-md group-hover:scale-105 transition-transform duration-200`}>
                <action.icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-gray-900 leading-tight">{action.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{action.subtitle}</p>
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
        className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:border-orange-300 hover:bg-orange-50/50 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      >
        <QrCode className="w-5 h-5 text-orange-500" />
        QR-код для приглашения
      </button>
    </div>
  )
}
