import { X, Ticket, Check, AlertCircle, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { haptic } from '@/lib/haptic'
import { redeemPromoCode } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

interface PromoCodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (coinsAdded: number) => void
}

export function PromoCodeModal({
  isOpen,
  onClose,
  onSuccess
}: PromoCodeModalProps) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ message: string; coins: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const telegramUser = getTelegramUser()

  // Автофокус на input при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!code.trim() || !telegramUser?.id) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    const result = await redeemPromoCode(telegramUser.id, code)

    setIsLoading(false)

    if (result.success) {
      haptic.success()
      setSuccess({
        message: 'Промокод активирован!',
        coins: result.coins_added || 0
      })
      setTimeout(() => {
        onSuccess(result.coins_added || 0)
        setCode('')
        setSuccess(null)
        onClose()
      }, 2000)
    } else {
      haptic.error()
      setError(result.error || 'Неизвестная ошибка')
    }
  }

  const handleClose = () => {
    setCode('')
    setError(null)
    setSuccess(null)
    onClose()
  }

  if (!isOpen) return null

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
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
            <Ticket className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Активировать промокод
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Введите промокод для получения бонусных монет
        </p>

        {/* Input */}
        <div className="mb-4">
          <label htmlFor="promo-code" className="sr-only">
            Промокод
          </label>
          <input
            ref={inputRef}
            id="promo-code"
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && code.trim() && !isLoading && !success) {
                handleSubmit()
              }
            }}
            placeholder="ВВЕДИТЕ КОД"
            autoComplete="off"
            autoCapitalize="characters"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center font-mono font-bold text-lg tracking-wider placeholder:text-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 transition-all"
            disabled={isLoading || !!success}
            maxLength={20}
            aria-describedby="promo-hint"
          />
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
              <p className="text-xs text-green-600">+{success.coins} монет</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!code.trim() || isLoading || !!success}
          className="w-full py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Проверка...
            </>
          ) : success ? (
            <>
              <Check className="w-5 h-5" />
              Готово!
            </>
          ) : (
            'Активировать'
          )}
        </button>

        {/* Hint */}
        <p id="promo-hint" className="text-xs text-gray-400 text-center mt-4">
          Промокод можно использовать только один раз
        </p>
      </div>
    </div>
  )
}
