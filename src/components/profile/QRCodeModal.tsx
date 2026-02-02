import { X, Copy, Check, Share2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { haptic } from '@/lib/haptic'
import QRCode from 'qrcode'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  referralLink: string
  referralCode: string
}

export function QRCodeModal({
  isOpen,
  onClose,
  referralLink,
  referralCode
}: QRCodeModalProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')

  useEffect(() => {
    if (isOpen && referralLink) {
      generateQRCode()
    }
  }, [isOpen, referralLink])

  const generateQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(referralLink, {
        width: 256,
        margin: 2,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
    } catch (err) {
      console.error('QR Code generation failed:', err)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      haptic.success()
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AI CITI',
          text: 'Присоединяйся к AI CITI!',
          url: referralLink
        })
        haptic.success()
      } catch (err) {
        // User cancelled
      }
    } else {
      handleCopy()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
          Пригласи друга
        </h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Отсканируй QR-код или поделись ссылкой
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-white rounded-2xl border-2 border-orange-200 shadow-lg shadow-orange-500/10">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
            )}
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Ваш код:</p>
          <p className="font-mono font-bold text-lg text-gray-900">{referralCode}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200 cursor-pointer ${
              isCopied
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-5 h-5" />
                Скопировано
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Копировать
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-orange-500/25 transition-all duration-200 cursor-pointer"
          >
            <Share2 className="w-5 h-5" />
            Поделиться
          </button>
        </div>
      </div>
    </div>
  )
}
