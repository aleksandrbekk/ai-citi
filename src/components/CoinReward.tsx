import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CoinRewardProps {
    amount: number
    message?: string
    onComplete?: () => void
}

/**
 * Красивая анимация начисления монет
 * Показывает overlay с анимированными монетами и количеством
 */
export function CoinReward({ amount, message, onComplete }: CoinRewardProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [showCoins, setShowCoins] = useState(false)
    const [showAmount, setShowAmount] = useState(false)

    useEffect(() => {
        // Последовательность анимаций
        const timer1 = setTimeout(() => setShowCoins(true), 200)
        const timer2 = setTimeout(() => setShowAmount(true), 600)
        const timer3 = setTimeout(() => {
            setIsVisible(false)
            setTimeout(() => onComplete?.(), 300)
        }, 3000)

        return () => {
            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)
        }
    }, [onComplete])

    // Генерируем позиции для монет
    const coinPositions = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        angle: (i * 30) + Math.random() * 15,
        distance: 60 + Math.random() * 40,
        delay: i * 0.05,
        scale: 0.8 + Math.random() * 0.4,
    }))

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center"
                >
                    {/* Backdrop с blur */}
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Центральный контейнер */}
                    <div className="relative z-10">
                        {/* Glow эффект */}
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: 'radial-gradient(circle, rgba(255,200,50,0.4) 0%, rgba(255,150,0,0.2) 50%, transparent 70%)',
                                width: 300,
                                height: 300,
                                left: -100,
                                top: -100,
                            }}
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.6, 0.8, 0.6],
                            }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />

                        {/* Летящие монетки */}
                        {showCoins && coinPositions.map((coin) => {
                            const x = Math.cos((coin.angle * Math.PI) / 180) * coin.distance
                            const y = Math.sin((coin.angle * Math.PI) / 180) * coin.distance

                            return (
                                <motion.div
                                    key={coin.id}
                                    className="absolute"
                                    style={{
                                        left: '50%',
                                        top: '50%',
                                        marginLeft: -16,
                                        marginTop: -16,
                                    }}
                                    initial={{
                                        x: 0,
                                        y: 0,
                                        scale: 0,
                                        opacity: 0,
                                        rotate: 0,
                                    }}
                                    animate={{
                                        x: [0, x * 1.5, x],
                                        y: [0, y * 1.5 - 30, y],
                                        scale: [0, coin.scale * 1.2, coin.scale],
                                        opacity: [0, 1, 0.8],
                                        rotate: [0, 180, 360],
                                    }}
                                    transition={{
                                        duration: 0.8,
                                        delay: coin.delay,
                                        ease: 'easeOut',
                                    }}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
                                        style={{
                                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                                            boxShadow: '0 2px 8px rgba(255, 165, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                                        }}
                                    >
                                        🧠
                                    </div>
                                </motion.div>
                            )
                        })}

                        {/* Центральное число */}
                        <AnimatePresence>
                            {showAmount && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                                    className="relative flex flex-col items-center"
                                >
                                    {/* Количество */}
                                    <motion.div
                                        className="text-6xl font-bold"
                                        style={{
                                            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            textShadow: '0 0 40px rgba(255, 165, 0, 0.5)',
                                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                                        }}
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 0.5, delay: 0.2 }}
                                    >
                                        +{amount}
                                    </motion.div>

                                    {/* Подпись "Нейронов" */}
                                    <motion.div
                                        className="text-white text-xl font-medium mt-2"
                                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        {amount === 1 ? 'Нейрон' : amount < 5 ? 'Нейрона' : 'Нейронов'}
                                    </motion.div>

                                    {/* Сообщение */}
                                    {message && (
                                        <motion.div
                                            className="text-white/80 text-sm mt-4 text-center max-w-[200px]"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            {message}
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Sparkles */}
                        {showCoins && [...Array(8)].map((_, i) => (
                            <motion.div
                                key={`sparkle-${i}`}
                                className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                }}
                                initial={{
                                    x: 0,
                                    y: 0,
                                    scale: 0,
                                    opacity: 1,
                                }}
                                animate={{
                                    x: (Math.random() - 0.5) * 200,
                                    y: (Math.random() - 0.5) * 200,
                                    scale: [0, 1.5, 0],
                                    opacity: [1, 1, 0],
                                }}
                                transition={{
                                    duration: 1,
                                    delay: 0.3 + i * 0.05,
                                    ease: 'easeOut',
                                }}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

// Глобальное состояние для показа награды
let showCoinRewardCallback: ((amount: number, message?: string) => void) | null = null

export function setCoinRewardCallback(callback: (amount: number, message?: string) => void) {
    showCoinRewardCallback = callback
}

export function triggerCoinReward(amount: number, message?: string) {
    showCoinRewardCallback?.(amount, message)
}

// Provider компонент
export function CoinRewardProvider({ children }: { children: React.ReactNode }) {
    const [reward, setReward] = useState<{ amount: number; message?: string } | null>(null)

    useEffect(() => {
        setCoinRewardCallback((amount, message) => {
            setReward({ amount, message })
        })
        return () => setCoinRewardCallback(() => { })
    }, [])

    return (
        <>
            {children}
            {reward && (
                <CoinReward
                    amount={reward.amount}
                    message={reward.message}
                    onComplete={() => setReward(null)}
                />
            )}
        </>
    )
}

export default CoinReward
