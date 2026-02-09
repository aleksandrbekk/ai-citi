import { useRef } from 'react'
import { ImagePlus, X } from 'lucide-react'

interface ObjectSectionProps {
    objectImage: string | null
    objectPlacement: string
    onImageChange: (image: string | null) => void
    onPlacementChange: (placement: string) => void
}

export function ObjectSection({
    objectImage,
    objectPlacement,
    onImageChange,
    onPlacementChange,
}: ObjectSectionProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Конвертируем в base64 для передачи в payload
        const reader = new FileReader()
        reader.onload = () => {
            onImageChange(reader.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleRemoveImage = () => {
        onImageChange(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div>
            <div className="mb-3">
                <h3 className="text-base font-bold text-gray-900">🎁 Объект на слайдах</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                    Загрузите изображение объекта — он появится на слайдах карусели
                </p>
            </div>

            {/* Image upload */}
            <div className="mb-3">
                {objectImage ? (
                    <div className="relative inline-block">
                        <img
                            src={objectImage}
                            alt="Объект"
                            className="w-20 h-20 rounded-xl object-cover border border-gray-200"
                        />
                        <button
                            onClick={handleRemoveImage}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-red-600 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors cursor-pointer"
                    >
                        <ImagePlus className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Фото</span>
                    </button>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Placement description */}
            <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Где разместить объект?
                </label>
                <input
                    type="text"
                    value={objectPlacement}
                    onChange={(e) => onPlacementChange(e.target.value)}
                    placeholder="Например: в руках, на столе рядом, на фоне..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-300 transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                    Описание будет добавлено в промпт для генерации изображений
                </p>
            </div>
        </div>
    )
}
