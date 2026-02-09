import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
    getFormatById,
    createFormat,
    updateFormat,
    type CarouselFormatInput
} from '@/lib/carouselFormatsApi'

export default function FormatEditor() {
    const navigate = useNavigate()
    const { id } = useParams<{ id: string }>()
    const queryClient = useQueryClient()
    const isNew = id === 'new'

    // Form state
    const [form, setForm] = useState<CarouselFormatInput>({
        format_id: '',
        name: '',
        emoji: '📐',
        description: '',
        slide_count: 9,
        content_system_prompt: '',
        is_active: true,
    })

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

    // Load existing format
    const { data: existing, isLoading } = useQuery({
        queryKey: ['admin-format', id],
        queryFn: () => getFormatById(id!),
        enabled: !isNew && !!id,
    })

    // Sync form with loaded data
    useEffect(() => {
        if (existing) {
            setForm({
                format_id: existing.format_id,
                name: existing.name,
                emoji: existing.emoji || '📐',
                description: existing.description || '',
                slide_count: existing.slide_count,
                content_system_prompt: existing.content_system_prompt || '',
                is_active: existing.is_active,
            })
        }
    }, [existing])

    // Save mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            setSaveStatus('saving')
            if (isNew) {
                return createFormat(form)
            } else {
                return updateFormat(id!, form)
            }
        },
        onSuccess: () => {
            setSaveStatus('saved')
            queryClient.invalidateQueries({ queryKey: ['admin-carousel-formats'] })
            toast.success(isNew ? 'Формат создан!' : 'Формат сохранён!')
            setTimeout(() => {
                navigate('/admin/carousel-formats')
            }, 500)
        },
        onError: (error) => {
            setSaveStatus('error')
            toast.error(error instanceof Error ? error.message : 'Ошибка сохранения')
            setTimeout(() => setSaveStatus('idle'), 3000)
        },
    })

    const handleSave = () => {
        if (!form.format_id.trim()) {
            toast.error('Укажите ID формата')
            return
        }
        if (!form.name.trim()) {
            toast.error('Укажите название')
            return
        }
        saveMutation.mutate()
    }

    const updateField = <K extends keyof CarouselFormatInput>(key: K, value: CarouselFormatInput[K]) => {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    if (isLoading && !isNew) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/admin/carousel-formats')}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">
                            {isNew ? 'Новый формат' : `Редактирование: ${form.name}`}
                        </h1>
                        <p className="text-xs text-gray-500">
                            {isNew ? 'Создайте новый формат карусели' : `ID: ${form.format_id}`}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-400 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all font-medium disabled:opacity-50"
                >
                    {saveStatus === 'saving' ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
                    ) : saveStatus === 'saved' ? (
                        <><CheckCircle className="w-4 h-4" /> Сохранено!</>
                    ) : (
                        <><Save className="w-4 h-4" /> Сохранить</>
                    )}
                </button>
            </div>

            {/* Error */}
            {saveStatus === 'error' && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Ошибка сохранения. Проверьте данные.
                </div>
            )}

            {/* Form */}
            <div className="space-y-6">
                {/* Основные поля */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">📋 Основная информация</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Format ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ID формата <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.format_id}
                                onChange={(e) => updateField('format_id', e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                                placeholder="expert, product, case..."
                                disabled={!isNew}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300 disabled:bg-gray-50 disabled:text-gray-400 font-mono"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Только латиница, цифры, дефис. Нельзя изменить после создания.</p>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Название <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="Экспертный контент"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300"
                            />
                        </div>

                        {/* Emoji */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Эмодзи</label>
                            <input
                                type="text"
                                value={form.emoji}
                                onChange={(e) => updateField('emoji', e.target.value)}
                                placeholder="🎓"
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300"
                                maxLength={4}
                            />
                        </div>

                        {/* Slide count */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Кол-во слайдов</label>
                            <input
                                type="number"
                                value={form.slide_count}
                                onChange={(e) => updateField('slide_count', parseInt(e.target.value) || 9)}
                                min={3}
                                max={20}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                        <input
                            type="text"
                            value={form.description || ''}
                            onChange={(e) => updateField('description', e.target.value)}
                            placeholder="Hook → Боль → Решение → CTA. Классика."
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300"
                        />
                    </div>

                    {/* Active toggle */}
                    <div className="mt-4 flex items-center gap-3">
                        <button
                            onClick={() => updateField('is_active', !form.is_active)}
                            className={`relative w-12 h-7 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                            />
                        </button>
                        <span className="text-sm text-gray-700">{form.is_active ? 'Активен' : 'Скрыт'}</span>
                    </div>
                </div>

                {/* Content System Prompt */}
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-2">📝 Системный промпт формата</h3>
                    <p className="text-xs text-gray-500 mb-3">
                        Промпт для Копирайтера, специфичный для этого формата. Если пусто — используется глобальный промпт.
                    </p>
                    <textarea
                        value={form.content_system_prompt}
                        onChange={(e) => updateField('content_system_prompt', e.target.value)}
                        placeholder="Инструкции для Копирайтера для данного формата..."
                        className="w-full h-[300px] px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-cyan-400/30 focus:border-cyan-300"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                        <span>{(form.content_system_prompt || '').length.toLocaleString()} символов</span>
                        {form.format_id === 'expert' && (
                            <span className="text-cyan-600 font-medium">💡 expert использует глобальный промпт</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
