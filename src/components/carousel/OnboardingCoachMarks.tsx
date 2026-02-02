import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, Sparkles } from 'lucide-react'

// Ключ для localStorage
const ONBOARDING_COMPLETED_KEY = 'carousel_onboarding_completed'

// Персонаж-дизайнер
const MASCOT_IMAGE = '/images/neurochik.png'
const MASCOT_NAME = 'Нейрочик'

interface OnboardingStep {
  id: string
  message: string
  emoji: string
  targetSelector: string
  position: 'top' | 'bottom'
  highlight?: boolean
}

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    message: 'Привет! Я твой AI-дизайнер! Покажу как создать крутую карусель за минуту 🚀',
    emoji: '👋',
    targetSelector: '',
    position: 'bottom',
  },
  {
    id: 'style',
    message: 'Тут выбираешь стиль слайдов. У нас много крутых дизайнов — попробуй разные!',
    emoji: '🎨',
    targetSelector: '[data-onboarding="style"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'gender',
    message: 'Обязательно укажи пол! Я подберу тон текста специально для тебя ✨',
    emoji: '👤',
    targetSelector: '[data-onboarding="gender"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'photo',
    message: 'Загрузи своё фото — оно появится на слайдах. Выглядит супер профессионально!',
    emoji: '📸',
    targetSelector: '[data-onboarding="photo"]',
    position: 'bottom',
    highlight: true,
  },
  {
    id: 'done',
    message: 'Вот и всё! Напиши тему карусели и нажми «Далее». Я сделаю магию! ✨',
    emoji: '🎉',
    targetSelector: '',
    position: 'bottom',
  },
]

interface OnboardingCoachMarksProps {
  onComplete: () => void
}

export function OnboardingCoachMarks({ onComplete }: OnboardingCoachMarksProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(true)
  const [isTyping, setIsTyping] = useState(true)
  const [displayedText, setDisplayedText] = useState('')

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const hasTarget = step.targetSelector !== ''

  // Эффект печатания текста
  useEffect(() => {
    setIsTyping(true)
    setDisplayedText('')

    let index = 0
    const text = step.message

    const typeInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1))
        index++
      } else {
        setIsTyping(false)
        clearInterval(typeInterval)
      }
    }, 25) // Скорость печати

    return () => clearInterval(typeInterval)
  }, [step.message])

  // Обновляем позицию целевого элемента
  useEffect(() => {
    if (!hasTarget) {
      setTargetRect(null)
      return
    }

    const updatePosition = () => {
      const target = document.querySelector(step.targetSelector)
      if (target) {
        setTargetRect(target.getBoundingClientRect())
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [step.targetSelector, hasTarget])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [isLastStep])

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setIsVisible(false)
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    onComplete()
  }

  // Клик по оверлею = следующий шаг (для быстрого прохождения)
  const handleOverlayClick = (e: React.MouseEvent) => {
    // Не переходим если кликнули по spotlight области
    if (targetRect) {
      const clickX = e.clientX
      const clickY = e.clientY
      if (
        clickX >= targetRect.left - 8 &&
        clickX <= targetRect.right + 8 &&
        clickY >= targetRect.top - 8 &&
        clickY <= targetRect.bottom + 8
      ) {
        return
      }
    }
    if (!isTyping) {
      handleNext()
    }
  }

  if (!isVisible) return null

  // Spotlight позиция
  const spotlightStyle: React.CSSProperties | null = targetRect && step.highlight ? {
    position: 'fixed',
    left: targetRect.left - 6,
    top: targetRect.top - 6,
    width: targetRect.width + 12,
    height: targetRect.height + 12,
    borderRadius: 16,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)',
    zIndex: 999,
    pointerEvents: 'none',
  } : null

  return (
    <div
      className="fixed inset-0 z-[998]"
      onClick={handleOverlayClick}
    >
      {/* Затемнение без spotlight для шагов без target */}
      {!hasTarget && (
        <div className="absolute inset-0 bg-black/75" />
      )}

      {/* Spotlight для шагов с target */}
      {spotlightStyle && <div style={spotlightStyle} className="transition-all duration-300 ease-out" />}

      {/* Пульсирующее кольцо */}
      {targetRect && step.highlight && (
        <div
          style={{
            position: 'fixed',
            left: targetRect.left - 10,
            top: targetRect.top - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            borderRadius: 20,
            zIndex: 1000,
            pointerEvents: 'none',
          }}
          className="border-2 border-cyan-400 animate-pulse"
        />
      )}

      {/* Mascot + Speech Bubble */}
      <div
        className="fixed bottom-6 left-4 right-4 z-[1001] animate-in slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-end gap-3 max-w-sm mx-auto">
          {/* Mascot Avatar */}
          <div className="relative flex-shrink-0">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-orange-400 rounded-full blur-lg opacity-50 animate-pulse" />

            {/* Avatar */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 p-0.5 shadow-xl shadow-cyan-500/30">
              <div className="w-full h-full rounded-full bg-white overflow-hidden">
                <img
                  src={MASCOT_IMAGE}
                  alt={MASCOT_NAME}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback если картинка не загрузилась
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>

              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
          </div>

          {/* Speech Bubble */}
          <div className="flex-1 relative">
            {/* Bubble tail */}
            <div className="absolute bottom-3 -left-2 w-4 h-4 bg-white transform rotate-45 rounded-sm" />

            {/* Main bubble */}
            <div className="relative bg-white rounded-2xl rounded-bl-md shadow-2xl shadow-black/20 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-cyan-50 to-orange-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{step.emoji}</span>
                  <span className="font-bold text-gray-900 text-sm">{MASCOT_NAME}</span>
                  <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white text-[10px] font-bold rounded-full">AI</span>
                </div>
                <button
                  onClick={handleSkip}
                  className="p-1 rounded-full hover:bg-gray-200/50 transition-colors cursor-pointer"
                  aria-label="Закрыть"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Message */}
              <div className="px-4 py-3">
                <p className="text-gray-700 text-sm leading-relaxed min-h-[40px]">
                  {displayedText}
                  {isTyping && <span className="inline-block w-0.5 h-4 bg-cyan-500 ml-0.5 animate-pulse" />}
                </p>
              </div>

              {/* Progress & Actions */}
              <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100">
                {/* Progress dots */}
                <div className="flex items-center justify-center gap-1.5 mb-3">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === currentStep
                          ? 'w-6 bg-gradient-to-r from-orange-400 to-cyan-500'
                          : i < currentStep
                          ? 'w-1.5 bg-orange-400'
                          : 'w-1.5 bg-gray-200'
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-2">
                  {!isLastStep && (
                    <button
                      onClick={handleSkip}
                      className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer rounded-xl hover:bg-gray-100"
                    >
                      Пропустить
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={isTyping}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer active:scale-[0.98] ${
                      isTyping
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 hover:shadow-xl'
                    }`}
                  >
                    {isLastStep ? (
                      <>Поехали! 🚀</>
                    ) : (
                      <>
                        Далее
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-center text-white/60 text-xs mt-3">
          Нажми куда угодно чтобы продолжить
        </p>
      </div>
    </div>
  )
}

// Хук для проверки нужен ли онбординг
export function useCarouselOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    // Проверяем, проходил ли пользователь онбординг
    const completed = localStorage.getItem(ONBOARDING_COMPLETED_KEY)
    if (!completed) {
      // Небольшая задержка чтобы страница успела отрендериться
      const timer = setTimeout(() => {
        setShowOnboarding(true)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const completeOnboarding = () => {
    setShowOnboarding(false)
  }

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_COMPLETED_KEY)
    setShowOnboarding(true)
  }

  return {
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
  }
}
