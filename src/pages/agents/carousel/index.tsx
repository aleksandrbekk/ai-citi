import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto, savePhotoToSlot, supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { STYLES_INDEX, STYLE_CONFIGS, VASIA_CORE, FORMAT_UNIVERSAL, type StyleId } from '@/lib/carouselStyles'
import { LoaderIcon, CheckIcon } from '@/components/ui/icons'

// Cloudinary config
const CLOUDINARY_CLOUD = 'ds8ylsl2x'
const CLOUDINARY_PRESET = 'carousel_unsigned'
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`

// Ключ для localStorage
const SAVED_STYLE_KEY = 'carousel_default_style'

// Telegram WebApp
const tg = window.Telegram?.WebApp

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

const ChevronIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Получаем telegram_id пользователя
  const telegramUser = getTelegramUser()

  // Проверка доступа - есть ли пользователь в premium_clients
  const { data: hasAccess, isLoading: isCheckingAccess } = useQuery({
    queryKey: ['carousel-access', telegramUser?.id],
    queryFn: async () => {
      if (!telegramUser?.id) return false

      const { data, error } = await supabase
        .from('premium_clients')
        .select('id')
        .eq('telegram_id', telegramUser.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking access:', error)
        return false
      }

      return !!data
    },
    enabled: !!telegramUser?.id,
  })

  // Telegram BackButton
  useEffect(() => {
    if (tg?.BackButton) {
      tg.BackButton.show()

      const handleBack = () => {
        if (showStyleModal) {
          setShowStyleModal(false)
        } else if (showCtaPage) {
          setShowCtaPage(false)
        } else {
          navigate('/agents')
        }
      }

      tg.BackButton.onClick(handleBack)
      return () => { tg.BackButton.offClick(handleBack) }
    }
  }, [showStyleModal, showCtaPage, showPhotoModal, navigate])

  useEffect(() => {
    return () => { tg?.BackButton?.hide() }
  }, [])

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
        <div className="h-[100px]" />

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
            ) : 'Создать карусель'}
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
        <div className="h-[100px] flex-shrink-0" />

        <div className="px-4 pb-8 flex-1 flex flex-col items-center justify-center">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-8 text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-6">
              <LockIcon className="text-orange-500" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">Доступ ограничен</h1>

            <p className="text-gray-500 mb-6">
              Создание каруселей доступно только для платных клиентов. Оформите подписку, чтобы получить доступ к этой функции.
            </p>

            <button
              onClick={() => navigate('/agents')}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/30"
            >
              Назад
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ========== MAIN PAGE ==========
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Safe area */}
      <div className="h-[100px] flex-shrink-0" />

      <div className="px-4 pb-8 flex-1 flex flex-col">
        {/* Main Glassmorphism Card */}
        <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl p-5 flex-1 flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <CarouselIcon className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Создай карусель</h1>
              <p className="text-xs text-gray-500">AI сгенерирует 9 слайдов</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />

          {/* Topic Input */}
          <div className="mb-5 flex-1 flex flex-col">
            <label className="block text-sm font-medium text-gray-600 mb-2">Тема</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Например: 5 способов увеличить продажи в сетевом..."
              className="w-full flex-1 min-h-[120px] px-4 py-3 rounded-xl bg-white/80 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-5" />

          {/* Photo & Style Row */}
          <div className="flex gap-3 mb-5">
            {/* Photo Button */}
            <button
              onClick={() => setShowPhotoModal(true)}
              className="flex-1 bg-white/80 rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-orange-300 transition-colors"
            >
              {userPhoto ? (
                <img src={userPhoto} alt="" className="w-11 h-11 rounded-full object-cover ring-2 ring-green-500 ring-offset-2" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center">
                  <CameraIcon className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 text-left">
                <span className="font-medium text-gray-900 block">Фото</span>
                {userPhoto ? (
                  <span className="text-xs text-green-500">Загружено</span>
                ) : (
                  <span className="text-xs text-gray-500">Добавить</span>
                )}
              </div>
              <ChevronIcon className="text-gray-400" />
            </button>

            {/* Style Button */}
            <button
              onClick={() => setShowStyleModal(true)}
              className="flex-1 bg-white/80 rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:border-orange-300 transition-colors min-w-0"
            >
              <img
                src={STYLE_PREVIEWS[style]}
                alt={currentStyleMeta?.name}
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 text-left min-w-0 overflow-hidden">
                <span className="font-medium text-gray-900 block">Стиль</span>
                <span className="text-xs text-gray-500 truncate block max-w-[80px]">{currentStyleMeta?.name}</span>
              </div>
              <ChevronIcon className="text-gray-400 flex-shrink-0" />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          {/* Create Button */}
          <button
            onClick={handleCreate}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg shadow-xl shadow-orange-500/30"
          >
            Создать
          </button>
        </div>
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
          fileInputRef={fileInputRef}
          onUpload={handlePhotoUpload}
          onRemove={handleRemovePhoto}
          onClose={() => setShowPhotoModal(false)}
        />
      )}
    </div>
  )
}

// ========== STYLE MODAL ==========
interface StyleModalProps {
  currentStyle: StyleId
  onSelect: (id: StyleId) => void
  onClose: () => void
}

function StyleModal({ currentStyle, onSelect, onClose }: StyleModalProps) {
  const [selectedStyle, setSelectedStyle] = useState(currentStyle)
  const [saveAsDefault, setSaveAsDefault] = useState(true)

  const selectedMeta = STYLES_INDEX.find(s => s.id === selectedStyle)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 text-center border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Выбери стиль</h2>
        </div>

        {/* Hero Preview */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          <img
            src={STYLE_PREVIEWS[selectedStyle]}
            alt={selectedMeta?.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
            <p className="text-white font-semibold text-lg">{selectedMeta?.name}</p>
            <p className="text-white/70 text-sm">{selectedMeta?.description}</p>
          </div>
        </div>

        {/* Style Thumbnails */}
        <div className="p-4 flex justify-center gap-2">
          {STYLES_INDEX.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`w-14 h-14 rounded-xl overflow-hidden transition-all ${selectedStyle === s.id
                ? 'ring-2 ring-orange-500 ring-offset-2 scale-110'
                : 'opacity-60 hover:opacity-100'
                }`}
            >
              <img
                src={STYLE_PREVIEWS[s.id]}
                alt={s.name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>

        {/* Save toggle */}
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100">
          <span className="text-sm text-gray-600">Сохранить как основной</span>
          <button
            onClick={() => setSaveAsDefault(!saveAsDefault)}
            className={`w-12 h-7 rounded-full transition-colors relative ${saveAsDefault ? 'bg-orange-500' : 'bg-gray-300'}`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${saveAsDefault ? 'left-6' : 'left-1'
              }`} />
          </button>
        </div>

        {/* Button */}
        <div className="p-4 pt-0">
          <button
            onClick={() => {
              if (saveAsDefault) localStorage.setItem(SAVED_STYLE_KEY, selectedStyle)
              onSelect(selectedStyle)
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}

// ========== PHOTO MODAL ==========
interface PhotoModalProps {
  photo: string | null
  isUploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (file: File) => void
  onRemove: () => void
  onClose: () => void
}

function PhotoModal({ photo, isUploading, fileInputRef, onUpload, onRemove, onClose }: PhotoModalProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
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
            <label className="flex flex-col items-center justify-center w-full aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-orange-400 cursor-pointer bg-gray-50">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
            </label>
          )}
        </div>

        <div className="p-4 pt-0 flex gap-3">
          {photo ? (
            <>
              <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50">
                Заменить
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-lg">
                Готово
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
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
