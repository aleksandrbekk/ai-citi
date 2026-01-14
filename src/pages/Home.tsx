import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const modes = [
  { id: 'chat', label: 'Чат с AI', icon: '💬', path: '/chat' },
  { id: 'carousel', label: 'Карусели', icon: '🎠', path: '/agents/carousel' },
  { id: 'poster', label: 'Постеры', icon: '📝', path: '/tools/poster' },
  { id: 'school', label: 'Школа', icon: '📚', path: '/school' },
  { id: 'shop', label: 'Магазин', icon: '🛒', path: '/shop' },
]

export default function Home() {
  const [currentMode, setCurrentMode] = useState(0)

  const handleSwipe = (direction: 'left' | 'right') => {
    if (direction === 'left' && currentMode < modes.length - 1) {
      setCurrentMode(currentMode + 1)
    } else if (direction === 'right' && currentMode > 0) {
      setCurrentMode(currentMode - 1)
    }
  }

  const handleTap = () => {
    window.location.href = modes[currentMode].path
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] to-white text-foreground pb-20 overflow-hidden relative">
      {/* Мерцающие частицы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-primary/20 rounded-full"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${20 + Math.random() * 60}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center justify-center min-h-screen px-6">
        {/* Логотип */}
        <motion.h1
          className="text-3xl font-bold text-foreground tracking-tight mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          AI <span className="text-primary">CITI</span>
        </motion.h1>

        {/* Персонаж на стеклянном подиуме */}
        <motion.div
          className="relative cursor-pointer"
          onClick={handleTap}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) handleSwipe('left')
            else if (info.offset.x > 50) handleSwipe('right')
          }}
        >
          {/* Стеклянный подиум */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-4">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent rounded-full blur-sm" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-full" />
          </div>

          {/* Свечение подиума */}
          <motion.div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-40 h-8 bg-cyan-400/20 rounded-full blur-xl"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Персонаж */}
          <motion.img
            src="/images/neurochik.png"
            alt="Нейрончик"
            className="relative w-52 h-auto drop-shadow-2xl"
            animate={{
              y: [0, -8, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Режим */}
        <motion.div
          className="mt-8 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <button
            onClick={() => handleSwipe('right')}
            disabled={currentMode === 0}
            className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <motion.div
            key={currentMode}
            className="glass-card px-6 py-3 flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span className="text-xl">{modes[currentMode].icon}</span>
            <span className="font-semibold text-foreground">{modes[currentMode].label}</span>
          </motion.div>

          <button
            onClick={() => handleSwipe('left')}
            disabled={currentMode === modes.length - 1}
            className="p-2 text-muted-foreground hover:text-primary disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </motion.div>

        {/* Индикаторы режимов */}
        <div className="mt-4 flex gap-2">
          {modes.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentMode(index)}
              className={`w-2 h-2 rounded-full transition-all ${index === currentMode
                  ? 'bg-primary w-6'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
            />
          ))}
        </div>

        {/* Подсказка */}
        <motion.p
          className="mt-6 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Тапни для {modes[currentMode].label.toLowerCase()}
        </motion.p>
      </div>
    </div>
  )
}
