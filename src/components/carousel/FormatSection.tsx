import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { getActiveFormats, type CarouselFormatDB } from '@/lib/carouselFormatsApi'

interface FormatSectionProps {
    selectedFormat: string
    onSelect: (formatId: string) => void
}

export function FormatSection({ selectedFormat, onSelect }: FormatSectionProps) {
    const { data: formats, isLoading } = useQuery({
        queryKey: ['carousel-formats-active'],
        queryFn: getActiveFormats,
        staleTime: 5 * 60 * 1000, // 5 минут кеш
    })

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
            </div>
        )
    }

    if (!formats || formats.length === 0) {
        return (
            <div className="text-center py-6 text-gray-400 text-sm">
                Нет доступных форматов
            </div>
        )
    }

    return (
        <div>
            <div className="mb-3">
                <h3 className="text-base font-bold text-gray-900">📐 Формат карусели</h3>
                <p className="text-xs text-gray-500 mt-0.5">Структура и количество слайдов</p>
            </div>

            <div className="space-y-2">
                {formats.map((format: CarouselFormatDB) => {
                    const isSelected = selectedFormat === format.format_id
                    return (
                        <button
                            key={format.id}
                            onClick={() => onSelect(format.format_id)}
                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer active:scale-[0.98] ${isSelected
                                    ? 'border-orange-300 bg-orange-50/80 ring-2 ring-orange-400/30'
                                    : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/30'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Emoji */}
                                <span className="text-2xl flex-shrink-0">{format.emoji}</span>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900 text-sm">{format.name}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                            {format.slide_count} слайдов
                                        </span>
                                    </div>
                                    {format.description && (
                                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{format.description}</p>
                                    )}
                                </div>

                                {/* Checkmark */}
                                {isSelected && (
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
