import { useRef, useEffect } from 'react'
import { X, DollarSign, Euro, Coins } from 'lucide-react'

// Extended Russian Ruble implementation since lucide-react might not have it or it differs
const Ruble = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M6 3h9a4 4 0 0 1 0 8H6" />
        <path d="M6 15h9" />
        <path d="M11 11H6" />
        <path d="M6 21V3" />
    </svg>
)

export type Currency = 'RUB' | 'USD' | 'EUR'

interface CurrencySelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (currency: Currency) => void
    amountRub: number
    title?: string
}

export function CurrencySelectionModal({ isOpen, onClose, onSelect, amountRub, title = 'Выберите валюту' }: CurrencySelectionModalProps) {
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Approximate conversions for display context (actual logic is on backend)
    const priceUsd = Math.ceil(amountRub / 90)
    const priceEur = Math.ceil(amountRub / 100)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 border border-white/20 animate-in zoom-in-95 duration-200"
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-500 shadow-inner">
                        <Coins size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1">В какой валюте вам удобнее платить?</p>
                </div>

                <div className="space-y-3">
                    <button
                        onClick={() => onSelect('RUB')}
                        className="w-full relative group p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                <Ruble className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900">Рубли (RUB)</p>
                                <p className="text-xs text-gray-500">Карты РФ</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-gray-900 text-lg">₽</span>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('USD')}
                        className="w-full relative group p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-green-500 hover:bg-green-50 transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold">
                                <DollarSign className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900">Dollars (USD)</p>
                                <p className="text-xs text-gray-500">Intl. Cards</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-gray-900 text-lg">$</span>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('EUR')}
                        className="w-full relative group p-4 border-2 border-gray-100 rounded-2xl flex items-center justify-between hover:border-indigo-500 hover:bg-indigo-50 transition-all active:scale-[0.98]"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                <Euro className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-gray-900">Euro (EUR)</p>
                                <p className="text-xs text-gray-500">EU Cards</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-gray-900 text-lg">€</span>
                        </div>
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-[10px] text-gray-400">
                        Безопасная оплата через Lava.top
                        <br />
                        Комиссия может зависеть от выбранного способа оплаты
                    </p>
                </div>
            </div>
        </div>
    )
}
