import { useState } from 'react'

// Предустановленные цвета — курированная палитра
const PRESET_COLORS = [
    { color: '#FF5A1F', name: 'Оранжевый' },
    { color: '#EF4444', name: 'Красный' },
    { color: '#F59E0B', name: 'Золотой' },
    { color: '#10B981', name: 'Изумрудный' },
    { color: '#06B6D4', name: 'Бирюзовый' },
    { color: '#3B82F6', name: 'Синий' },
    { color: '#8B5CF6', name: 'Фиолетовый' },
    { color: '#EC4899', name: 'Розовый' },
    { color: '#F97316', name: 'Мандарин' },
    { color: '#14B8A6', name: 'Мятный' },
    { color: '#6366F1', name: 'Индиго' },
    { color: '#FFFFFF', name: 'Белый' },
] as const

interface ColorPickerModalProps {
    currentColor: string | null
    onSelect: (color: string | null) => void
    onClose: () => void
}

export function ColorPickerModal({ currentColor, onSelect, onClose }: ColorPickerModalProps) {
    const [customColor, setCustomColor] = useState(currentColor || '#FF5A1F')
    const [showCustom, setShowCustom] = useState(false)

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl animate-slide-up">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                {/* Header */}
                <div className="px-5 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Акцентный цвет</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Заголовки, кнопки, акценты</p>
                        </div>
                        {currentColor && (
                            <button
                                onClick={() => { onSelect(null); onClose() }}
                                className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                                Сбросить
                            </button>
                        )}
                    </div>
                </div>

                {/* Color Grid */}
                <div className="px-5 pb-4">
                    <div className="grid grid-cols-6 gap-3">
                        {PRESET_COLORS.map(({ color, name }) => {
                            const isSelected = currentColor === color
                            const isWhite = color === '#FFFFFF'
                            return (
                                <button
                                    key={color}
                                    onClick={() => { onSelect(color); onClose() }}
                                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                                    title={name}
                                >
                                    <div
                                        className={`w-11 h-11 rounded-xl transition-all duration-200 ${isSelected
                                                ? 'ring-2 ring-offset-2 ring-orange-500 scale-110'
                                                : 'hover:scale-105 active:scale-95'
                                            } ${isWhite ? 'border border-gray-200' : ''}`}
                                        style={{ backgroundColor: color }}
                                    />
                                    <span className="text-[9px] text-gray-400 font-medium leading-none">{name}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Custom Color */}
                <div className="px-5 pb-6">
                    {!showCustom ? (
                        <button
                            onClick={() => setShowCustom(true)}
                            className="w-full py-2.5 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors cursor-pointer"
                        >
                            + Свой цвет
                        </button>
                    ) : (
                        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                            <input
                                type="color"
                                value={customColor}
                                onChange={(e) => setCustomColor(e.target.value)}
                                className="w-11 h-11 rounded-lg border-0 cursor-pointer"
                            />
                            <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 block">Свой цвет</span>
                                <span className="text-xs text-gray-400 font-mono">{customColor}</span>
                            </div>
                            <button
                                onClick={() => { onSelect(customColor); onClose() }}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-transform"
                            >
                                OK
                            </button>
                        </div>
                    )}
                </div>

                {/* Safe area bottom */}
                <div className="h-safe-area-bottom" />
            </div>

            <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .h-safe-area-bottom {
          height: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
        </div>
    )
}
