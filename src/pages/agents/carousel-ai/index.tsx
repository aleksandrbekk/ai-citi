/**
 * AI Carousel Agent — MVP
 * Полный flow генерации каруселей через AI Engine (Edge Function)
 * вместо n8n. Доступен только админам.
 * 
 * Дизайн полностью повторяет /agents/carousel (step-based, premium UI)
 * Endpoint: /functions/v1/carousel-engine
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { isAdmin } from '@/config/admins'
import { getTelegramUser } from '@/lib/telegram'
import { getCarouselStyles, getGlobalSystemPrompt } from '@/lib/carouselStylesApi'
import { VASIA_CORE, FORMAT_UNIVERSAL, STYLES_INDEX, STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'
import { getCoinBalance, spendCoinsForGeneration, getFirstUserPhoto, savePhotoToSlot } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import { Sparkles, Zap, Send, Clock, ExternalLink, CheckCircle2 } from 'lucide-react'
import { CheckIcon, LoaderIcon } from '@/components/ui/icons'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Cloudinary config
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

// localStorage keys
const SAVED_STYLE_KEY = 'carousel_default_style'

type Step = 'setup' | 'generating' | 'done'

// Telegram icon
const TelegramIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.89.03-.24.38-.49 1.05-.74 4.12-1.79 6.87-2.97 8.26-3.54 3.93-1.62 4.75-1.9 5.28-1.91.12 0 .37.03.54.18.14.12.18.28.2.45-.01.06.01.24 0 .38z" />
    </svg>
)

// SVG icons (thin-line, matching reference)
const MegaphoneIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11l18-5v12L3 13v-2z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
)

const MessageIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
)

const CameraIcon = ({ className = '' }: { className?: string }) => (
    <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
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
    const [showCtaPage, setShowCtaPage] = useState(false)
    const [showStyleModal, setShowStyleModal] = useState(false)
    const [showPhotoModal, setShowPhotoModal] = useState(false)
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
    const [userPhoto, setUserPhoto] = useState<string | null>(null)
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

    // Load user photo from DB
    useEffect(() => {
        const loadPhoto = async () => {
            if (telegramUser?.id) {
                const photo = await getFirstUserPhoto(telegramUser.id)
                if (photo) setUserPhoto(photo)
            }
        }
        loadPhoto()
    }, [telegramUser?.id])

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
            if ('slide_templates' in dbConfig) {
                const st = dbConfig.slide_templates as Record<string, string> | undefined
                if (st?.HOOK && st.HOOK.length > 50) return dbConfig
            }
        }
        return STYLE_CONFIGS[id as StyleId] || STYLE_CONFIGS['APPLE_GLASSMORPHISM']
    }

    // Get style preview
    const getStylePreview = (id: string) => {
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

    // Get local example images for style
    const getLocalExamples = (id: StyleId): string[] => {
        const counts: Record<StyleId, number> = {
            APPLE_GLASSMORPHISM: 9,
            AESTHETIC_BEIGE: 9,
            SOFT_PINK_EDITORIAL: 7,
            MINIMALIST_LINE_ART: 9,
            GRADIENT_MESH_3D: 9,
        }
        const count = counts[id] || 9
        return Array.from({ length: count }, (_, i) => `/styles/${id}/example_${i + 1}.jpeg`)
    }

    // Get style examples (DB first, then local)
    const getStyleExamples = (id: string): string[] => {
        const dbStyle = dbStyles.find(s => s.style_id === id)
        if (dbStyle?.example_images && dbStyle.example_images.length > 0) {
            return dbStyle.example_images
        }
        return getLocalExamples(id as StyleId)
    }

    // Photo upload handler
    const handlePhotoUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) return
        const user = getTelegramUser()
        if (!user?.id) return

        setIsUploadingPhoto(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('upload_preset', CLOUDINARY_PRESET)
            formData.append('folder', `carousel-users/${user.id}`)
            const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData })
            if (!response.ok) throw new Error('Ошибка загрузки')
            const data = await response.json()
            const photoUrl = data.secure_url
            setUserPhoto(photoUrl)
            setShowPhotoModal(false)
            await savePhotoToSlot(user.id, photoUrl, 0)
        } catch (err) {
            console.error('Photo upload error:', err)
        } finally {
            setIsUploadingPhoto(false)
        }
    }

    const handleRemovePhoto = () => {
        setUserPhoto(null)
        setShowPhotoModal(false)
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

    // Current style metadata
    const currentStyleMeta = allStyles.find(s => s.id === styleId)

    // Handle "Next" from step 1
    const handleNext = () => {
        if (!topic.trim()) {
            setError('Введите тему карусели')
            return
        }
        setError(null)
        setShowCtaPage(true)
    }

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
                userPhoto,
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
                            onClick={() => { setStep('setup'); setShowSuccess(false); setGenerationStep(0); setShowCtaPage(false) }}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform hover:shadow-2xl"
                        >
                            <Sparkles className="w-5 h-5" />
                            Создать ещё карусель
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full py-4 rounded-2xl bg-white/80 backdrop-blur border border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 cursor-pointer"
                        >
                            На главную
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ==================== CTA PAGE (STEP 2) ====================
    if (showCtaPage) {
        return (
            <div className="min-h-screen bg-white">
                <div className="px-4 pt-3 pb-6">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">✓</div>
                                <div className="w-12 h-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-500" />
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">2</div>
                            </div>
                        </div>
                        {/* Balance */}
                        <div className="flex items-center gap-1.5">
                            <img src="/neirocoin.png" alt="Нейро" className="w-7 h-7 object-contain drop-shadow-sm" />
                            <span className="text-base font-bold text-orange-500">{coinBalance}</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <MegaphoneIcon className="text-white w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Призыв к действию</h1>
                            <p className="text-sm text-gray-500">Шаг 2 — Финальный слайд</p>
                        </div>
                    </div>

                    {/* Explanation */}
                    <p className="text-xs text-gray-500 text-center mb-3">
                        Выбери <span className="font-medium">одно</span>: продажа (кодовое слово) или охват (призыв)
                    </p>

                    {/* Segment Control - Glass */}
                    <div className="flex bg-gray-100/80 backdrop-blur-xl rounded-2xl p-1 mb-5">
                        <button
                            onClick={() => setCtatType('keyword')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${ctaType === 'keyword'
                                ? 'bg-white text-gray-900 shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            🛍️ Продажа
                            <span className="block text-[10px] font-normal opacity-70">ПИШИ: слово</span>
                        </button>
                        <button
                            onClick={() => setCtatType('engagement')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${ctaType === 'engagement'
                                ? 'bg-white text-gray-900 shadow-md'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            📈 Охват
                            <span className="block text-[10px] font-normal opacity-70">Подпишись и т.д.</span>
                        </button>
                    </div>

                    {ctaType === 'keyword' ? (
                        <>
                            {/* Info Card */}
                            <div className="bg-gradient-to-br from-orange-50 to-[#FFF8F5] rounded-2xl border border-orange-100 p-4 mb-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
                                    <MessageIcon className="text-white w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <span className="font-semibold text-gray-900 block mb-0.5">Кодовое слово</span>
                                    <p className="text-sm text-gray-500">Клиент напишет его вам в директ</p>
                                </div>
                            </div>

                            {/* Input Card */}
                            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-100 p-4 shadow-lg shadow-gray-500/5 mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Введите ваше слово
                                </label>
                                <input
                                    type="text"
                                    value={ctaKeyword}
                                    onChange={(e) => setCtaKeyword(e.target.value.toUpperCase())}
                                    placeholder="ХОЧУ"
                                    className="w-full px-4 py-3.5 rounded-xl bg-gray-50/80 border border-gray-200/50 text-gray-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-200 tracking-wider"
                                />
                                <p className="text-xs text-gray-400 mt-2">
                                    Примеры: СТАРТ, ХОЧУ, VIP • <span className="text-orange-500">Если пусто — будет «МАГИЯ»</span>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-3 mb-5">
                            {[
                                { id: 'SUBSCRIBE' as const, label: 'Подпишись', desc: 'Призыв подписаться', icon: '👆' },
                                { id: 'COMMENT' as const, label: 'Комментируй', desc: 'Напиши в комментах', icon: '💬' },
                                { id: 'SAVE' as const, label: 'Сохрани', desc: 'Сохрани себе пост', icon: '🔖' },
                            ].map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setEngagementType(option.id)}
                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl transition-all cursor-pointer ${engagementType === option.id
                                        ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-[#FFF8F5] shadow-lg shadow-orange-500/10'
                                        : 'border-gray-100 bg-white/80 hover:border-orange-200'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${engagementType === option.id
                                        ? 'bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg'
                                        : 'bg-gray-100'
                                        }`}>
                                        {engagementType === option.id ? <CheckIcon size={20} className="text-white" /> : option.icon}
                                    </div>
                                    <div className="text-left">
                                        <span className="font-semibold text-gray-900 block">{option.label}</span>
                                        <span className="text-sm text-gray-500">{option.desc}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={() => {
                            if (coinBalance < 30) {
                                navigate('/shop')
                                return
                            }
                            handleGenerate()
                        }}
                        disabled={isSubmitting}
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:shadow-2xl cursor-pointer ${coinBalance < 30
                            ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-green-500/30'
                            : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-500/30'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Создание...
                            </>
                        ) : coinBalance < 30 ? (
                            <>
                                <span>Пополнить баланс</span>
                                <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
                            </>
                        ) : (
                            <>
                                <span>Сгенерировать за 30</span>
                                <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
                            </>
                        )}
                    </button>

                    {/* Back link */}
                    <button
                        onClick={() => setShowCtaPage(false)}
                        className="w-full mt-3 py-3 text-gray-500 text-sm font-medium hover:text-gray-700 transition-colors cursor-pointer"
                    >
                        ← Вернуться к шагу 1
                    </button>
                </div>
            </div>
        )
    }

    // ==================== SETUP VIEW (STEP 1) ====================
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Compact Header */}
            <div className="px-4 pt-3 pb-2">
                {/* Step Indicator */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">1</div>
                            <div className="w-12 h-1 rounded-full bg-gradient-to-r from-orange-400 to-gray-200" />
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-medium text-sm">2</div>
                        </div>
                    </div>
                    {/* Balance */}
                    <div className="flex items-center gap-1.5">
                        <img src="/neirocoin.png" alt="Нейро" className="w-7 h-7 object-contain drop-shadow-sm" />
                        <span className="text-base font-bold text-orange-500">{coinBalance}</span>
                    </div>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Создание AI карусели</h1>
                        <p className="text-sm text-gray-500">Шаг 1 — Тема и стиль</p>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-6 flex-1 flex flex-col">
                {/* Topic Input */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">О чём карусель?</span>
                    </div>
                    <textarea
                        value={topic}
                        onChange={(e) => setTopic(e.target.value.slice(0, 5000))}
                        placeholder="Например: 10 ошибок в сетевом бизнесе"
                        maxLength={5000}
                        className="w-full min-h-[180px] px-4 py-4 rounded-2xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-300 resize-y text-[15px] leading-relaxed shadow-sm"
                    />
                    <div className="flex justify-end items-center mt-2 px-1">
                        <span className={`text-xs font-medium ${topic.length > 4500 ? 'text-orange-500' : 'text-gray-400'}`}>{topic.length} / 5000</span>
                    </div>
                </div>

                {/* Compact Settings Row: Photo + Style + Gender */}
                <div className="flex items-center gap-2 mb-4">
                    {/* Photo - Compact */}
                    <button
                        onClick={() => setShowPhotoModal(true)}
                        className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100 p-3 flex items-center gap-2 hover:border-orange-200 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        {userPhoto ? (
                            <img src={userPhoto} alt="" className="w-9 h-9 rounded-lg object-cover ring-2 ring-orange-400" />
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
                                <CameraIcon className="text-orange-400 w-5 h-5" />
                            </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                            <span className="font-medium text-gray-900 text-xs block">Фото</span>
                            {userPhoto ? (
                                <span className="text-[10px] text-green-600">✓</span>
                            ) : (
                                <span className="text-[10px] text-gray-400">+</span>
                            )}
                        </div>
                    </button>

                    {/* Style - Compact */}
                    <button
                        onClick={() => setShowStyleModal(true)}
                        className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100 p-3 flex items-center gap-2 hover:border-orange-200 transition-all active:scale-[0.98] cursor-pointer"
                    >
                        <img
                            src={getStylePreview(styleId)}
                            alt={currentStyleMeta?.name}
                            className="w-9 h-9 rounded-lg object-cover ring-2 ring-orange-200"
                        />
                        <div className="flex-1 text-left min-w-0">
                            <span className="font-medium text-gray-900 text-xs block">Стиль</span>
                            <span className="text-[10px] text-orange-500 truncate block">{currentStyleMeta?.name?.split(' ')[0]}</span>
                        </div>
                    </button>

                    {/* Gender - Compact */}
                    <div className="flex rounded-xl p-1 bg-gray-100/80 backdrop-blur">
                        <button
                            onClick={() => setGender('male')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${gender === 'male'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {gender === 'male' && <CheckIcon size={12} />}
                            👨
                        </button>
                        <button
                            onClick={() => setGender('female')}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${gender === 'female'
                                ? 'bg-white text-orange-500 shadow-sm'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {gender === 'female' && <CheckIcon size={12} />}
                            👩
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-3 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
                        {error}
                    </div>
                )}

                {/* Next Button */}
                <button
                    onClick={handleNext}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-lg shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform hover:shadow-2xl hover:shadow-orange-500/40"
                >
                    Далее →
                </button>
            </div>

            {/* Style Modal */}
            {showStyleModal && (
                <StyleModal
                    currentStyle={styleId}
                    onSelect={(id) => {
                        setStyleId(id)
                        localStorage.setItem(SAVED_STYLE_KEY, id)
                        setShowStyleModal(false)
                    }}
                    stylesIndex={allStyles}
                    getExamples={getStyleExamples}
                />
            )}

            {/* Photo Modal */}
            {showPhotoModal && (
                <PhotoModal
                    photo={userPhoto}
                    isUploading={isUploadingPhoto}
                    onUpload={handlePhotoUpload}
                    onRemove={handleRemovePhoto}
                    onClose={() => setShowPhotoModal(false)}
                />
            )}
        </div>
    )
}

// ========== STYLE MODAL (ported from carousel/index.tsx) ==========

interface StyleMetaAI {
    id: string
    name: string
    emoji: string
    audience: 'universal' | 'female'
    previewColor: string
    description: string
}

interface StyleModalProps {
    currentStyle: string
    onSelect: (id: string) => void
    stylesIndex: StyleMetaAI[]
    getExamples: (styleId: string) => string[]
}

function StyleModal({ currentStyle, onSelect, stylesIndex, getExamples }: StyleModalProps) {
    const [selectedStyle, setSelectedStyle] = useState<string>(currentStyle)
    const [saveAsDefault, setSaveAsDefault] = useState(true)
    const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
    const [isTransitioning, setIsTransitioning] = useState(false)

    // Swipe state
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const minSwipeDistance = 50

    const activeStylesIndex = stylesIndex || []
    const styleIndex = activeStylesIndex?.findIndex(s => s.id === selectedStyle) ?? 0
    const totalStyles = activeStylesIndex?.length ?? 0
    const selectedMeta = activeStylesIndex?.[styleIndex]
    const examples = getExamples(selectedStyle)

    // Preload current + adjacent style images
    useEffect(() => {
        if (!activeStylesIndex?.length) return
        const preloadImages = (sid: string) => {
            const images = getExamples(sid)
            images.forEach(src => {
                const img = new Image()
                img.src = src
                img.onload = () => {
                    if (sid === selectedStyle) {
                        setLoadedImages(prev => new Set(prev).add(src))
                    }
                }
            })
        }
        preloadImages(selectedStyle)
        if (totalStyles > 1) {
            const nextIdx = styleIndex < totalStyles - 1 ? styleIndex + 1 : 0
            const prevIdx = styleIndex > 0 ? styleIndex - 1 : totalStyles - 1
            preloadImages(activeStylesIndex[nextIdx].id)
            preloadImages(activeStylesIndex[prevIdx].id)
        }
    }, [selectedStyle, styleIndex, totalStyles, activeStylesIndex, getExamples])

    const navigateToStyle = (newIndex: number) => {
        if (!activeStylesIndex?.length || isTransitioning) return
        setIsTransitioning(true)
        setTimeout(() => {
            setSelectedStyle(activeStylesIndex[newIndex].id)
            setLoadedImages(new Set())
            setIsTransitioning(false)
        }, 150)
    }

    const goToPrev = () => navigateToStyle(styleIndex > 0 ? styleIndex - 1 : totalStyles - 1)
    const goToNext = () => navigateToStyle(styleIndex < totalStyles - 1 ? styleIndex + 1 : 0)

    const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX) }
    const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX) }
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        if (distance > minSwipeDistance) goToNext()
        else if (distance < -minSwipeDistance) goToPrev()
    }

    const handleImageLoad = (src: string) => { setLoadedImages(prev => new Set(prev).add(src)) }
    const handleImageError = (src: string) => { setLoadedImages(prev => new Set(prev).add(src)) }

    const handleConfirm = () => {
        if (saveAsDefault && selectedStyle) {
            localStorage.setItem(SAVED_STYLE_KEY, selectedStyle)
        }
        onSelect(selectedStyle)
    }

    if (!activeStylesIndex?.length) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6">
                <p className="text-gray-500 mb-4">Не удалось загрузить стили</p>
                <button onClick={() => onSelect(currentStyle)} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium cursor-pointer">Закрыть</button>
            </div>
        )
    }

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            {/* Header with Navigation */}
            <div className="px-4 py-4 border-b border-gray-100/50">
                <div className="flex items-center justify-between">
                    <button onClick={goToPrev} className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all cursor-pointer border border-gray-100 active:scale-95" aria-label="Предыдущий стиль">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>

                    <div className="text-center flex-1 px-3">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-orange-50 rounded-full mb-1.5">
                            <span className="text-xs font-semibold text-orange-600">{styleIndex + 1} из {totalStyles}</span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 truncate">{selectedMeta?.name || 'Стиль'}</h3>
                    </div>

                    <button onClick={goToNext} className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all cursor-pointer border border-gray-100 active:scale-95" aria-label="Следующий стиль">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                </div>

                {/* Progress Dots */}
                <div className="mt-3 flex justify-center gap-1">
                    {activeStylesIndex?.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => { setSelectedStyle(activeStylesIndex[i].id); setLoadedImages(new Set()) }}
                            className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${i === styleIndex
                                ? 'w-6 bg-gradient-to-r from-orange-500 to-orange-400'
                                : 'w-1.5 bg-gray-200 hover:bg-gray-300'
                                }`}
                            aria-label={`Стиль ${i + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Description */}
            {selectedMeta?.description && (
                <div className="px-4 py-3 bg-gray-50/50">
                    <p className="text-sm text-gray-500 text-center line-clamp-2">{selectedMeta.description}</p>
                </div>
            )}

            {/* Examples Grid */}
            <div className="flex-1 px-4 py-3 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500">Примеры слайдов</p>
                    <span className="text-xs text-gray-400">← Свайп для смены стиля →</span>
                </div>

                {examples.length > 0 ? (
                    <div
                        className="grid grid-cols-3 gap-2 transition-all duration-200"
                        style={{
                            opacity: isTransitioning ? 0.5 : 1,
                            transform: isTransitioning ? 'scale(0.98)' : 'scale(1)'
                        }}
                    >
                        {examples.map((src, i) => (
                            <div key={`${selectedStyle}-${i}`} className="aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-gray-100 relative">
                                {!loadedImages.has(src) && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center">
                                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-orange-400 animate-spin" />
                                    </div>
                                )}
                                <img
                                    src={src}
                                    alt={`Пример ${i + 1}`}
                                    loading={i < 6 ? 'eager' : 'lazy'}
                                    onLoad={() => handleImageLoad(src)}
                                    onError={() => handleImageError(src)}
                                    className="w-full h-full object-cover"
                                    style={{
                                        opacity: loadedImages.has(src) ? 1 : 0,
                                        transition: 'opacity 0.3s ease-in-out'
                                    }}
                                />
                                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center">
                                    <span className="text-[10px] text-white font-medium">{i + 1}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-32 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-400">Нет примеров</p>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="px-4 py-4 bg-white border-t border-gray-100">
                <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-4 py-3">
                    <div>
                        <span className="text-sm font-medium text-gray-700">Сохранить как основной</span>
                        <p className="text-xs text-gray-400">Будет выбран по умолчанию</p>
                    </div>
                    <button
                        onClick={() => setSaveAsDefault(!saveAsDefault)}
                        className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${saveAsDefault ? 'bg-gradient-to-r from-orange-500 to-orange-400' : 'bg-gray-300'}`}
                        role="switch"
                        aria-checked={saveAsDefault}
                    >
                        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${saveAsDefault ? 'left-5' : 'left-0.5'}`} />
                    </button>
                </div>

                <button
                    onClick={handleConfirm}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-400 to-orange-500 text-white font-bold text-base shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer hover:shadow-xl"
                >
                    ✓ Выбрать «{selectedMeta?.name?.split(' ')[0] || 'стиль'}»
                </button>
            </div>
        </div>
    )
}

// ========== PHOTO MODAL ==========

interface PhotoModalProps {
    photo: string | null
    isUploading: boolean
    onUpload: (file: File) => void
    onRemove: () => void
    onClose: () => void
}

function PhotoModal({ photo, isUploading, onUpload, onRemove, onClose }: PhotoModalProps) {
    const localFileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onUpload(file)
    }

    const triggerFileInput = () => { localFileInputRef.current?.click() }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-4 text-center border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Твоё фото</h2>
                    <p className="text-sm text-gray-500">Будет на слайдах карусели</p>
                </div>

                <div className="p-6">
                    <input ref={localFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                    {photo ? (
                        <div className="relative">
                            <img src={photo} alt="Фото" className="w-full aspect-square rounded-2xl object-cover" />
                            <button onClick={onRemove} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 cursor-pointer">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div
                            onClick={triggerFileInput}
                            className="flex flex-col items-center justify-center w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-orange-400 cursor-pointer bg-gray-50"
                        >
                            {isUploading ? (
                                <div className="text-center">
                                    <LoaderIcon size={32} className="text-orange-500 animate-spin mx-auto mb-2" />
                                    <span className="text-gray-500">Загрузка...</span>
                                </div>
                            ) : (
                                <>
                                    <CameraIcon className="text-gray-400 mb-3" />
                                    <span className="text-gray-600 font-medium">Нажмите для загрузки</span>
                                    <span className="text-sm text-gray-400 mt-1">JPG, PNG до 10MB</span>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 pt-0 flex gap-3">
                    {photo ? (
                        <>
                            <button onClick={triggerFileInput} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer">
                                Заменить
                            </button>
                            <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg cursor-pointer">
                                Готово
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 cursor-pointer">
                            Закрыть
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
