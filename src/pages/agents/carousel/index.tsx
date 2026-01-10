import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCarouselStore } from '@/store/carouselStore'
import { getFirstUserPhoto } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'
import { STYLES_INDEX, STYLE_CONFIGS, VASIA_CORE, FORMAT_UNIVERSAL, type StyleId } from '@/lib/carouselStyles'
import { LoaderIcon, CheckIcon } from '@/components/ui/icons'

// Ключ для localStorage
const SAVED_STYLE_KEY = 'carousel_default_style'

// Telegram WebApp
const tg = window.Telegram?.WebApp

// SVG иконки
const CarouselSvgIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="7" height="12" rx="1" />
    <rect x="8.5" y="4" width="7" height="16" rx="1" />
    <rect x="15" y="6" width="7" height="12" rx="1" />
  </svg>
)

const CameraSvgIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const StyleSvgIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
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

      return () => {
        tg.BackButton.offClick(handleBack)
      }
    }
  }, [showStyleModal, showCtaPage, navigate])

  // Скрываем BackButton при размонтировании
  useEffect(() => {
    return () => {
      if (tg?.BackButton) {
        tg.BackButton.hide()
      }
    }
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

    // Формируем CTA
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
    } catch (err) {
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
        {/* Safe area */}
        <div className="h-[100px]" />

        <div className="px-4 pb-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <MegaphoneSvgIcon />
            <h1 className="text-2xl font-bold text-gray-900">Призыв к действию</h1>
          </div>
          <p className="text-gray-500 mb-6">Что должен сделать читатель?</p>

          {/* Segment Control */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-6">
            <button
              onClick={() => setCtaType('PRODUCT')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all ${ctaType === 'PRODUCT'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-600'
                }`}
            >
              🏷️ Продажа
            </button>
            <button
              onClick={() => setCtaType('ENGAGEMENT')}
              className={`flex-1 py-3 px-4 rounded-full text-sm font-medium transition-all ${ctaType === 'ENGAGEMENT'
                ? 'bg-orange-500 text-white shadow-lg'
                : 'text-gray-600'
                }`}
            >
              📈 Охват
            </button>
          </div>

          {/* Content based on type */}
          {ctaType === 'PRODUCT' ? (
            <>
              {/* Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSvgIcon />
                    <span className="font-semibold text-gray-900">Написать кодовое слово</span>
                  </div>
                  <p className="text-sm text-gray-500">Пользователь пишет ваше слово в директ</p>
                </div>
              </div>

              {/* Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваше кодовое слово
                </label>
                <input
                  type="text"
                  value={ctaKeyword}
                  onChange={(e) => setCtaKeyword(e.target.value.toUpperCase())}
                  placeholder="МАГИЯ"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                <p className="text-xs text-gray-400 mt-2">Например: СТАРТ, ХОЧУ, VIP</p>
              </div>
            </>
          ) : (
            <>
              {/* Engagement options */}
              <div className="space-y-3">
                {[
                  { id: 'SUBSCRIBE' as const, label: 'Подпишись', icon: '🔔' },
                  { id: 'COMMENT' as const, label: 'Напиши в комментах', icon: '💬' },
                  { id: 'SAVE' as const, label: 'Сохрани', icon: '💾' },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setEngagementType(option.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${engagementType === option.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${engagementType === option.id ? 'bg-orange-500' : 'bg-gray-100'
                      }`}>
                      {engagementType === option.id ? (
                        <CheckIcon size={20} className="text-white" />
                      ) : (
                        <span className="text-xl">{option.icon}</span>
                      )}
                    </div>
                    <span className="font-medium text-gray-900">{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg shadow-lg shadow-orange-500/30 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
          >
            {isSubmitting ? (
              <>
                <LoaderIcon size={20} className="animate-spin" />
                Создание...
              </>
            ) : (
              <>✨ Создать карусель</>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ========== MAIN PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* Safe area */}
      <div className="h-[100px]" />

      <div className="px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="text-orange-500">
            <CarouselSvgIcon />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Новая карусель</h1>
        </div>

        {/* Topic Input Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
          <label className="block text-sm font-medium text-gray-500 mb-2">
            О чём будет карусель?
          </label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Например: 5 способов увеличить продажи в сетевом..."
            className="w-full h-40 resize-none bg-transparent text-gray-900 placeholder:text-gray-400 focus:outline-none text-base"
          />
        </div>

        {/* Photo & Style Buttons */}
        <div className="flex gap-3 mb-4">
          {/* Photo Button */}
          <button className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="text-gray-400">
              {userPhoto ? (
                <img src={userPhoto} alt="Фото" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <CameraSvgIcon />
              )}
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-gray-900">Фото</span>
              {userPhoto && <span className="text-green-500 ml-1">✓</span>}
            </div>
            <ChevronRightIcon />
          </button>

          {/* Style Button */}
          <button
            onClick={() => setShowStyleModal(true)}
            className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: currentStyleMeta?.previewColor + '20' }}
            >
              <StyleSvgIcon />
            </div>
            <div className="flex-1 text-left">
              <span className="font-medium text-gray-900">Стиль</span>
              <p className="text-xs text-gray-500 truncate">{currentStyleMeta?.name}</p>
            </div>
            <ChevronRightIcon />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Create Button */}
        <button
          onClick={handleCreate}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold text-lg shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
        >
          ✨ Создать
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
    </div>
  )
}

// ========== HELPER ICONS ==========
const MegaphoneSvgIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
    <path d="M3 11l18-5v12L3 13v-2z" />
    <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
)

const MessageSvgIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
)

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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 text-center border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Выбери стиль</h2>
        </div>

        {/* Hero Preview */}
        <div className="aspect-[4/5] bg-gray-100 relative overflow-hidden">
          <div
            className="w-full h-full flex items-center justify-center text-6xl"
            style={{ backgroundColor: selectedMeta?.previewColor + '30' }}
          >
            {selectedMeta?.emoji}
          </div>
          {/* Style name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-white font-semibold text-lg">{selectedMeta?.name}</p>
          </div>
        </div>

        {/* Style Thumbnails */}
        <div className="p-4 flex justify-center gap-3">
          {STYLES_INDEX.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStyle(s.id)}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all ${selectedStyle === s.id
                ? 'ring-3 ring-orange-500 ring-offset-2 scale-110'
                : 'opacity-60 hover:opacity-100'
                }`}
              style={{ backgroundColor: s.previewColor + '30' }}
            >
              {s.emoji}
            </button>
          ))}
        </div>

        {/* Style Info */}
        <div className="px-4 pb-2 text-center">
          <p className="text-xl font-semibold text-gray-900">
            {selectedMeta?.emoji} {selectedMeta?.name}
          </p>
          <p className="text-sm text-gray-500">{selectedMeta?.description}</p>
        </div>

        {/* Save as default */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Сохранить как основной</span>
          <button
            onClick={() => setSaveAsDefault(!saveAsDefault)}
            className={`w-12 h-7 rounded-full transition-colors ${saveAsDefault ? 'bg-orange-500' : 'bg-gray-300'
              }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${saveAsDefault ? 'translate-x-6' : 'translate-x-1'
              }`} />
          </button>
        </div>

        {/* Button */}
        <div className="p-4">
          <button
            onClick={() => {
              if (saveAsDefault) {
                localStorage.setItem(SAVED_STYLE_KEY, selectedStyle)
              }
              onSelect(selectedStyle)
            }}
            className="w-full py-3 rounded-xl bg-orange-500 text-white font-semibold"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
