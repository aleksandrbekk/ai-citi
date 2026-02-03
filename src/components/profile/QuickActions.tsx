import { Plus, Users, Clock, QrCode } from 'lucide-react'
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
  return (
    <div className="space-y-3">
      {/* Главная CTA — Купить нейроны */}
      <button
        onClick={() => {
          haptic.tap()
          onBuyCoins()
        }}
        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-lg font-semibold">Купить нейроны</span>
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <span className="text-sm">→</span>
        </div>
      </button>

      {/* Вторичные действия */}
      <div className="grid grid-cols-2 gap-3">
        {/* Партнёры */}
        <button
          onClick={() => {
            haptic.tap()
            onPartners()
          }}
          className="bg-white rounded-2xl p-4 flex flex-col items-start border border-gray-100 hover:border-cyan-200 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl flex items-center justify-center mb-3 shadow-md shadow-cyan-500/20">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold text-gray-900">Партнёры</span>
          {referralsCount > 0 && (
            <span className="text-sm text-gray-500 mt-0.5">{referralsCount} чел.</span>
          )}
        </button>

        {/* История */}
        <button
          onClick={() => {
            haptic.tap()
            onHistory()
          }}
          className="bg-white rounded-2xl p-4 flex flex-col items-start border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98]"
        >
          <div className="w-11 h-11 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-gray-600" />
          </div>
          <span className="text-base font-semibold text-gray-900">История</span>
          <span className="text-sm text-gray-500 mt-0.5">Транзакции</span>
        </button>
      </div>

      {/* QR код */}
      <button
        onClick={() => {
          haptic.tap()
          onQRCode()
        }}
        className="w-full bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 flex items-center justify-center gap-3 border border-gray-100 transition-all duration-200 cursor-pointer active:scale-[0.99]"
      >
        <QrCode className="w-5 h-5 text-gray-600" />
        <span className="text-base font-medium text-gray-700">Пригласить по QR-коду</span>
      </button>
    </div>
  )
}
