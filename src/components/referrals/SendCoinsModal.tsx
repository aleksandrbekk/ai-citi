import { X, Send, Check, AlertCircle, Loader2, Coins } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { haptic } from '@/lib/haptic'
import { useTransferCoins } from '@/hooks/useTransferCoins'
import { getCoinBalance } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

interface Partner {
  telegram_id: number
  username: string | null
  first_name: string | null
  created_at: string
}

interface SendCoinsModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (amount: number, newBalance: number) => void
  partner: Partner | null
}

export function SendCoinsModal({
  isOpen,
  onClose,
  onSuccess,
  partner
}: SendCoinsModalProps) {
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ message: string; amount: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const telegramUser = getTelegramUser()
  const { transferToPartner, isLoading } = useTransferCoins()

  // Загружаем баланс при открытии
  useEffect(() => {
    if (isOpen && telegramUser?.id) {
      getCoinBalance(telegramUser.id).then(setBalance)
    }
  }, [isOpen, telegramUser?.id])

  // Автофокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Сброс состояния при закрытии
  useEffect(() => {
    if (!isOpen) {
      setAmount('')
      setError(null)
      setSuccess(null)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!amount || !telegramUser?.id || !partner) return

    const amountNum = parseInt(amount, 10)

    if (isNaN(amountNum) || amountNum < 1) {
      setError('Минимум 1 нейрон')
      haptic.error()
      return
    }

    if (balance !== null && amountNum > balance) {
      setError('Недостаточно нейронов')
      haptic.error()
      return
    }

    setError(null)

    const result = await transferToPartner(
      telegramUser.id,
      partner.telegram_id,
      amountNum
    )

    if (result.success) {
      haptic.success()
      setSuccess({
        message: 'Нейроны отправлены!',
        amount: amountNum
      })
      setTimeout(() => {
        onSuccess(amountNum, result.sender_new_balance || 0)
        handleClose()
      }, 2000)
    } else {
      haptic.error()
      setError(result.error || 'Ошибка перевода')
    }
  }

  const handleClose = () => {
    setAmount('')
    setError(null)
    setSuccess(null)
    onClose()
  }

  const handleAmountChange = (value: string) => {
    // Только цифры
    const filtered = value.replace(/[^0-9]/g, '')
    setAmount(filtered)
    setError(null)
  }

  if (!isOpen || !partner) return null

  const partnerName = partner.first_name || partner.username || `ID: ${partner.telegram_id}`
  const amountNum = parseInt(amount, 10) || 0
  const canSend = amountNum >= 1 && (balance === null || amountNum <= balance) && !isLoading && !success

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Partner Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-cyan-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            {partner.first_name?.[0]?.toUpperCase() || partner.username?.[0]?.toUpperCase() || '?'}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mt-3 text-center">
            Отправить нейроны
          </h2>
          <p className="text-sm text-gray-500 text-center">
            {partnerName}
          </p>
        </div>

        {/* Balance */}
        <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-gray-50 rounded-xl">
          <Coins className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-gray-600">Ваш баланс:</span>
          <span className="font-bold text-gray-900">
            {balance !== null ? balance : '...'} нейронов
          </span>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label htmlFor="send-amount" className="sr-only">
            Количество нейронов
          </label>
          <input
            ref={inputRef}
            id="send-amount"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSend) {
                handleSubmit()
              }
            }}
            placeholder="Введите количество"
            autoComplete="off"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-bold text-lg placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
            disabled={isLoading || !!success}
            maxLength={6}
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2 mb-4">
          {[1, 5, 10].map((num) => (
            <button
              key={num}
              onClick={() => {
                setAmount(String(num))
                setError(null)
                haptic.tap()
              }}
              disabled={isLoading || !!success || (balance !== null && balance < num)}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {num}
            </button>
          ))}
          {balance !== null && balance > 0 && (
            <button
              onClick={() => {
                setAmount(String(balance))
                setError(null)
                haptic.tap()
              }}
              disabled={isLoading || !!success}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Все
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-700">{success.message}</p>
              <p className="text-xs text-green-600">-{success.amount} нейронов</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Отправка...
            </>
          ) : success ? (
            <>
              <Check className="w-5 h-5" />
              Отправлено!
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Отправить {amountNum > 0 ? amountNum : ''} нейронов
            </>
          )}
        </button>

        {/* Hint */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Нейроны будут зачислены партнёру мгновенно
        </p>
      </div>
    </div>
  )
}
