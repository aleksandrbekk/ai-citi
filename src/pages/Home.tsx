import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const modes = [
  { id: 'chat', label: 'Чат с AI', icon: '💬', path: '/chat' },
  { id: 'carousel', label: 'Карусели', icon: '🎠', path: '/agents/carousel' },
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
    <div className="min-h-screen bg-[#FFF8F5] text-foreground pb-20 overflow-hidden relative">

      {/* Сложный премиум фон как на референсе */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Верхний теплый свет (солнечное свечение) */}
        <div className="absolute -top-[20%] -left-[10%] w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-100/40 via-orange-50/20 to-transparent blur-3xl opacity-80" />

        {/* Мягкий циановый свет за персонажем (Aurora effect) */}
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-100/30 via-white/50 to-transparent blur-[80px]" />

        {/* Нижний белый градиент для чистоты */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white via-white/80 to-transparent" />
      </div>

      {/* Мерцающие частицы (немного усилим для магии) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-tr from-orange-200 to-cyan-200 rounded-full blur-[0.5px]"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${15 + Math.random() * 70}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [0.8, 1.4, 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center px-6 h-[calc(100vh-140px)] justify-between">
        {/* Логотип */}
        <motion.h1
          className="text-3xl font-bold text-foreground tracking-tight mt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          AI <span className="text-primary">CITI</span>
        </motion.h1>

        {/* Контейнер для низа: Робот + Кнопки */}
        <div className="flex flex-col items-center w-full pb-4">

          {/* Статусная плашка над роботом (Vision Glass стиль) */}
          <motion.div
            className="mb-6 px-6 py-3 rounded-full backdrop-blur-xl bg-white/70 border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.08)] flex items-center gap-3"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Зеленая точка статуса (пульсирующая) */}
            <motion.div
              className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <span className="text-lg font-medium text-foreground/80 tracking-wide">Ассистент</span>
          </motion.div>

          {/* Персонаж (на земле, без подиума) */}
          <motion.div
            className="relative cursor-pointer z-10"
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
            {/* Тень под персонажем (касание земли) */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black/10 blur-xl rounded-[100%]" />

            {/* Мягкое свечение за персонажем */}
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/20 blur-[60px] rounded-full pointer-events-none"
              animate={{
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Персонаж */}
            <motion.img
              src="/images/neurochik.png"
              alt="Нейрончик"
              className="relative w-64 h-auto drop-shadow-2xl"
              animate={{
                y: [0, -4, 0], // Меньшая амплитуда, "дыхание" а не полет
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {/* Режим - Glass Pill с циановым свечением */}
          <motion.div
            className="mt-6 flex items-center justify-between gap-4 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <button
              onClick={() => handleSwipe('right')}
              disabled={currentMode === 0}
              className="p-3 text-muted-foreground/60 hover:text-primary disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>

            <motion.button
              key={currentMode}
              onClick={handleTap}
              className="relative group px-8 py-4 flex items-center gap-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_32px_rgba(6,182,212,0.15)] transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Внутреннее свечение */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <span className="text-2xl relative z-10 drop-shadow-sm">{modes[currentMode].icon}</span>
              <span className="font-bold text-foreground relative z-10 text-lg tracking-tight">{modes[currentMode].label}</span>
            </motion.button>

            <button
              onClick={() => handleSwipe('left')}
              disabled={currentMode === modes.length - 1}
              className="p-3 text-muted-foreground/60 hover:text-primary disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={20} />
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
    </div>
  )
}
