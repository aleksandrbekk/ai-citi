import { useState } from 'react'
import { RotateCcw } from 'lucide-react'

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

interface ColorSectionProps {
    currentColor: string | null
    onSelect: (color: string | null) => void
}

export function ColorSection({ currentColor, onSelect }: ColorSectionProps) {
    const [customColor, setCustomColor] = useState(currentColor || '#FF5A1F')
    const [showCustom, setShowCustom] = useState(false)

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-base font-bold text-gray-900">🎨 Акцентный цвет</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Заголовки, кнопки, декоративные элементы</p>
                </div>
                {currentColor && (
                    <button
                        onClick={() => onSelect(null)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Сбросить
                    </button>
                )}
            </div>

            {/* Color Grid */}
            <div className="grid grid-cols-6 gap-3">
                {PRESET_COLORS.map(({ color, name }) => {
                    const isSelected = currentColor === color
                    const isWhite = color === '#FFFFFF'
                    return (
                        <button
                            key={color}
                            onClick={() => onSelect(color)}
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

            {/* Custom Color */}
            <div className="mt-3">
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
                            onClick={() => onSelect(customColor)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-semibold shadow-md shadow-orange-500/20 cursor-pointer active:scale-95 transition-transform"
                        >
                            OK
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
