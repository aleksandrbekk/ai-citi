interface BalanceCardProps {
  balance: number
  giftCoins?: number
  spent: number
  earned: number
  isLoading?: boolean
}

export function BalanceCard({
  balance,
  giftCoins = 0,
  spent,
  earned,
  isLoading = false
}: BalanceCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm overflow-hidden">
      {/* Main Balance */}
      <div className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-400 p-5">
        <div className="flex items-center gap-4">
          <img
            src="/neirocoin.png"
            alt="Нейроны"
            className="w-14 h-14 object-contain drop-shadow-lg flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-white/80 text-sm font-medium">Ваш баланс</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <p className="text-4xl font-bold text-white">
                {isLoading ? '...' : balance.toLocaleString()}
              </p>
              <span className="text-lg font-normal text-white/80">нейронов</span>
            </div>
            {giftCoins > 0 && (
              <p className="text-sm text-white/70 mt-1">
                +{giftCoins} подарочных
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex divide-x divide-gray-100">
        <div className="flex-1 py-3 px-4 text-center">
          <p className="text-xs text-gray-500">Потрачено</p>
          <p className="text-lg font-semibold text-gray-900">{spent}</p>
        </div>
        <div className="flex-1 py-3 px-4 text-center">
          <p className="text-xs text-gray-500">Заработано</p>
          <p className="text-lg font-semibold text-orange-500">{earned}</p>
        </div>
      </div>
    </div>
  )
}
