import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X, Sparkles } from 'lucide-react'

interface OnboardingStep {
    id: string
    emoji: string
    title: string
    text: string
    highlight?: boolean
}

const ONBOARDING_STEPS: OnboardingStep[] = [
    {
        id: 'welcome',
        emoji: '👋',
        title: 'Добро пожаловать!',
        text: 'Я — твой Дизайнер. Здесь, в Нейро Городе, каждый робот умеет что-то крутое.',
    },
    {
        id: 'carousel',
        emoji: '🎨',
        title: 'Карусели — моя суперсила',
        text: 'Скажи тему, выбери стиль — получи готовые слайды за 2 минуты. Без промптов и инструкций.',
    },
    {
        id: 'neurons',
        emoji: '💎',
        title: '100 Нейронов на старте',
        text: 'Этого хватит на 3 карусели. Приглашай друзей — получай ещё больше!',
    },
    {
        id: 'cta',
        emoji: '🚀',
        title: 'Готов попробовать?',
        text: 'Создай первую карусель прямо сейчас. Это займёт всего пару минут!',
        highlight: true,
    },
]

const STORAGE_KEY = 'onboarding_v1_completed'

// Typewriter hook
function useTypewriter(text: string, speed = 30, enabled = true) {
    const [displayText, setDisplayText] = useState('')
    const [isComplete, setIsComplete] = useState(false)

    useEffect(() => {
        if (!enabled) {
            setDisplayText(text)
            setIsComplete(true)
            return
        }

        setDisplayText('')
        setIsComplete(false)
        let index = 0

        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayText(text.slice(0, index + 1))
                index++
            } else {
                setIsComplete(true)
                clearInterval(interval)
            }
        }, speed)

        return () => clearInterval(interval)
    }, [text, speed, enabled])

    const complete = useCallback(() => {
        setDisplayText(text)
        setIsComplete(true)
    }, [text])

    return { displayText, isComplete, complete }
}

interface OnboardingOverlayProps {
    onComplete: () => void
    onCreateCarousel: () => void
}

export function OnboardingOverlay({ onComplete, onCreateCarousel }: OnboardingOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0)
    const [isVisible, setIsVisible] = useState(true)

    const step = ONBOARDING_STEPS[currentStep]
    const isLastStep = currentStep === ONBOARDING_STEPS.length - 1

    const { displayText, isComplete, complete } = useTypewriter(step.text, 25, true)

    const handleNext = () => {
        if (!isComplete) {
            complete()
            return
        }

        if (isLastStep) {
            handleClose()
        } else {
            setCurrentStep(prev => prev + 1)
        }
    }

    const handleSkip = () => {
        handleClose()
    }

    const handleClose = () => {
        setIsVisible(false)
        localStorage.setItem(STORAGE_KEY, 'true')
        setTimeout(() => onComplete(), 300)
    }

    const handleCreateCarousel = () => {
        handleClose()
        setTimeout(() => onCreateCarousel(), 300)
    }

    if (!isVisible) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-end justify-center"
            >
                {/* Backdrop */}
                <motion.div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={handleSkip}
                />

                {/* Robot spotlight area */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="relative"
                    >
                        {/* Glow effect behind robot */}
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-orange-400/30 blur-3xl scale-150" />

                        {/* Robot image */}
                        <motion.img
                            src="/images/skins/skin_2.png"
                            alt="Дизайнер"
                            className="w-48 h-48 object-contain relative z-10 drop-shadow-2xl"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </motion.div>
                </div>

                {/* Dialog card */}
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="relative z-10 w-full max-w-md mx-4 mb-8"
                >
                    {/* Skip button */}
                    <button
                        onClick={handleSkip}
                        className="absolute -top-12 right-0 p-2 text-white/60 hover:text-white/90 transition-colors"
                    >
                        <X size={24} />
                    </button>

                    {/* Card */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                        {/* Progress bar */}
                        <div className="h-1 bg-gray-100">
                            <motion.div
                                className="h-full bg-gradient-to-r from-cyan-400 to-orange-400"
                                initial={{ width: '0%' }}
                                animate={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            {/* Step indicator */}
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-2xl">{step.emoji}</span>
                                <span className="text-sm text-gray-400 font-medium">
                                    {currentStep + 1} из {ONBOARDING_STEPS.length}
                                </span>
                            </div>

                            {/* Title */}
                            <motion.h2
                                key={`title-${step.id}`}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-xl font-bold text-gray-900 mb-3"
                            >
                                {step.title}
                            </motion.h2>

                            {/* Typewriter text */}
                            <motion.p
                                key={`text-${step.id}`}
                                className="text-gray-600 leading-relaxed min-h-[60px]"
                            >
                                {displayText}
                                {!isComplete && (
                                    <motion.span
                                        animate={{ opacity: [1, 0] }}
                                        transition={{ duration: 0.5, repeat: Infinity }}
                                        className="inline-block w-0.5 h-5 bg-cyan-500 ml-0.5 align-middle"
                                    />
                                )}
                            </motion.p>

                            {/* Actions */}
                            <div className="mt-6 flex gap-3">
                                {isLastStep && step.highlight ? (
                                    <>
                                        <button
                                            onClick={handleClose}
                                            className="flex-1 py-3 px-4 text-gray-500 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Сначала осмотрюсь
                                        </button>
                                        <motion.button
                                            onClick={handleCreateCarousel}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
                                            whileTap={{ scale: 0.98 }}
                                            animate={isComplete ? { scale: [1, 1.02, 1] } : {}}
                                            transition={{ duration: 0.5, repeat: isComplete ? Infinity : 0, repeatDelay: 1 }}
                                        >
                                            <Sparkles size={18} />
                                            Создать карусель
                                        </motion.button>
                                    </>
                                ) : (
                                    <motion.button
                                        onClick={handleNext}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {isComplete ? (
                                            <>
                                                Далее
                                                <ChevronRight size={18} />
                                            </>
                                        ) : (
                                            'Показать всё'
                                        )}
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Dots indicator */}
                    <div className="flex justify-center gap-2 mt-4">
                        {ONBOARDING_STEPS.map((_, index) => (
                            <motion.div
                                key={index}
                                className={`h-1.5 rounded-full transition-all duration-300 ${index === currentStep
                                        ? 'w-6 bg-white'
                                        : index < currentStep
                                            ? 'w-1.5 bg-white/60'
                                            : 'w-1.5 bg-white/30'
                                    }`}
                            />
                        ))}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

// Hook for checking if onboarding is needed
export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [isChecked, setIsChecked] = useState(false)

    useEffect(() => {
        const completed = localStorage.getItem(STORAGE_KEY)
        setShowOnboarding(!completed)
        setIsChecked(true)
    }, [])

    const completeOnboarding = useCallback(() => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setShowOnboarding(false)
    }, [])

    const resetOnboarding = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY)
        setShowOnboarding(true)
    }, [])

    return { showOnboarding, isChecked, completeOnboarding, resetOnboarding }
}

export default OnboardingOverlay
