import { X } from 'lucide-react'
import { ColorSection } from './ColorSection'
import { FormatSection } from './FormatSection'
import { ObjectSection } from './ObjectSection'

interface SettingsPanelProps {
    isOpen: boolean
    onClose: () => void
    // Color
    primaryColor: string | null
    onColorChange: (color: string | null) => void
    // Format
    selectedFormat: string
    onFormatChange: (formatId: string) => void
    // Object
    objectImage: string | null
    objectPlacement: string
    onObjectImageChange: (image: string | null) => void
    onObjectPlacementChange: (placement: string) => void
}

export function SettingsPanel({
    isOpen,
    onClose,
    primaryColor,
    onColorChange,
    selectedFormat,
    onFormatChange,
    objectImage,
    objectPlacement,
    onObjectImageChange,
    onObjectPlacementChange,
}: SettingsPanelProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">⚙️ Настройки</h2>
                    <p className="text-xs text-gray-500">Цвет, формат, объект</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors cursor-pointer active:scale-95"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
                <div className="px-5 py-5 space-y-6">
                    {/* Секция 1: Цвет */}
                    <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-4">
                        <ColorSection
                            currentColor={primaryColor}
                            onSelect={onColorChange}
                        />
                    </div>

                    {/* Секция 2: Формат */}
                    <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-4">
                        <FormatSection
                            selectedFormat={selectedFormat}
                            onSelect={onFormatChange}
                        />
                    </div>

                    {/* Секция 3: Объект */}
                    <div className="bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl p-4">
                        <ObjectSection
                            objectImage={objectImage}
                            objectPlacement={objectPlacement}
                            onImageChange={onObjectImageChange}
                            onPlacementChange={onObjectPlacementChange}
                        />
                    </div>
                </div>
            </div>

            {/* Footer: Кнопка Готово */}
            <div className="px-5 py-4 border-t border-gray-100 bg-white">
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold text-base shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 transition-all duration-200 cursor-pointer active:scale-[0.98]"
                >
                    Готово ✓
                </button>
                {/* Safe area */}
                <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
            </div>
        </div>
    )
}
