import { useState, useEffect, useRef, Component, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto, savePhotoToSlot, getCoinBalance, spendCoinsForGeneration, checkPremiumSubscription } from '@/lib/supabase'
import { getCarouselStyles, getGlobalSystemPrompt, getUserPurchasedStyles, getCarouselStylesByIds } from '@/lib/carouselStylesApi'
import { getTelegramUser } from '@/lib/telegram'
import { trackCarouselEvent } from '@/lib/analytics'
import { isAdmin } from '@/config/admins'
import { VASIA_CORE, FORMAT_UNIVERSAL, STYLES_INDEX, STYLE_CONFIGS, type StyleId } from '@/lib/carouselStyles'
import { LoaderIcon, CheckIcon } from '@/components/ui/icons'
import { OnboardingCoachMarks, useCarouselOnboarding } from '@/components/carousel/OnboardingCoachMarks'
import { SettingsPanel } from '@/components/carousel/SettingsPanel'
import { getFormatByFormatId } from '@/lib/carouselFormatsApi'

// Error Boundary для отлова ошибок
class CarouselErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CarouselErrorBoundary] Caught error:', error)
    console.error('[CarouselErrorBoundary] Error info:', errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка загрузки</h2>
          <p className="text-sm text-gray-500 text-center mb-4">
            {this.state.error?.message || 'Неизвестная ошибка'}
          </p>
          <pre className="text-xs bg-gray-100 p-3 rounded-lg max-w-full overflow-auto mb-4">
            {this.state.error?.stack?.slice(0, 500)}
          </pre>
          <button
            onClick={() => {
              // Очищаем localStorage и перезагружаем
              localStorage.removeItem('carousel-storage')
              localStorage.removeItem('carousel_default_style')
              window.location.reload()
            }}
            className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium"
          >
            Сбросить и перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Cloudinary config
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

// Ключи для localStorage
const SAVED_STYLE_KEY = 'carousel_default_style'
const SAVED_GENDER_KEY = 'carousel_default_gender'

// SVG иконки (thin-line, без эмодзи)

const CameraIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

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


// Wrapper с Error Boundary
export default function CarouselIndex() {
  return (
    <CarouselErrorBoundary>
      <CarouselIndexInner />
    </CarouselErrorBoundary>
  )
}

function CarouselIndexInner() {
  console.log('[Carousel] Component mounting...')

  const navigate = useNavigate()

  // Отлавливаем ошибку zustand
  let storeData
  try {
    storeData = useCarouselStore()
    console.log('[Carousel] Store loaded, style:', storeData.style)
  } catch (e) {
    console.error('[Carousel] Store error:', e)
    throw e
  }

  const { setStatus, userPhoto, setUserPhoto, style, setStyle, primaryColor, setPrimaryColor, format, setFormat, objectImage, setObjectImage, objectPlacement, setObjectPlacement } = storeData

  const [topic, setTopic] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStyleModal, setShowStyleModal] = useState(false)

  // CTA state
  const [ctaType, setCtaType] = useState<'PRODUCT' | 'ENGAGEMENT'>('PRODUCT')
  const [ctaKeyword, setCtaKeyword] = useState('')
  const [engagementType, setEngagementType] = useState<'SUBSCRIBE' | 'COMMENT' | 'SAVE'>('SUBSCRIBE')
  const [showCtaPage, setShowCtaPage] = useState(false)

  // Photo upload state
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // Tips modal state
  const [showTipsModal, setShowTipsModal] = useState(false)

  // Settings panel state
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)

  // Защита от двойных кликов
  const isGeneratingRef = useRef(false)

  // Gender state (загружаем из localStorage, null если не выбран)
  const [gender, setGender] = useState<'male' | 'female' | null>(() => {
    const saved = localStorage.getItem(SAVED_GENDER_KEY)
    if (saved === 'female') return 'female'
    if (saved === 'male') return 'male'
    return null // Не выбран — требуем выбор
  })

  // Сохраняем пол при изменении
  const handleGenderChange = (newGender: 'male' | 'female') => {
    setGender(newGender)
    localStorage.setItem(SAVED_GENDER_KEY, newGender)
  }

  // Получаем telegram_id пользователя
  const telegramUser = getTelegramUser()
  // Стоимость одной генерации
  const GENERATION_COST = 30

  // Получаем баланс монет (проверка только при генерации)
  const { data: coinBalance = 0, refetch: refetchBalance } = useQuery({
    queryKey: ['coin-balance', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return 0
      return await getCoinBalance(telegramUser.id)
    },
    enabled: !!telegramUser?.id,
  })

  // Проверяем подписку в premium_clients
  const { data: hasSubscription = false } = useQuery({
    queryKey: ['premium-subscription', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return false
      const result = await checkPremiumSubscription(telegramUser.id)
      console.log('[Carousel] Premium subscription check:', result)
      return result
    },
    enabled: !!telegramUser?.id,
  })

  // Модальные окна закрываются системной кнопкой назад (через Layout.tsx)
  // Кастомная логика для модалок не нужна — просто закрываем при navigate(-1)

  // Загружаем стили из БД (если есть)
  const { data: dbStyles = [] } = useQuery({
    queryKey: ['carousel-styles'],
    queryFn: getCarouselStyles,
    staleTime: 5 * 60 * 1000, // 5 минут
  })

  // Загружаем купленные стили пользователя (список ID)
  const { data: userPurchasedStyleIds = [] } = useQuery({
    queryKey: ['user-purchased-styles', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return []
      const purchases = await getUserPurchasedStyles(telegramUser.id)
      return purchases.map(p => p.style_id)
    },
    enabled: !!telegramUser?.id,
    staleTime: 5 * 60 * 1000,
  })

  // ID базовых стилей (hardcoded)
  const baseStyleIds = STYLES_INDEX.map(s => s.id)

  // Фильтруем только не-базовые купленные стили для отдельного запроса
  const nonBasePurchasedIds = userPurchasedStyleIds.filter(
    id => !baseStyleIds.includes(id as StyleId)
  )

  // Загружаем полные данные купленных стилей напрямую по ID (без фильтрации по is_active)
  const { data: purchasedStylesData = [] } = useQuery({
    queryKey: ['purchased-styles-data', nonBasePurchasedIds],
    queryFn: async () => {
      if (nonBasePurchasedIds.length === 0) return []
      return await getCarouselStylesByIds(nonBasePurchasedIds)
    },
    enabled: nonBasePurchasedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  // Формируем список доступных стилей:
  // 1. Базовые стили (STYLES_INDEX) — всегда доступны
  // 2. Купленные стили из БД (загруженные напрямую по ID)
  const mergedStylesIndex = (() => {
    // Начинаем с базовых стилей
    const result = [...STYLES_INDEX]

    // Добавляем купленные стили из БД
    for (const dbStyle of purchasedStylesData) {
      result.push({
        id: dbStyle.style_id as StyleId,
        name: dbStyle.name,
        emoji: dbStyle.emoji,
        audience: dbStyle.audience as 'universal' | 'female',
        previewColor: dbStyle.preview_color,
        description: dbStyle.description || ''
      })
    }

    if (purchasedStylesData.length > 0) {
      console.log('[Carousel] Added purchased styles:', purchasedStylesData.map(s => s.style_id))
    }

    return result
  })()

  // Локальные превью для fallback (когда БД пустая)
  const LOCAL_STYLE_PREVIEWS: Record<StyleId, string> = {
    APPLE_GLASSMORPHISM: '/styles/apple.jpg',
    AESTHETIC_BEIGE: '/styles/beige.jpg',
    SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
    MINIMALIST_LINE_ART: '/styles/minimal.jpg',
    GRADIENT_MESH_3D: '/styles/gradient.jpg',
  }

  // Локальные примеры для fallback (когда БД пустая)
  const getLocalExamples = (styleId: StyleId): string[] => {
    const counts: Record<StyleId, number> = {
      APPLE_GLASSMORPHISM: 9,
      AESTHETIC_BEIGE: 9,
      SOFT_PINK_EDITORIAL: 7,
      MINIMALIST_LINE_ART: 9,
      GRADIENT_MESH_3D: 9,
    }
    const count = counts[styleId] || 9
    return Array.from({ length: count }, (_, i) => `/styles/${styleId}/example_${i + 1}.jpeg`)
  }

  // Объединяем все стили из БД (активные + купленные) для поиска конфигов
  const allDbStyles = [...dbStyles, ...purchasedStylesData]

  // Функция получения конфига стиля (сначала БД, потом захардкоженные)
  // Принимает string для поддержки купленных стилей с произвольными ID
  const getStyleConfig = (styleId: string) => {
    console.log('[Carousel] getStyleConfig called for:', styleId)

    // Сначала ищем в БД (активные + купленные)
    const dbStyle = allDbStyles.find(s => s.style_id === styleId)
    const dbConfig = dbStyle?.config as Record<string, unknown> | undefined

    console.log('[Carousel] DB style found:', !!dbStyle)
    console.log('[Carousel] DB config:', dbConfig ? 'present' : 'missing')

    // НОВАЯ ЛОГИКА: Проверяем style_prompt ИЛИ content_system_prompt (админские промпты)
    if (dbConfig && typeof dbConfig === 'object') {
      const stylePrompt = dbConfig.style_prompt as string | undefined
      const contentSystemPrompt = dbConfig.content_system_prompt as string | undefined

      // Если есть хотя бы один промпт из админки с реальным контентом
      if ((stylePrompt && stylePrompt.length > 20) || (contentSystemPrompt && contentSystemPrompt.length > 20)) {
        console.log('[Carousel] ✓ Using DB config with admin prompts for style:', styleId)
        console.log('[Carousel] style_prompt length:', stylePrompt?.length || 0)
        console.log('[Carousel] content_system_prompt length:', contentSystemPrompt?.length || 0)
        return dbConfig
      }

      // LEGACY: Проверяем старую структуру slide_templates для обратной совместимости
      if ('slide_templates' in dbConfig) {
        const slideTemplates = dbConfig.slide_templates as Record<string, string> | undefined
        if (slideTemplates) {
          const hookTemplate = slideTemplates.HOOK || ''
          if (hookTemplate.length > 50) {
            console.log('[Carousel] ✓ Using DB config with legacy slide_templates for style:', styleId)
            return dbConfig
          }
        }
      }

      console.log('[Carousel] ✗ DB config has no valid prompts')
    }

    // Fallback на захардкоженные конфиги (только для базовых стилей)
    const hardcodedConfig = STYLE_CONFIGS[styleId as StyleId]
    if (hardcodedConfig) {
      console.log('[Carousel] ✓ Using hardcoded config for style:', styleId)
      console.log('[Carousel] slide_templates keys:', Object.keys(hardcodedConfig.slide_templates || {}))
      return hardcodedConfig
    }

    // Если и захардкоженного нет — используем дефолтный стиль
    console.log('[Carousel] ⚠ Style not found in hardcoded, using DEFAULT (APPLE_GLASSMORPHISM)')
    const defaultConfig = STYLE_CONFIGS['APPLE_GLASSMORPHISM']
    return defaultConfig
  }

  // Функция получения превью стиля
  // Принимает string для поддержки купленных стилей с произвольными ID
  const getStylePreview = (styleId: string) => {
    const dbStyle = allDbStyles.find(s => s.style_id === styleId)
    if (dbStyle?.preview_image) return dbStyle.preview_image
    // Fallback на локальные превью (только для базовых стилей)
    return LOCAL_STYLE_PREVIEWS[styleId as StyleId] || '/styles/apple.jpg'
  }

  // Функция получения примеров стиля
  // Принимает string для поддержки купленных стилей с произвольными ID
  const getStyleExamples = (styleId: string) => {
    const dbStyle = allDbStyles.find(s => s.style_id === styleId)
    if (dbStyle?.example_images && dbStyle.example_images.length > 0) {
      return dbStyle.example_images
    }
    // Fallback на локальные примеры (только для базовых стилей)
    return getLocalExamples(styleId as StyleId)
  }

  // Загружаем сохранённый стиль с валидацией
  // Важно: НЕ используем ref для "только один раз", т.к. purchasedStylesData загружается асинхронно
  const lastValidatedStylesCount = useRef(0)
  useEffect(() => {
    // Пропускаем если стилей нет
    if (mergedStylesIndex.length === 0) return

    // Пропускаем если уже валидировали с этим количеством стилей
    // (чтобы не сбрасывать стиль каждый раз при ререндере)
    if (lastValidatedStylesCount.current === mergedStylesIndex.length) return
    lastValidatedStylesCount.current = mergedStylesIndex.length

    console.log('[Carousel] Validating style, current:', style, 'total styles:', mergedStylesIndex.length)

    const savedStyle = localStorage.getItem(SAVED_STYLE_KEY)
    // Явно типизируем как string[] для поддержки купленных стилей
    const validStyleIds: string[] = mergedStylesIndex.map(s => s.id)

    // Проверяем сохранённый стиль из localStorage
    if (savedStyle && validStyleIds.includes(savedStyle)) {
      if (style !== savedStyle) {
        console.log('[Carousel] Using saved style:', savedStyle)
        setStyle(savedStyle)
      }
      return
    }

    // Проверяем текущий стиль из store
    if (validStyleIds.includes(style)) {
      console.log('[Carousel] Current style is valid:', style)
      return
    }

    // Сбрасываем на дефолтный ТОЛЬКО если текущий стиль недоступен
    const defaultStyle = mergedStylesIndex[0].id
    console.log('[Carousel] Resetting to default style:', defaultStyle)
    setStyle(defaultStyle)
    localStorage.setItem(SAVED_STYLE_KEY, defaultStyle)
  }, [setStyle, mergedStylesIndex, style])

  // Загружаем фото пользователя
  useEffect(() => {
    const loadUserPhoto = async () => {
      const user = getTelegramUser()
      if (user?.id) {
        const photoUrl = await getFirstUserPhoto(user.id)
        if (photoUrl) setUserPhoto(photoUrl)
      }
    }
    loadUserPhoto()
  }, [setUserPhoto])

  // Функция загрузки фото
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение')
      return
    }

    const user = getTelegramUser()
    if (!user?.id) {
      setError('Не удалось определить пользователя')
      return
    }

    setIsUploadingPhoto(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_PRESET)
      formData.append('folder', `carousel-users/${user.id}`)

      const response = await fetch(CLOUDINARY_URL, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Ошибка загрузки')

      const data = await response.json()
      const photoUrl = data.secure_url

      setUserPhoto(photoUrl)
      setShowPhotoModal(false)
      await savePhotoToSlot(user.id, photoUrl, 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить фото')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setUserPhoto(null)
    setShowPhotoModal(false)
  }

  const handleCreate = () => {
    if (!topic.trim()) {
      setError('Введите тему карусели')
      return
    }
    if (!gender) {
      setError('Выберите пол (♂ или ♀)')
      return
    }
    setError(null)
    setShowCtaPage(true)
  }

  const handleGenerate = async () => {
    // Защита от двойного клика
    if (isGeneratingRef.current) {
      console.log('[Carousel] Blocked duplicate generation request')
      return
    }
    isGeneratingRef.current = true

    if (!topic.trim()) {
      isGeneratingRef.current = false
      return
    }

    const user = getTelegramUser()
    if (!user?.id) {
      setError('Не удалось получить данные пользователя')
      isGeneratingRef.current = false
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Проверяем баланс монет (всегда списываем 30)
    if (coinBalance < GENERATION_COST) {
      setError(`Недостаточно монет. Нужно ${GENERATION_COST}, у вас ${coinBalance}`)
      setIsSubmitting(false)
      isGeneratingRef.current = false
      return
    }

    // Списываем монеты за генерацию
    try {
      const spendResult = await spendCoinsForGeneration(user.id, GENERATION_COST, 'Генерация карусели', {
        style: style,
        topic: topic.trim(),
        subscription: hasSubscription ? 'premium' : null
      })

      if (!spendResult || spendResult.success !== true) {
        const errorMsg = spendResult?.error || 'Не удалось списать монеты'
        setError(errorMsg)
        setIsSubmitting(false)
        isGeneratingRef.current = false
        return
      }
      // Обновляем баланс
      refetchBalance()
    } catch (err) {
      setError('Ошибка при списании монет')
      setIsSubmitting(false)
      isGeneratingRef.current = false
      return
    }

    let ctaValue = ''
    if (ctaType === 'PRODUCT') {
      ctaValue = ctaKeyword || 'МАГИЯ'
    } else {
      const engagementMap = {
        SUBSCRIBE: 'ПОДПИШИСЬ 🔔',
        COMMENT: 'НАПИШИ В КОММЕНТАХ 👇',
        SAVE: 'СОХРАНИ 💾'
      }
      ctaValue = engagementMap[engagementType]
    }

    try {
      // Получаем конфиг стиля (из БД или захардкоженный)
      console.log('[Carousel] ========== GENERATION START ==========')
      console.log('[Carousel] Selected style from store:', style)
      console.log('[Carousel] DB styles loaded:', dbStyles.length)

      const styleConfig = getStyleConfig(style)

      // Получаем глобальный системный промпт (для Копирайтера)
      const globalSystemPrompt = await getGlobalSystemPrompt()
      console.log('[Carousel] Global system prompt length:', globalSystemPrompt.length)

      console.log('[Carousel] ========== STYLE CONFIG RESULT ==========')
      console.log('[Carousel] styleConfig.id:', (styleConfig as any)?.id)
      console.log('[Carousel] styleConfig.name:', (styleConfig as any)?.name)
      console.log('[Carousel] Has style_prompt:', !!(styleConfig as any)?.style_prompt)

      // Получаем системный промпт формата если не expert
      let formatSystemPrompt = ''
      if (format && format !== 'expert') {
        const formatData = await getFormatByFormatId(format)
        if (formatData) {
          formatSystemPrompt = formatData.content_system_prompt
        }
      }

      const payload = {
        chatId: user.id,
        topic: topic.trim(),
        userPhoto: userPhoto || null,
        cta: ctaValue,
        ctaType,
        gender,
        styleId: style,
        styleConfig,
        // Глобальный промпт для Копирайтера (один на все стили)
        globalSystemPrompt,
        vasiaCore: VASIA_CORE,
        formatConfig: FORMAT_UNIVERSAL,
        // Формат карусели
        formatId: format || 'expert',
        ...(formatSystemPrompt ? { formatSystemPrompt } : {}),
        // Кастомный акцентный цвет
        ...(primaryColor ? { primaryColor } : {}),
        // Объект на слайдах
        ...(objectImage ? { objectImage } : {}),
        ...(objectPlacement ? { objectPlacement } : {}),
      }
      console.log('[Carousel] ========== SENDING TO N8N ==========')
      console.log('[Carousel] Payload styleId:', payload.styleId)
      console.log('[Carousel] Payload globalSystemPrompt length:', payload.globalSystemPrompt.length)

      const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Network error')

      // Трекинг успешной генерации
      trackCarouselEvent('start', {
        style,
        topic: topic.trim().slice(0, 50),
        ctaType,
        gender,
        hasSubscription,
        coinBalance
      })

      setStatus('generating')
      navigate('/agents/carousel/generating')
    } catch {
      setError('Не удалось отправить запрос')
      isGeneratingRef.current = false
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentStyleMeta = mergedStylesIndex.find(s => s.id === style)

  // Онбординг
  const { showOnboarding, completeOnboarding } = useCarouselOnboarding()

  // ========== CTA PAGE ==========
  if (showCtaPage) {
    return (
      <div className="min-h-screen bg-white">
        <div className="px-4 pt-3 pb-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">✓</div>
                <div className="w-12 h-1 rounded-full bg-gradient-to-r from-orange-400 to-pink-400" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-pink-500/30">2</div>
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
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <MegaphoneIcon className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Призыв к действию</h1>
              <p className="text-sm text-gray-500">Шаг 2 — Финальный слайд</p>
            </div>
          </div>

          {/* Пояснение */}
          <p className="text-xs text-gray-500 text-center mb-3">
            Выбери <span className="font-medium">одно</span>: продажа (кодовое слово) или охват (призыв)
          </p>

          {/* Segment Control - Glass */}
          <div className="flex bg-gray-100/80 backdrop-blur-xl rounded-2xl p-1 mb-5">
            <button
              onClick={() => setCtaType('PRODUCT')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${ctaType === 'PRODUCT'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              🛍️ Продажа
              <span className="block text-[10px] font-normal opacity-70">ПИШИ: слово</span>
            </button>
            <button
              onClick={() => setCtaType('ENGAGEMENT')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer ${ctaType === 'ENGAGEMENT'
                ? 'bg-white text-gray-900 shadow-md'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              📈 Охват
              <span className="block text-[10px] font-normal opacity-70">Подпишись и т.д.</span>
            </button>
          </div>

          {ctaType === 'PRODUCT' ? (
            <>
              {/* Info Card */}
              <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-2xl border border-orange-100 p-4 mb-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
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
                    ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg shadow-purple-500/10'
                    : 'border-gray-100 bg-white/80 hover:border-purple-200'
                    }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${engagementType === option.id
                    ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg'
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
              if (coinBalance < GENERATION_COST) {
                navigate('/shop')
                return
              }
              handleGenerate()
            }}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform hover:shadow-2xl cursor-pointer ${coinBalance < GENERATION_COST
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-green-500/30'
              : 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white shadow-pink-500/30'
              }`}
          >
            {isSubmitting ? (
              <><LoaderIcon size={20} className="animate-spin" /> Создание...</>
            ) : coinBalance < GENERATION_COST ? (
              <>
                <span>Пополнить баланс</span>
                <img src="/neirocoin.png" alt="Нейро" className="w-6 h-6 object-contain" />
              </>
            ) : (
              <>
                <span>Сгенерировать за {GENERATION_COST}</span>
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

  // Доступ открыт для всех — проверка монет только при генерации

  // ========== NO STYLES STATE ==========
  if (mergedStylesIndex.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-4xl">🎨</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Нет стилей</h2>
        <p className="text-gray-500 text-center mb-6">
          Стили ещё не настроены. Попросите администратора добавить стили в админ-панели.
        </p>
      </div>
    )
  }

  // ========== MAIN PAGE ==========
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Compact Header */}
      <div className="px-4 pt-3 pb-2">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-orange-500/30">1</div>
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
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg shadow-orange-500/20 ring-2 ring-white">
            <img src="/carousel-icon.png" alt="AI Карусель" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Создание карусели</h1>
            <p className="text-sm text-gray-500">Шаг 1 — Тема и стиль</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 flex-1 flex flex-col">
        {/* Topic Input - Clean Design */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">О чём карусель?</span>
            <button
              onClick={() => setShowTipsModal(true)}
              data-onboarding="tips"
              className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:scale-105 transition-all cursor-pointer animate-pulse"
            >
              <span className="text-xs font-bold">?</span>
            </button>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 5000))}
            placeholder="Например: ТОП 5 способов похудения после родов без диеты"
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
            data-onboarding="photo"
            className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100 p-3 flex items-center gap-2 hover:border-orange-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            {userPhoto ? (
              <img src={userPhoto} alt="" className="w-9 h-9 rounded-lg object-cover ring-2 ring-orange-400" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
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
            data-onboarding="style"
            className="flex-1 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100 p-3 flex items-center gap-2 hover:border-purple-200 transition-all active:scale-[0.98] cursor-pointer"
          >
            <img
              src={getStylePreview(style)}
              alt={currentStyleMeta?.name}
              className="w-9 h-9 rounded-lg object-cover ring-2 ring-purple-200"
            />
            <div className="flex-1 text-left min-w-0">
              <span className="font-medium text-gray-900 text-xs block">Стиль</span>
              <span className="text-[10px] text-purple-500 truncate block">{currentStyleMeta?.name?.split(' ')[0]}</span>
            </div>
          </button>

          {/* Gender - Обязательный выбор */}
          <div
            data-onboarding="gender"
            className={`flex rounded-xl p-1 ${!gender ? 'bg-red-50 ring-2 ring-red-200' : 'bg-gray-100/80 backdrop-blur'}`}
          >
            <button
              onClick={() => handleGenderChange('male')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${gender === 'male'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {gender === 'male' && <CheckIcon size={12} />}
              👨
            </button>
            <button
              onClick={() => handleGenderChange('female')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1 ${gender === 'female'
                ? 'bg-white text-pink-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {gender === 'female' && <CheckIcon size={12} />}
              👩
            </button>
          </div>
        </div>

        {/* Settings Button — admin only */}
        {telegramUser?.id && isAdmin(telegramUser.id) && (
          <button
            onClick={() => setShowSettingsPanel(true)}
            className="w-full mb-4 bg-white/80 backdrop-blur-xl rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:border-orange-200 transition-all active:scale-[0.99] cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-gray-900">Настройки</span>
              <span className="text-xs text-gray-400 ml-2">цвет, формат, объект</span>
            </div>
            {(primaryColor || format !== 'expert' || objectImage) && (
              <span className="text-xs text-orange-500 font-medium">✓</span>
            )}
            <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
            {error}
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={handleCreate}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white font-bold text-lg shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform hover:shadow-2xl hover:shadow-orange-500/40"
        >
          Далее →
        </button>
      </div>

      {/* Style Modal */}
      {showStyleModal && (
        <StyleModal
          currentStyle={style}
          onSelect={(id) => {
            setStyle(id)
            localStorage.setItem(SAVED_STYLE_KEY, id)
            setShowStyleModal(false)
          }}
          stylesIndex={mergedStylesIndex}
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

      {/* Tips Modal */}
      {showTipsModal && (
        <TipsModal onClose={() => setShowTipsModal(false)} />
      )}

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettingsPanel}
        onClose={() => setShowSettingsPanel(false)}
        primaryColor={primaryColor}
        onColorChange={setPrimaryColor}
        selectedFormat={format}
        onFormatChange={setFormat}
        objectImage={objectImage}
        objectPlacement={objectPlacement}
        onObjectImageChange={setObjectImage}
        onObjectPlacementChange={setObjectPlacement}
      />

      {/* Onboarding Coach Marks */}
      {showOnboarding && (
        <OnboardingCoachMarks onComplete={completeOnboarding} />
      )}
    </div>
  )
}

// ========== STYLE MODAL ==========

interface StyleMeta {
  id: string // Поддерживаем произвольные ID для купленных стилей
  name: string
  emoji: string
  audience: 'universal' | 'female'
  previewColor: string
  description: string
}

interface StyleModalProps {
  currentStyle: string // Поддерживаем произвольные ID
  onSelect: (id: string) => void
  stylesIndex: StyleMeta[]
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

  // Используем переданные стили из БД
  const activeStylesIndex = stylesIndex || []

  // Safe access with fallbacks
  const styleIndex = activeStylesIndex?.findIndex(s => s.id === selectedStyle) ?? 0
  const totalStyles = activeStylesIndex?.length ?? 5
  const selectedMeta = activeStylesIndex?.[styleIndex]
  const examples = getExamples(selectedStyle)

  // Preload current + adjacent style images
  useEffect(() => {
    if (!activeStylesIndex?.length) return

    const preloadImages = (styleId: string) => {
      const images = getExamples(styleId)
      images.forEach(src => {
        const img = new Image()
        img.src = src
        img.onload = () => {
          // Mark current style images as loaded immediately
          if (styleId === selectedStyle) {
            setLoadedImages(prev => new Set(prev).add(src))
          }
        }
      })
    }

    // Preload CURRENT style first
    preloadImages(selectedStyle)

    // Preload adjacent styles
    const nextIndex = styleIndex < totalStyles - 1 ? styleIndex + 1 : 0
    const prevIndex = styleIndex > 0 ? styleIndex - 1 : totalStyles - 1

    preloadImages(activeStylesIndex[nextIndex].id)
    preloadImages(activeStylesIndex[prevIndex].id)
  }, [selectedStyle, styleIndex, totalStyles, activeStylesIndex, getExamples])

  // Handle navigation with smooth transition
  const navigateToStyle = (newIndex: number) => {
    if (!activeStylesIndex?.length || isTransitioning) return

    setIsTransitioning(true)

    // Short delay for visual feedback
    setTimeout(() => {
      setSelectedStyle(activeStylesIndex[newIndex].id)
      setLoadedImages(new Set())
      setIsTransitioning(false)
    }, 150)
  }

  const goToPrev = () => {
    const newIndex = styleIndex > 0 ? styleIndex - 1 : totalStyles - 1
    navigateToStyle(newIndex)
  }

  const goToNext = () => {
    const newIndex = styleIndex < totalStyles - 1 ? styleIndex + 1 : 0
    navigateToStyle(newIndex)
  }

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNext()
    } else if (isRightSwipe) {
      goToPrev()
    }
  }

  // Handle image load
  const handleImageLoad = (src: string) => {
    setLoadedImages(prev => new Set(prev).add(src))
  }

  // Handle image error - more resilient
  // НЕ блокируем весь UI из-за одной картинки
  const handleImageError = (src: string) => {
    console.warn('Failed to load image:', src)
    // Mark as "loaded" to hide skeleton even on error
    setLoadedImages(prev => new Set(prev).add(src))
    // НЕ устанавливаем hasError - пусть UI работает даже без картинок
  }

  // Handle confirm selection
  const handleConfirm = () => {
    try {
      if (saveAsDefault && selectedStyle) {
        localStorage.setItem(SAVED_STYLE_KEY, selectedStyle)
      }
      onSelect(selectedStyle)
    } catch (err) {
      console.error('Error saving style:', err)
      onSelect(selectedStyle)
    }
  }

  // Error boundary fallback - только если нет стилей вообще
  if (!activeStylesIndex?.length) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Не удалось загрузить стили</h3>
          <p className="text-sm text-gray-500 mb-6">Попробуйте обновить страницу</p>
          <button
            onClick={() => onSelect(currentStyle)}
            className="px-6 py-3 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
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
          {/* Prev Button */}
          <button
            onClick={goToPrev}
            className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all cursor-pointer border border-gray-100 active:scale-95"
            aria-label="Предыдущий стиль"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Style Info */}
          <div className="text-center flex-1 px-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-orange-100 to-pink-100 rounded-full mb-1.5">
              <span className="text-xs font-semibold text-orange-600">{styleIndex + 1} из {totalStyles}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 truncate">{selectedMeta?.name || 'Стиль'}</h3>
          </div>

          {/* Next Button */}
          <button
            onClick={goToNext}
            className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center hover:shadow-lg transition-all cursor-pointer border border-gray-100 active:scale-95"
            aria-label="Следующий стиль"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Progress Dots */}
        <div className="mt-3 flex justify-center gap-1">
          {activeStylesIndex?.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setSelectedStyle(activeStylesIndex[i].id)
                setLoadedImages(new Set())
              }}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${i === styleIndex
                ? 'w-6 bg-gradient-to-r from-orange-500 to-pink-500'
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
              <div
                key={`${selectedStyle}-${i}`}
                className="aspect-[3/4] rounded-xl overflow-hidden shadow-sm bg-gray-100 relative"
              >
                {/* Skeleton while loading */}
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
                {/* Номер слайда */}
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
        {/* Save toggle */}
        <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-4 py-3">
          <div>
            <span className="text-sm font-medium text-gray-700">Сохранить как основной</span>
            <p className="text-xs text-gray-400">Будет выбран по умолчанию</p>
          </div>
          <button
            onClick={() => setSaveAsDefault(!saveAsDefault)}
            className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${saveAsDefault ? 'bg-gradient-to-r from-orange-500 to-pink-500' : 'bg-gray-300'
              }`}
            role="switch"
            aria-checked={saveAsDefault}
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${saveAsDefault ? 'left-5' : 'left-0.5'
              }`} />
          </button>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white font-bold text-base shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all cursor-pointer hover:shadow-xl"
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

  const triggerFileInput = () => {
    localFileInputRef.current?.click()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="p-4 text-center border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Твоё фото</h2>
          <p className="text-sm text-gray-500">Будет на слайдах карусели</p>
        </div>

        <div className="p-6">
          {/* Скрытый input для загрузки файла */}
          <input
            ref={localFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {photo ? (
            <div className="relative">
              <img src={photo} alt="Фото" className="w-full aspect-square rounded-2xl object-cover" />
              <button onClick={onRemove} className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70">
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
              <button onClick={triggerFileInput} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
                Заменить
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg">
                Готово
              </button>
            </>
          ) : (
            <button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
              Закрыть
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ========== TIPS MODAL ==========
const TIPS = [
  {
    title: 'Просто опиши тему',
    desc: 'Не нужны сложные промпты. Пиши как думаешь — AI всё поймёт.',
  },
  {
    title: 'Добавь контекст',
    desc: 'Укажи нишу, продукт или аудиторию — карусель будет точнее.',
  },
  {
    title: 'Попроси стиль',
    desc: 'С юмором, серьёзно, провокационно — AI подстроится.',
  },
  {
    title: 'Одно предложение',
    desc: 'Достаточно темы в 5-10 слов. Мы сделали всю магию за тебя.',
  },
]

interface TipsModalProps {
  onClose: () => void
}

function TipsModal({ onClose }: TipsModalProps) {
  const [currentTip, setCurrentTip] = useState(0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Как писать запрос</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tip content */}
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
            <span className="text-2xl">💡</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {TIPS[currentTip].title}
          </h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            {TIPS[currentTip].desc}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 pb-4">
          {TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentTip(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${i === currentTip ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-200'
                }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex gap-3 p-4 pt-0">
          <button
            onClick={() => setCurrentTip((prev) => (prev > 0 ? prev - 1 : TIPS.length - 1))}
            className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => setCurrentTip((prev) => (prev < TIPS.length - 1 ? prev + 1 : 0))}
            className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
// trigger redeploy Wed Jan 28 10:39:34 +07 2026
