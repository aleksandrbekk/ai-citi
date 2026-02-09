import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Plus, Edit, Trash2, Eye, EyeOff, Loader2, LayoutGrid, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    getAllFormats,
    deleteFormat,
    updateFormat,
    type CarouselFormatDB
} from '@/lib/carouselFormatsApi'

export default function FormatsList() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [deleteTarget, setDeleteTarget] = useState<CarouselFormatDB | null>(null)

    const { data: formats = [], isLoading } = useQuery({
        queryKey: ['admin-carousel-formats'],
        queryFn: getAllFormats,
    })

    // Мутация для переключения активности
    const toggleMutation = useMutation({
        mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
            updateFormat(id, { is_active }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-carousel-formats'] })
            toast.success('Статус обновлён')
        },
    })

    // Мутация для удаления
    const deleteMutation = useMutation({
        mutationFn: deleteFormat,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-carousel-formats'] })
            toast.success('Формат удалён')
            setDeleteTarget(null)
        },
        onError: (error) => {
            toast.error(error instanceof Error ? error.message : 'Ошибка удаления')
            setDeleteTarget(null)
        },
    })

    const confirmDelete = () => {
        if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <LayoutGrid className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            Форматы каруселей
                        </h1>
                        <p className="text-xs text-gray-500">
                            {formats.length} форматов • {formats.filter(f => f.is_active).length} активных
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/admin/carousel-formats/new')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-xl hover:shadow-lg hover:shadow-cyan-500/25 transition-all font-medium"
                >
                    <Plus className="w-5 h-5" />
                    <span className="hidden sm:inline">Добавить</span>
                </button>
            </div>

            {/* Список форматов */}
            {formats.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl">
                    <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">Нет форматов</p>
                    <p className="text-sm text-gray-400">Создайте первый формат</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {formats.map((format) => (
                        <FormatCard
                            key={format.id}
                            format={format}
                            onEdit={() => navigate(`/admin/carousel-formats/${format.id}`)}
                            onToggle={() => toggleMutation.mutate({ id: format.id, is_active: !format.is_active })}
                            onDelete={() => setDeleteTarget(format)}
                            isToggling={toggleMutation.isPending}
                        />
                    ))}
                </div>
            )}

            {/* Подсказка */}
            <div className="mt-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100">
                <p className="text-sm text-cyan-800">
                    <strong>Подсказка:</strong> Формат «Экспертный контент» использует глобальный промпт.
                    Остальные формати имеют свой content_system_prompt.
                </p>
            </div>

            {/* Модальное окно подтверждения удаления */}
            {deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Удалить формат?</h3>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Вы уверены, что хотите удалить формат <strong>"{deleteTarget.name}"</strong>?
                            Это действие нельзя отменить.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteMutation.isPending}
                                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleteMutation.isPending ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Удаление...</>
                                ) : (
                                    <><Trash2 className="w-4 h-4" /> Удалить</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function FormatCard({
    format,
    onEdit,
    onToggle,
    onDelete,
    isToggling,
}: {
    format: CarouselFormatDB
    onEdit: () => void
    onToggle: () => void
    onDelete: () => void
    isToggling: boolean
}) {
    return (
        <div
            className={`bg-white border-2 rounded-2xl p-4 transition-all cursor-pointer hover:shadow-md ${format.is_active ? 'border-gray-100' : 'border-gray-100 opacity-50'
                }`}
            onClick={onEdit}
        >
            {/* Основной контент */}
            <div className="flex gap-4">
                <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-cyan-50"
                >
                    {format.emoji || '📐'}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-gray-900 text-base">{format.name}</h3>
                        {!format.is_active && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-[10px] font-medium rounded-full">
                                СКРЫТ
                            </span>
                        )}
                        <span className="px-2 py-0.5 bg-cyan-100 text-cyan-600 text-[10px] font-medium rounded-full">
                            {format.slide_count} слайдов
                        </span>
                    </div>

                    <p className="text-sm text-gray-500 line-clamp-1">{format.description}</p>

                    {format.content_system_prompt && (
                        <p className="text-[10px] text-gray-400 mt-1 line-clamp-1 font-mono">
                            Промпт: {format.content_system_prompt.slice(0, 80)}...
                        </p>
                    )}
                </div>
            </div>

            {/* Действия */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 font-mono truncate max-w-[140px]">
                    {format.format_id}
                </span>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={onToggle}
                        disabled={isToggling}
                        className={`p-2 rounded-xl transition-all ${format.is_active
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                        title={format.is_active ? 'Отключить' : 'Включить'}
                    >
                        {format.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                        onClick={onEdit}
                        className="p-2 bg-cyan-100 text-cyan-600 rounded-xl hover:bg-cyan-200 transition-all"
                        title="Редактировать"
                    >
                        <Edit className="w-4 h-4" />
                    </button>

                    <button
                        onClick={onDelete}
                        className="p-2 bg-red-100 text-red-500 rounded-xl hover:bg-red-200 transition-all"
                        title="Удалить"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
