import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto, savePhotoToSlot, supabase, getCoinBalance, spendCoinsForGeneration } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { STYLES_INDEX, STYLE_CONFIGS, VASIA_CORE, FORMAT_UNIVERSAL, type StyleId } from '@/lib/carouselStyles'
import { LoaderIcon, CheckIcon } from '@/components/ui/icons'

// Cloudinary config
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

// Ключи для localStorage
const SAVED_STYLE_KEY = 'carousel_default_style'
const SAVED_GENDER_KEY = 'carousel_default_gender'

// Превью стилей (JPEG)
const STYLE_PREVIEWS: Record<StyleId, string> = {
  APPLE_GLASSMORPHISM: '/styles/apple.jpg',
  AESTHETIC_BEIGE: '/styles/beige.jpg',
  SOFT_PINK_EDITORIAL: '/styles/pink.jpg',
  MINIMALIST_LINE_ART: '/styles/minimal.jpg',
  GRADIENT_MESH_3D: '/styles/gradient.jpg',
}

// SVG иконки (thin-line, без эмодзи)
const CarouselIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="6" height="12" rx="1" />
    <rect x="9" y="4" width="6" height="16" rx="1" />
    <rect x="16" y="6" width="6" height="12" rx="1" />
  </svg>
)

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

// Иконка замка
const LockIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function CarouselIndex() {
  const navigate = useNavigate()
  const { setStatus, userPhoto, setUserPhoto, style, setStyle } = useCarouselStore()

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
  
  // Gender state (загружаем из localStorage)
  const [gender, setGender] = useState<'male' | 'female'>(() => {
    const saved = localStorage.getItem(SAVED_GENDER_KEY)
    return (saved === 'female') ? 'female' : 'male'
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

  // Проверка подписки premium_clients
  const { data: hasSubscription, isLoading: isCheckingSubscription } = useQuery({
    queryKey: ['carousel-subscription', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return false

      const { data, error } = await supabase
        .from('premium_clients')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking subscription:', error)
        return false
      }

      return !!data
    },
    enabled: !!telegramUser?.id,
  })

  // Получаем баланс монет
  const { data: coinBalance = 0, isLoading: isLoadingCoins, refetch: refetchBalance } = useQuery({
    queryKey: ['coin-balance', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return 0
      return await getCoinBalance(telegramUser.id)
    },
    enabled: !!telegramUser?.id,
  })

  // Доступ есть если подписка ИЛИ достаточно монет
  const hasAccess = hasSubscription || coinBalance >= GENERATION_COST
  const isCheckingAccess = isCheckingSubscription || isLoadingCoins

  // Модальные окна закрываются системной кнопкой назад (через Layout.tsx)
  // Кастомная логика для модалок не нужна — просто закрываем при navigate(-1)

  // Загружаем сохранённый стиль
  useEffect(() => {
    const savedStyle = localStorage.getItem(SAVED_STYLE_KEY) as StyleId | null
    if (savedStyle && STYLES_INDEX.find(s => s.id === savedStyle)) {
      setStyle(savedStyle)
    }
  }, [setStyle])

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
    setError(null)
    setShowCtaPage(true)
  }

  const handleGenerate = async () => {
    if (!topic.trim()) return

    const user = getTelegramUser()
    if (!user?.id) {
      setError('Не удалось получить данные пользователя')
      return
    }

    setIsSubmitting(true)
    setError(null)

    // Списываем монеты за генерацию (всегда)
    try {
      const spendResult = await spendCoinsForGeneration(user.id, GENERATION_COST, 'Генерация карусели')

      if (!spendResult || spendResult.success !== true) {
        const errorMsg = spendResult?.error || 'Не удалось списать монеты'
        setError(errorMsg)
        setIsSubmitting(false)
        return
      }
      // Обновляем баланс
      refetchBalance()
    } catch (err) {
      setError('Ошибка при списании монет')
      setIsSubmitting(false)
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
      const styleConfig = STYLE_CONFIGS[style]
      const response = await fetch('https://n8n.iferma.pro/webhook/carousel-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: user.id,
          topic: topic.trim(),
          userPhoto: userPhoto || null,
          cta: ctaValue,
          ctaType,
          gender,
          styleId: style,
          styleConfig,
          vasiaCore: VASIA_CORE,
          formatConfig: FORMAT_UNIVERSAL,
        })
      })

      if (!response.ok) throw new Error('Network error')

      setStatus('generating')
      navigate('/agents/carousel/generating')
    } catch {
      setError('Не удалось отправить запрос')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentStyleMeta = STYLES_INDEX.find(s => s.id === style)

  // ========== CTA PAGE ==========
  if (showCtaPage) {
    return (
      <div className="min-h-screen bg-white">
        <div className="h-4" />

        <div className="px-4 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <MegaphoneIcon className="text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-900">Призыв к действию</h1>
          </div>
          <p className="text-gray-500 mb-6">Что должен сделать читатель?</p>

          {/* Segment Control */}
          <div className="flex bg-white/60 backdrop-blur-xl rounded-2xl p-1.5 mb-6 border border-white/50 shadow-lg">
            <button
              onClick={() => setCtaType('PRODUCT')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${ctaType === 'PRODUCT'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-gray-600'
                }`}
            >
              Продажа
            </button>
            <button
              onClick={() => setCtaType('ENGAGEMENT')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all ${ctaType === 'ENGAGEMENT'
                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                : 'text-gray-600'
                }`}
            >
              Охват
            </button>
          </div>

          {ctaType === 'PRODUCT' ? (
            <>
              {/* Card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 p-4 mb-4 flex items-center gap-4 shadow-lg">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <CheckIcon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageIcon className="text-gray-400" />
                    <span className="font-semibold text-gray-900">Кодовое слово</span>
                  </div>
                  <p className="text-sm text-gray-500">Клиент напишет его в директ</p>
                </div>
              </div>

              {/* Input Card */}
              <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 p-4 shadow-lg mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Ваше слово
                </label>
                <input
                  type="text"
                  value={ctaKeyword}
                  onChange={(e) => setCtaKeyword(e.target.value.toUpperCase())}
                  placeholder="МАГИЯ"
                  className="w-full px-4 py-3 rounded-xl bg-white/80 border border-gray-200 text-gray-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <p className="text-xs text-gray-400 mt-2">Например: СТАРТ, ХОЧУ, VIP</p>
              </div>
            </>
          ) : (
            <div className="space-y-3 mb-6">
              {[
                { id: 'SUBSCRIBE' as const, label: 'Подпишись', desc: 'Призыв подписаться' },
                { id: 'COMMENT' as const, label: 'Комментируй', desc: 'Напиши в комментах' },
                { id: 'SAVE' as const, label: 'Сохрани', desc: 'Сохрани себе пост' },
              ].map(option => (
                <button
                  key={option.id}
                  onClick={() => setEngagementType(option.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl transition-all shadow-lg ${engagementType === option.id
                    ? 'border-orange-500 bg-orange-50/80'
                    : 'border-white/50 bg-white/70'
                    }`}
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg ${engagementType === option.id
                    ? 'bg-gradient-to-br from-orange-500 to-orange-600'
                    : 'bg-gray-100'
                    }`}>
                    {engagementType === option.id && <CheckIcon size={20} className="text-white" />}
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

          <button
            onClick={handleGenerate}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><LoaderIcon size={20} className="animate-spin" /> Создание...</>
            ) : (
              <>
                <span>Сгенерировать за {GENERATION_COST}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
                  <circle cx="12" cy="12" r="10" fill="currentColor"/>
                  <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#B45309" fontWeight="bold">N</text>
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ========== LOADING ==========
  if (isCheckingAccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoaderIcon size={32} className="animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-gray-500">Проверка доступа...</p>
        </div>
      </div>
    )
  }

  // ========== NO ACCESS ==========
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-700">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Карусель</h1>
              <p className="text-xs text-gray-400">Требуется подписка</p>
            </div>
          </div>
        </div>

        {/* Locked content */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <LockIcon className="text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h2>
            <p className="text-gray-500 mb-6">
              Создание каруселей доступно для пользователей с активной подпиской или достаточным балансом монет.
            </p>
            <button
              onClick={() => navigate('/shop')}
              className="px-6 py-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white font-semibold rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all"
            >
              Оформить подписку
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== MAIN PAGE ==========
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Compact Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-md shadow-orange-500/20">
            <CarouselIcon className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI Карусель</h1>
            <p className="text-xs text-gray-500">9 слайдов за 2 минуты</p>
          </div>
        </div>
        {/* Balance badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-orange-500">
            <circle cx="12" cy="12" r="10"/>
          </svg>
          <span className="text-sm font-semibold text-orange-600">{coinBalance}</span>
        </div>
      </div>

      <div className="px-4 pb-6 flex-1 flex flex-col">
        {/* Topic Input */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Тема карусели</span>
            <button
              onClick={() => setShowTipsModal(true)}
              className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <span className="text-[10px] font-medium">i</span>
            </button>
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="ТОП 5 ответов на возражение «Ваши бады дорогие!» Сделай с юмором 😄"
            className="w-full min-h-[120px] px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-300 resize-none text-sm"
          />
        </div>

        {/* Photo & Style Row */}
        <div className="flex gap-2 mb-3">
          {/* Photo */}
          <button
            onClick={() => setShowPhotoModal(true)}
            className="flex-1 bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-orange-300 transition-all active:scale-[0.98] cursor-pointer"
          >
            {userPhoto ? (
              <img src={userPhoto} alt="" className="w-10 h-10 rounded-lg object-cover ring-2 ring-orange-400" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <CameraIcon className="text-orange-400 w-5 h-5" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <span className="font-medium text-gray-900 text-sm block truncate">Фото</span>
              {userPhoto ? (
                <span className="text-xs text-green-600">Готово</span>
              ) : (
                <span className="text-xs text-gray-400">Добавить</span>
              )}
            </div>
          </button>

          {/* Style */}
          <button
            onClick={() => setShowStyleModal(true)}
            className="flex-1 bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 hover:border-orange-300 transition-all active:scale-[0.98] cursor-pointer"
          >
            <img
              src={STYLE_PREVIEWS[style]}
              alt={currentStyleMeta?.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
            <div className="flex-1 text-left min-w-0">
              <span className="font-medium text-gray-900 text-sm block truncate">Стиль</span>
              <span className="text-xs text-orange-500 truncate block">{currentStyleMeta?.name?.split(' ')[0]}</span>
            </div>
          </button>
        </div>

        {/* Gender Toggle - минималистичный */}
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-xs text-gray-400">Пол:</span>
          <div className="flex bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => handleGenderChange('male')}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer ${
                gender === 'male'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-400'
              }`}
            >
              ♂
            </button>
            <button
              onClick={() => handleGenderChange('female')}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all cursor-pointer ${
                gender === 'female'
                  ? 'bg-white text-gray-700 shadow-sm'
                  : 'text-gray-400'
              }`}
            >
              ♀
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-2.5 rounded-lg bg-red-50 text-red-600 text-xs border border-red-100">
            {error}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <span>Создать за {GENERATION_COST}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
            <circle cx="12" cy="12" r="10" fill="currentColor"/>
            <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#B45309" fontWeight="bold">N</text>
          </svg>
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
          onClose={() => setShowStyleModal(false)}
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
    </div>
  )
}

// ========== STYLE MODAL ==========
// Примеры слайдов для каждого стиля (из public/styles/)
const STYLE_EXAMPLES: Record<StyleId, string[]> = {
  APPLE_GLASSMORPHISM: [
    '/styles/APPLE_GLASSMORPHISM/example_1.jpeg',
    '/styles/APPLE_GLASSMORPHISM/example_2.jpeg',
    '/styles/APPLE_GLASSMORPHISM/example_3.jpeg',
    '/styles/APPLE_GLASSMORPHISM/example_4.jpeg',
  ],
  AESTHETIC_BEIGE: [
    '/styles/AESTHETIC_BEIGE/example_1.jpeg',
    '/styles/AESTHETIC_BEIGE/example_2.jpeg',
    '/styles/AESTHETIC_BEIGE/example_3.jpeg',
    '/styles/AESTHETIC_BEIGE/example_4.jpeg',
  ],
  SOFT_PINK_EDITORIAL: [
    '/styles/SOFT_PINK_EDITORIAL/example_1.jpeg',
    '/styles/SOFT_PINK_EDITORIAL/example_2.jpeg',
    '/styles/SOFT_PINK_EDITORIAL/example_3.jpeg',
    '/styles/SOFT_PINK_EDITORIAL/example_4.jpeg',
  ],
  MINIMALIST_LINE_ART: [
    '/styles/MINIMALIST_LINE_ART/example_1.jpeg',
    '/styles/MINIMALIST_LINE_ART/example_2.jpeg',
    '/styles/MINIMALIST_LINE_ART/example_3.jpeg',
    '/styles/MINIMALIST_LINE_ART/example_4.jpeg',
  ],
  GRADIENT_MESH_3D: [
    '/styles/GRADIENT_MESH_3D/example_1.jpeg',
    '/styles/GRADIENT_MESH_3D/example_2.jpeg',
    '/styles/GRADIENT_MESH_3D/example_3.jpeg',
    '/styles/GRADIENT_MESH_3D/example_4.jpeg',
  ],
}

interface StyleModalProps {
  currentStyle: StyleId
  onSelect: (id: StyleId) => void
  onClose: () => void
}

function StyleModal({ currentStyle, onSelect, onClose }: StyleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle)
  const [saveAsDefault, setSaveAsDefault] = useState(true)
  const styleIndex = STYLES_INDEX.findIndex(s => s.id === selectedStyle)

  const selectedMeta = STYLES_INDEX.find(s => s.id === selectedStyle)
  const examples = STYLE_EXAMPLES[selectedStyle]

  const goToPrev = () => {
    const newIndex = styleIndex > 0 ? styleIndex - 1 : STYLES_INDEX.length - 1
    setSelectedStyle(STYLES_INDEX[newIndex].id)
  }

  const goToNext = () => {
    const newIndex = styleIndex < STYLES_INDEX.length - 1 ? styleIndex + 1 : 0
    setSelectedStyle(STYLES_INDEX[newIndex].id)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-xl transition-colors">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <h2 className="text-lg font-bold text-gray-900">Выбери стиль</h2>
        <div className="w-10" />
      </div>

      {/* Style Name & Navigation */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPrev}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div className="text-center flex-1 px-4">
            <h3 className="text-xl font-bold text-gray-900">{selectedMeta?.name}</h3>
            <p className="text-sm text-gray-500">{selectedMeta?.description}</p>
          </div>

          <button
            onClick={goToNext}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        {/* Style dots */}
        <div className="flex justify-center gap-2 mt-3">
          {STYLES_INDEX.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === styleIndex ? 'w-6 bg-orange-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Examples Grid */}
      <div className="flex-1 px-4 pb-4 overflow-auto">
        <p className="text-xs text-gray-400 mb-3 text-center">Примеры слайдов в этом стиле</p>
        <div className="grid grid-cols-2 gap-2">
          {examples.map((src, i) => (
            <div
              key={i}
              className="aspect-[3/4] bg-gray-100 rounded-2xl overflow-hidden relative"
            >
              <img
                src={src}
                alt={`Пример ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Заглушка если картинка не загрузилась
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.parentElement!.innerHTML = `
                    <div class="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span class="text-xs text-gray-400 mt-2">Слайд ${i + 1}</span>
                    </div>
                  `
                }}
              />
              <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded-lg">
                <span className="text-xs text-white font-medium">{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="px-4 py-4 border-t border-gray-100 bg-white">
        {/* Save toggle */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600">Сохранить как основной</span>
          <button
            onClick={() => setSaveAsDefault(!saveAsDefault)}
            className={`w-12 h-7 rounded-full transition-colors relative ${saveAsDefault ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
              saveAsDefault ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>

        <button
          onClick={() => {
            if (saveAsDefault) localStorage.setItem(SAVED_STYLE_KEY, selectedStyle)
            onSelect(selectedStyle)
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/30 active:scale-[0.98] transition-transform"
        >
          Выбрать этот стиль
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
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === currentTip ? 'w-6 bg-orange-500' : 'w-1.5 bg-gray-200'
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
