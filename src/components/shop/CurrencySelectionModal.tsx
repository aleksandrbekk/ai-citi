import { useRef, useEffect } from 'react'

export type Currency = 'RUB' | 'USD' | 'EUR'

interface CurrencySelectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (currency: Currency) => void
    title?: string
}

export function CurrencySelectionModal({ isOpen, onClose, onSelect, title = 'Выберите валюту' }: CurrencySelectionModalProps) {
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                ref={modalRef}
                className="relative w-full max-w-[340px] bg-white rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl border border-white/20"
            >
                {/* Header */}
                <div className="pt-8 pb-4 text-center px-6 relative">
                    <button
                        onClick={onClose}
                        className="absolute left-6 top-8 p-1 text-gray-400 hover:text-gray-900 transition-colors z-10"
                    >
                        <div className="flex items-center gap-1">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </div>
                    </button>

                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h3>
                    <p className="text-[13px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Visa, Mastercard, МИР</p>
                </div>

                {/* Plaques */}
                <div className="p-4 space-y-3 pb-8">
                    {/* RUB - Blue (Vibrant) */}
                    <button
                        onClick={() => onSelect('RUB')}
                        className="w-full relative group h-[72px] rounded-3xl flex items-center justify-between px-6 bg-[#0062FF] hover:bg-[#0A6CFF] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-blue-500/20"
                    >
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-[19px] leading-none text-white">Рубли</span>
                            <span className="text-[11px] font-medium text-white/80 mt-0.5 tracking-wide">RUB</span>
                        </div>
                        <span className="text-3xl font-bold text-white">₽</span>
                    </button>

                    {/* USD - Green (Vibrant) */}
                    <button
                        onClick={() => onSelect('USD')}
                        className="w-full relative group h-[72px] rounded-3xl flex items-center justify-between px-6 bg-[#00A835] hover:bg-[#00B83A] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-green-500/20"
                    >
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-[19px] leading-none text-white">Доллары</span>
                            <span className="text-[11px] font-medium text-white/80 mt-0.5 tracking-wide">USD</span>
                        </div>
                        <span className="text-3xl font-bold text-white">$</span>
                    </button>

                    {/* EUR - Purple (Vibrant) */}
                    <button
                        onClick={() => onSelect('EUR')}
                        className="w-full relative group h-[72px] rounded-3xl flex items-center justify-between px-6 bg-[#9333EA] hover:bg-[#A855F7] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-purple-500/20"
                    >
                        <div className="flex flex-col items-start">
                            <span className="font-bold text-[19px] leading-none text-white">Евро</span>
                            <span className="text-[11px] font-medium text-white/80 mt-0.5 tracking-wide">EUR</span>
                        </div>
                        <span className="text-3xl font-bold text-white">€</span>
                    </button>

                    <div className="pt-2 text-center">
                        <button onClick={onClose} className="text-base font-medium text-gray-400 hover:text-gray-900 transition-colors">
                            Отмена
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
