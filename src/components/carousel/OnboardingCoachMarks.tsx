import { useState, useEffect } from 'react'
import { X, ChevronRight, Camera, Palette, Users } from 'lucide-react'

// Ключ для localStorage
const ONBOARDING_COMPLETED_KEY = 'carousel_onboarding_completed'

interface OnboardingStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  targetSelector: string
  position: 'top' | 'bottom'
}

const STEPS: OnboardingStep[] = [
  {
    id: 'style',
    title: 'Выбери стиль',
    description: 'Нажми чтобы выбрать дизайн слайдов. Можно менять под настроение!',
    icon: <Palette className="w-5 h-5" />,
    targetSelector: '[data-onboarding="style"]',
    position: 'bottom',
  },
  {
    id: 'gender',
    title: 'Укажи пол',
    description: 'Это обязательно! AI подберёт тон и обращение под тебя.',
    icon: <Users className="w-5 h-5" />,
    targetSelector: '[data-onboarding="gender"]',
    position: 'bottom',
  },
  {
    id: 'photo',
    title: 'Загрузи фото',
    description: 'Твоё фото появится на слайдах. Это необязательно, но выглядит круто!',
    icon: <Camera className="w-5 h-5" />,
    targetSelector: '[data-onboarding="photo"]',
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

  const step = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  // Обновляем позицию целевого элемента
  useEffect(() => {
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
  }, [step.targetSelector])

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    setIsVisible(false)
    localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
    onComplete()
  }

  if (!isVisible || !targetRect) return null

  // Позиционирование тултипа
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 300)),
    ...(step.position === 'bottom'
      ? { top: targetRect.bottom + 12 }
      : { bottom: window.innerHeight - targetRect.top + 12 }),
    zIndex: 1000,
    maxWidth: 'calc(100vw - 32px)',
    width: 280,
  }

  // Позиция spotlight (подсветка элемента)
  const spotlightStyle: React.CSSProperties = {
    position: 'fixed',
    left: targetRect.left - 4,
    top: targetRect.top - 4,
    width: targetRect.width + 8,
    height: targetRect.height + 8,
    borderRadius: 16,
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
    zIndex: 999,
    pointerEvents: 'none',
  }

  return (
    <>
      {/* Overlay spotlight */}
      <div style={spotlightStyle} className="transition-all duration-300 ease-out" />

      {/* Пульсирующее кольцо вокруг элемента */}
      <div
        style={{
          position: 'fixed',
          left: targetRect.left - 8,
          top: targetRect.top - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
          borderRadius: 20,
          zIndex: 1000,
          pointerEvents: 'none',
        }}
        className="border-2 border-orange-400 animate-pulse"
      />

      {/* Tooltip */}
      <div style={tooltipStyle} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg shadow-orange-500/25">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base">{step.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{step.description}</p>
              </div>
              <button
                onClick={handleSkip}
                className="p-1.5 -mt-1 -mr-1 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Пропустить"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {currentStep + 1} из {STEPS.length}
              </span>
              <div className="flex items-center gap-2">
                {!isLastStep && (
                  <button
                    onClick={handleSkip}
                    className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    Пропустить
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-sm font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all cursor-pointer active:scale-[0.98]"
                >
                  {isLastStep ? 'Понятно!' : 'Далее'}
                  {!isLastStep && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Arrow pointing to element */}
        <div
          className="absolute w-3 h-3 bg-white border-l border-t border-gray-100 transform rotate-45"
          style={{
            ...(step.position === 'bottom'
              ? { top: -6, left: Math.min(40, targetRect.width / 2) }
              : { bottom: -6, left: Math.min(40, targetRect.width / 2) }),
          }}
        />
      </div>
    </>
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
      }, 500)
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
