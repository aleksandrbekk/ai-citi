import { motion } from 'framer-motion'

interface PageLoaderProps {
  text?: string
}

export function PageLoader({ text }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cyan-50/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Логотип с пульсацией */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {/* Внешнее свечение */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-orange-400 rounded-2xl blur-xl opacity-30"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Иконка города */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-cyan-400 via-cyan-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg">
            <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none">
              {/* Здания города */}
              <motion.rect
                x="3" y="10" width="4" height="10" rx="0.5"
                fill="white"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                style={{ transformOrigin: 'bottom' }}
              />
              <motion.rect
                x="8" y="6" width="4" height="14" rx="0.5"
                fill="white"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                style={{ transformOrigin: 'bottom' }}
              />
              <motion.rect
                x="13" y="8" width="4" height="12" rx="0.5"
                fill="white"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                style={{ transformOrigin: 'bottom' }}
              />
              <motion.rect
                x="18" y="12" width="3" height="8" rx="0.5"
                fill="white"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                style={{ transformOrigin: 'bottom' }}
              />
            </svg>
          </div>
        </motion.div>

        {/* Название */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="text-center"
        >
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-orange-500 bg-clip-text text-transparent">
            Нейро Город
          </h1>
          {text && (
            <p className="text-gray-400 text-xs mt-1">{text}</p>
          )}
        </motion.div>

        {/* Прогресс-бар */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-400 to-orange-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
          />
        </motion.div>

        {/* Пульсирующие точки */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-orange-400 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default PageLoader
