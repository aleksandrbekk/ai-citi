/**
 * AI Carousel Agent — MVP
 * Полный flow генерации каруселей через AI Engine (Edge Function)
 * вместо n8n. Доступен только админам.
 * 
 * Переиспользует тот же store (carouselStore) и стили.
 * Endpoint: /functions/v1/carousel-engine
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isAdmin } from '@/config/admins'
import { getTelegramUser } from '@/lib/telegram'
import { getCarouselStyles, getGlobalSystemPrompt } from '@/lib/carouselStylesApi'
import { VASIA_CORE, FORMAT_UNIVERSAL, STYLES_INDEX, STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'
import { getCoinBalance, spendCoinsForGeneration } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { Sparkles, ArrowLeft, Zap, Send, Clock, ExternalLink, CheckCircle2 } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

type Step = 'setup' | 'generating' | 'done'

// Telegram icon
const TelegramIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.89.03-.24.38-.49 1.05-.74 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .37.03.54.18.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
    </svg>
)

export default function CarouselAI() {
    const telegramUser = getTelegramUser()
    if (!isAdmin(telegramUser?.id)) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Доступ запрещён</h2>
                    <p className="text-gray-500">Только для администраторов</p>
                </div>
            </div>
        )
    }

    return <CarouselAIInner />
}

function CarouselAIInner() {
    const navigate = useNavigate()
    const telegramUser = getTelegramUser()

    // State
    const [step, setStep] = useState<Step>('setup')
    const [topic, setTopic] = useState('')
    const [styleId, setStyleId] = useState('APPLE_GLASSMORPHISM')
    const [gender, setGender] = useState<'male' | 'female'>('male')
    const [ctaType, setCtatType] = useState<'keyword' | 'engagement'>('keyword')
    const [ctaKeyword, setCtaKeyword] = useState('')
    const [engagementType, setEngagementType] = useState<'SUBSCRIBE' | 'COMMENT' | 'SAVE'>('SUBSCRIBE')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [generationStep, setGenerationStep] = useState(0)
    const [showSuccess, setShowSuccess] = useState(false)
    const isGeneratingRef = useRef(false)

    // Load styles from DB
    const { data: dbStyles = [] } = useQuery({
        queryKey: ['carousel-styles'],
        queryFn: getCarouselStyles,
        staleTime: 5 * 60 * 1000,
    })

    // Coin balance
    const { data: coinBalance = 0, refetch: refetchBalance } = useQuery({
        queryKey: ['coin-balance', telegramUser?.id],
        queryFn: async () => {
            if (!telegramUser?.id) return 0
            return await getCoinBalance(telegramUser.id)
        },
        enabled: !!telegramUser?.id,
    })

    // Merged styles (DB + hardcoded)
    const allStyles = (() => {
        const result = [...STYLES_INDEX]
        const addedIds = new Set(result.map(s => s.id))
        for (const s of dbStyles) {
            if (!addedIds.has(s.style_id as StyleId)) {
                result.push({
                    id: s.style_id as StyleId,
                    name: s.name,
                    emoji: s.emoji,
                    audience: (s.audience || 'universal') as 'universal' | 'female',
                    previewColor: s.preview_color,
                    description: s.description || ''
                })
                addedIds.add(s.style_id as StyleId)
            }
        }
        return result
    })()

    // Get style config
    const getStyleConfig = (id: string) => {
        const dbStyle = dbStyles.find(s => s.style_id === id)
        const dbConfig = dbStyle?.config as Record<string, unknown> | undefined
        if (dbConfig && typeof dbConfig === 'object') {
            const sp = dbConfig.style_prompt as string | undefined
            const csp = dbConfig.content_system_prompt as string | undefined
            if ((sp && sp.length > 20) || (csp && csp.length > 20)) return dbConfig
        }
        return STYLE_CONFIGS[id as StyleId] || STYLE_CONFIGS['APPLE_GLASSMORPHISM']
    }

    // Get style preview
    const getPreview = (id: string) => {
        const dbStyle = dbStyles.find(s => s.style_id === id)
        if (dbStyle?.preview_image) return dbStyle.preview_image
        const local: Record<string, string> = {
            APPLE_GLASSMORPHISM: '/styles/apple.jpg',
            AESTHETIC_BEIGE: '/styles/beige.jpg',
            SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
            MINIMALIST_LINE_ART: '/styles/minimal.jpg',
            GRADIENT_MESH_3D: '/styles/gradient.jpg',
        }
        return local[id] || '/styles/apple.jpg'
    }

    // Engine config check
    const { data: engineConfig } = useQuery({
        queryKey: ['ai-engine-config'],
        queryFn: async () => {
            const { data } = await supabase
                .from('ai_engine_config')
                .select('text_provider, text_model, image_provider, telegram_bot_token, use_internal_engine')
                .eq('is_active', true)
                .limit(1)
                .single()
            return data
        },
    })

    // Generate handler
    const handleGenerate = async () => {
        if (isGeneratingRef.current || isSubmitting) return
        isGeneratingRef.current = true

        if (!topic.trim()) {
            setError('Введите тему карусели')
            isGeneratingRef.current = false
            return
        }

        const chatId = telegramUser?.id
        if (!chatId) {
            setError('Не удалось определить Telegram ID')
            isGeneratingRef.current = false
            return
        }

        setIsSubmitting(true)
        setError(null)

        // Check balance (30 coins)
        if (coinBalance < 30) {
            setError(`Недостаточно нейронов. Нужно 30, у вас ${coinBalance}`)
            setIsSubmitting(false)
            isGeneratingRef.current = false
            return
        }

        // Spend coins
        try {
            const result = await spendCoinsForGeneration(chatId, 30, 'AI Engine: ' + topic.trim(), {
                style: styleId,
                topic: topic.trim(),
                engine: 'ai-engine'
            })
            if (!result?.success) {
                setError(result?.error || 'Не удалось списать нейроны')
                setIsSubmitting(false)
                isGeneratingRef.current = false
                return
            }
            refetchBalance()
        } catch {
            setError('Ошибка при списании нейронов')
            setIsSubmitting(false)
            isGeneratingRef.current = false
            return
        }

        // Build CTA
        let ctaValue = ''
        if (ctaType === 'keyword') {
            ctaValue = ctaKeyword || 'МАГИЯ'
        } else {
            const map = { SUBSCRIBE: 'ПОДПИШИСЬ 🔔', COMMENT: 'НАПИШИ В КОММЕНТАХ 👇', SAVE: 'СОХРАНИ 💾' }
            ctaValue = map[engagementType]
        }

        try {
            const styleConfig = getStyleConfig(styleId)
            const globalSystemPrompt = await getGlobalSystemPrompt()
            const stylePrompt = (styleConfig as Record<string, unknown>)?.style_prompt as string || ''

            const payload = {
                chatId,
                topic: topic.trim(),
                userPhoto: null,
                cta: ctaValue,
                ctaType: ctaType === 'keyword' ? 'PRODUCT' : 'ENGAGEMENT',
                gender,
                styleId,
                styleConfig,
                globalSystemPrompt,
                stylePrompt,
                vasiaCore: VASIA_CORE,
                formatConfig: FORMAT_UNIVERSAL,
                formatId: 'expert',
            }

            // Switch to generating view
            setStep('generating')

            // Send to AI Engine Edge Function
            const url = `${SUPABASE_URL}/functions/v1/carousel-engine`
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || `HTTP ${response.status}`)
            }

            // Success — animation will show
        } catch (err) {
            console.error('[CarouselAI] Generation error:', err)
            setError('Ошибка: ' + (err instanceof Error ? err.message : String(err)))
            setStep('setup')
        } finally {
            setIsSubmitting(false)
            isGeneratingRef.current = false
        }
    }

    // Generation animation steps
    useEffect(() => {
        if (step !== 'generating') return
        const steps = [
            { delay: 0 },
            { delay: 3000 },
            { delay: 8000 },
            { delay: 13000 },
            { delay: 18000 },
        ]
        const timers = steps.map((s, i) =>
            setTimeout(() => setGenerationStep(i), s.delay)
        )
        const doneTimer = setTimeout(() => setShowSuccess(true), 20000)
        return () => {
            timers.forEach(t => clearTimeout(t))
            clearTimeout(doneTimer)
        }
    }, [step])

    const GENERATION_STEPS = [
        'Анализируем тему...',
        'Пишем тексты слайдов...',
        'Генерируем дизайн...',
        'Создаём слайды...',
        'Финальная обработка...',
    ]

    // ==================== GENERATING VIEW ====================
    if (step === 'generating') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-[#FFF8F5] flex flex-col">
                {/* Header */}
                <div className="flex-shrink-0 px-4 pt-4 pb-2">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 ${showSuccess
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-green-500/30'
                            : 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-orange-500/30'
                            }`}>
                            {showSuccess ? (
                                <Send className="w-6 h-6 text-white" />
                            ) : (
                                <Sparkles className="w-6 h-6 text-white animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">
                                {showSuccess ? 'Запрос отправлен!' : 'AI Engine генерирует...'}
                            </h1>
                            <p className="text-sm text-gray-500">
                                {showSuccess ? 'Карусель скоро будет готова' : GENERATION_STEPS[generationStep]}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Progress */}
                <div className="px-4 py-3">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${showSuccess
                                ? 'w-full bg-gradient-to-r from-green-400 to-emerald-500'
                                : 'bg-gradient-to-r from-orange-400 to-cyan-500'
                                }`}
                            style={{ width: showSuccess ? '100%' : `${((generationStep + 1) / GENERATION_STEPS.length) * 100}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">
                            {showSuccess ? 'Готово!' : `Шаг ${generationStep + 1} из ${GENERATION_STEPS.length}`}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>~2 мин</span>
                        </div>
                    </div>
                </div>

                {/* Main */}
                <div className="flex-1 px-4 pb-4 flex flex-col">
                    {/* Telegram card */}
                    <div className="bg-gradient-to-br from-cyan-400 to-cyan-500 rounded-3xl p-5 mb-4 shadow-xl shadow-cyan-500/25 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="relative">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                                    <TelegramIcon className="w-9 h-9 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-white mb-1">Откройте Telegram!</h2>
                                    <p className="text-white/90 text-sm">Карусель придёт в чат бота</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const tg = window.Telegram?.WebApp
                                    if (tg) tg.close()
                                    else window.open('https://t.me/Neirociti_bot', '_blank')
                                }}
                                className="w-full py-4 bg-white rounded-2xl text-cyan-600 font-bold text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                            >
                                <TelegramIcon className="w-5 h-5" />
                                Открыть Telegram
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl p-4 mb-4 border border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-emerald-800">Можно закрыть приложение</p>
                                <p className="text-emerald-600 text-sm">Карусель придёт автоматически через 1-2 минуты</p>
                            </div>
                        </div>
                    </div>

                    {/* Engine badge */}
                    <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <Zap className="w-4 h-4 text-orange-500" />
                            <span className="font-medium text-orange-700">AI Engine</span>
                            <span className="text-orange-500">•</span>
                            <span className="text-orange-600">{engineConfig?.text_provider}/{engineConfig?.text_model?.split('/').pop()}</span>
                        </div>
                    </div>

                    <div className="flex-1" />

                    {/* Bottom */}
                    <div className="space-y-3">
                        <button
                            onClick={() => { setStep('setup'); setShowSuccess(false); setGenerationStep(0) }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Sparkles className="w-5 h-5" />
                            Создать ещё карусель
                        </button>
                        <button
                            onClick={() => navigate('/agents')}
                            className="w-full py-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                            Назад к агентам
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ==================== SETUP VIEW ====================
    return (
        <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 pb-24">
            {/* Decorations */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-orange-100/50 rounded-full blur-3xl" />

            {/* Header */}
            <div className="sticky top-0 z-20 nav-glass px-4 py-3 flex items-center gap-3">
                <button onClick={() => navigate('/agents')} className="p-1 cursor-pointer">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                    <h1 className="text-lg font-bold text-gray-900">AI Карусель</h1>
                    <p className="text-xs text-gray-500">MVP • Edge Function</p>
                </div>
                {/* Balance */}
                <div className="flex items-center gap-1.5">
                    <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
                    <span className="text-sm font-bold text-orange-500">{coinBalance}</span>
                </div>
            </div>

            {/* Engine Status */}
            <div className="px-4 pt-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${engineConfig?.text_provider
                    ? 'bg-green-50 text-green-700 border border-green-100'
                    : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${engineConfig?.text_provider ? 'bg-green-500' : 'bg-red-500'}`} />
                    {engineConfig?.text_provider
                        ? `${engineConfig.text_provider}/${engineConfig.text_model?.split('/').pop()} • ${engineConfig.image_provider}`
                        : 'Конфиг не найден → /admin/ai-engine'}
                </div>
            </div>

            <div className="relative z-10 p-4 space-y-4">
                {/* Topic */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/80 p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">📝 Тема карусели</label>
                    <textarea
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="Например: 10 ошибок в сетевом бизнесе"
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300"
                        rows={2}
                    />
                </div>

                {/* Gender */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/80 p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">👤 Склонение</label>
                    <div className="flex gap-2">
                        {[
                            { id: 'male' as const, label: '♂ Он', desc: 'Мужской' },
                            { id: 'female' as const, label: '♀ Она', desc: 'Женский' },
                        ].map(g => (
                            <button
                                key={g.id}
                                onClick={() => setGender(g.id)}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${gender === g.id
                                    ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Style */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/80 p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">🎨 Стиль</label>
                    <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto">
                        {allStyles.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setStyleId(s.id)}
                                className={`relative overflow-hidden rounded-xl aspect-[3/4] cursor-pointer transition-all ${styleId === s.id
                                    ? 'ring-2 ring-orange-500 ring-offset-2 shadow-lg'
                                    : 'hover:shadow-md'
                                    }`}
                            >
                                <img
                                    src={getPreview(s.id)}
                                    alt={s.name}
                                    className="w-full h-full object-cover"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                                    <p className="text-[10px] font-semibold text-white truncate">{s.emoji} {s.name}</p>
                                </div>
                                {styleId === s.id && (
                                    <div className="absolute top-1 right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                                        <span className="text-white text-xs">✓</span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* CTA */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/80 p-4 shadow-sm">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">📣 Призыв к действию</label>
                    <div className="flex bg-gray-100 rounded-xl p-1 mb-3">
                        <button
                            onClick={() => setCtatType('keyword')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${ctaType === 'keyword' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            🛍️ Кодовое слово
                        </button>
                        <button
                            onClick={() => setCtatType('engagement')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${ctaType === 'engagement' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                                }`}
                        >
                            📈 Охват
                        </button>
                    </div>

                    {ctaType === 'keyword' ? (
                        <input
                            type="text"
                            value={ctaKeyword}
                            onChange={e => setCtaKeyword(e.target.value.toUpperCase())}
                            placeholder="ХОЧУ"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        />
                    ) : (
                        <div className="space-y-2">
                            {[
                                { id: 'SUBSCRIBE' as const, label: '👆 Подпишись' },
                                { id: 'COMMENT' as const, label: '💬 Комментируй' },
                                { id: 'SAVE' as const, label: '🔖 Сохрани' },
                            ].map(o => (
                                <button
                                    key={o.id}
                                    onClick={() => setEngagementType(o.id)}
                                    className={`w-full p-3 rounded-xl text-left text-sm font-medium transition-all cursor-pointer ${engagementType === o.id
                                        ? 'bg-orange-50 border border-orange-200 text-orange-700'
                                        : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                        {error}
                    </div>
                )}

                {/* Generate button */}
                <button
                    onClick={handleGenerate}
                    disabled={isSubmitting || !topic.trim() || coinBalance < 30}
                    className="w-full py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] transition-transform"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Генерация...
                        </>
                    ) : coinBalance < 30 ? (
                        'Недостаточно нейронов'
                    ) : (
                        <>
                            <Zap className="w-5 h-5" />
                            Сгенерировать за 30
                            <img src="/neirocoin.png" alt="" className="w-5 h-5 object-contain" />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
