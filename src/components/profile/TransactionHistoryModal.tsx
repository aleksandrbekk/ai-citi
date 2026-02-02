import { X, ArrowUpRight, ArrowDownRight, Coins, Gift, Users, Sparkles, ShoppingCart, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getCoinTransactions, getTransactionStats, type CoinTransaction, type TransactionStats } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

interface TransactionHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TransactionHistoryModal({
  isOpen,
  onClose
}: TransactionHistoryModalProps) {
  const [transactions, setTransactions] = useState<CoinTransaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const telegramUser = getTelegramUser()

  useEffect(() => {
    if (isOpen && telegramUser?.id) {
      loadData()
    }
  }, [isOpen, telegramUser?.id])

  const loadData = async () => {
    if (!telegramUser?.id) return

    setIsLoading(true)
    const [txs, statsData] = await Promise.all([
      getCoinTransactions(telegramUser.id, 50),
      getTransactionStats(telegramUser.id)
    ])
    setTransactions(txs)
    setStats(statsData)
    setIsLoading(false)
  }

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      switch (type) {
        case 'referral':
          return <Users className="w-4 h-4 text-cyan-500" />
        case 'bonus':
        case 'promo':
          return <Sparkles className="w-4 h-4 text-orange-500" />
        case 'gift':
          return <Gift className="w-4 h-4 text-pink-500" />
        case 'purchase':
          return <ShoppingCart className="w-4 h-4 text-green-500" />
        default:
          return <ArrowUpRight className="w-4 h-4 text-green-500" />
      }
    }
    return <ArrowDownRight className="w-4 h-4 text-red-500" />
  }

  const getTransactionLabel = (type: string, amount: number) => {
    if (amount > 0) {
      switch (type) {
        case 'referral':
          return 'Реферал'
        case 'bonus':
          return 'Бонус'
        case 'promo':
          return 'Промокод'
        case 'gift':
          return 'Подарок'
        case 'purchase':
          return 'Покупка'
        case 'subscription':
          return 'Подписка'
        default:
          return 'Начисление'
      }
    }
    switch (type) {
      case 'generation':
        return 'Генерация'
      default:
        return 'Списание'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">История</h2>
              <p className="text-xs text-gray-500">Транзакции монет</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        {stats && !isLoading && (
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-green-600">+{stats.total_earned}</p>
                <p className="text-xs text-green-600/70">Получено</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-red-600">-{stats.total_spent}</p>
                <p className="text-xs text-red-600/70">Потрачено</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-orange-600">{stats.generations_count}</p>
                <p className="text-xs text-orange-600/70">Генераций</p>
              </div>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
              <p className="text-sm text-gray-500">Загрузка истории...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <Coins className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">Нет транзакций</p>
              <p className="text-sm text-gray-400 text-center">
                История появится после первой генерации или пополнения баланса
              </p>
            </div>
          ) : (
            <div className="px-6 py-4 space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {getTransactionIcon(tx.type, tx.amount)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      {getTransactionLabel(tx.type, tx.amount)}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {tx.description || formatDate(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      tx.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </p>
                    <p className="text-xs text-gray-400">
                      = {tx.balance_after}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding for safe area */}
        <div className="h-6" />
      </div>
    </div>
  )
}
