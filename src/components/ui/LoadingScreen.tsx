import { motion } from 'framer-motion'

/**
 * Красивый анимированный экран загрузки
 * Используется при первоначальной загрузке приложения и lazy-loaded страниц
 */
export function LoadingScreen() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-cyan-50/30 flex flex-col items-center justify-center overflow-hidden relative">
            {/* Фоновые частицы */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(12)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-gradient-to-tr from-orange-300/60 to-cyan-300/60 rounded-full blur-[1px]"
                        style={{
                            left: `${15 + Math.random() * 70}%`,
                            top: `${20 + Math.random() * 60}%`,
                        }}
                        animate={{
                            y: [0, -30, 0],
                            opacity: [0.3, 0.8, 0.3],
                            scale: [0.6, 1.2, 0.6],
                        }}
                        transition={{
                            duration: 2.5 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 1.5,
                            ease: "easeInOut"
                        }}
                    />
                ))}
            </div>

            {/* Основной контент */}
            <motion.div
                className="relative z-10 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Логотип/Иконка */}
                <motion.div
                    className="relative mb-8"
                    animate={{
                        scale: [1, 1.05, 1],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    {/* Светящийся круг */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-orange-400/40 to-cyan-400/40 rounded-full blur-xl"
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Основной круг */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-orange-400 via-orange-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <motion.span
                            className="text-3xl font-bold text-white"
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            AI
                        </motion.span>
                    </div>
                </motion.div>

                {/* Название */}
                <motion.h1
                    className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                >
                    AI CITI
                </motion.h1>

                {/* Прогресс-бар */}
                <div className="w-48 h-1.5 bg-gray-200/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <motion.div
                        className="h-full bg-gradient-to-r from-orange-400 to-cyan-400 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{
                            duration: 1.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </div>

                {/* Текст загрузки */}
                <motion.p
                    className="mt-4 text-sm text-gray-500"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    Загружаем магию...
                </motion.p>
            </motion.div>

            {/* Декоративные круги */}
            <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
                <motion.div
                    className="absolute bottom-4 left-1/4 w-24 h-24 bg-orange-200/30 rounded-full blur-2xl"
                    animate={{ scale: [1, 1.2, 1], x: [0, 10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.div
                    className="absolute bottom-8 right-1/4 w-32 h-32 bg-cyan-200/30 rounded-full blur-2xl"
                    animate={{ scale: [1, 1.3, 1], x: [0, -10, 0] }}
                    transition={{ duration: 5, repeat: Infinity }}
                />
            </div>
        </div>
    )
}

/**
 * Компактный лоадер для Suspense fallback на страницах
 */
export function PageLoader() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <motion.div
                className="flex flex-col items-center gap-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Спиннер */}
                <motion.div
                    className="w-10 h-10 border-3 border-orange-200 border-t-orange-500 rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span className="text-sm text-gray-400">Загрузка...</span>
            </motion.div>
        </div>
    )
}

export default LoadingScreen
