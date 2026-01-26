
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, MessageCircle, Sparkles, GraduationCap } from 'lucide-react'

// Персонажи привязаны к разделам
const characters = [
  {
    skin: '/images/skins/skin_1.png',
    name: 'Ассистент',
    label: 'AI Помощник',
    path: '/chat',
    task: 'Задай вопрос AI',
    speech: 'Привет! Чем могу помочь?',
    icon: MessageCircle
  },
  {
    skin: '/images/skins/skin_2.png',
    name: 'Дизайнер',
    label: 'Создатель карусели',
    path: '/agents/carousel',
    task: 'Собери карусель для клиента',
    speech: 'Давай создадим крутую карусель!',
    icon: Sparkles
  },
  {
    skin: '/images/skins/skin_3.png',
    name: 'Учитель',
    label: 'Школа AI',
    path: '/school',
    task: 'Пройди урок и получи XP',
    speech: 'Готов узнать что-то новое?',
    icon: GraduationCap
  },
]

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 300 : -300,
    opacity: 0
  })
};

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

export default function Home() {
  const [[currentIndex, direction], setPage] = useState([0, 0]);

  const paginate = (newDirection: number) => {
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = characters.length - 1;
    if (nextIndex >= characters.length) nextIndex = 0;
    setPage([nextIndex, newDirection]);
  };

  const handleCharacterTap = () => {
    window.location.href = characters[currentIndex].path;
  }

  const IconComponent = characters[currentIndex].icon;

  return (
    <div className="h-screen bg-[#F8FAFC] text-[#1E293B] overflow-hidden relative">

      {/* Фон - более органичный градиент */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#FEE2E2]/30 via-[#FEF2F2]/15 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#E0E7FF]/20 via-white/40 to-transparent blur-[80px]" />
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC]/90 to-transparent" />
      </div>

      {/* Мерцающие частицы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gradient-to-tr from-orange-200 to-cyan-200 rounded-full blur-[0.5px]"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${15 + Math.random() * 70}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.15, 0.6, 0.15],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 1.5,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center px-6 h-full pb-28 justify-end">

        {/* Диалоговое окно - речь персонажа */}
        <motion.div
          key={currentIndex}
          className="relative z-30 mb-6 max-w-[280px]"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Основное окно - AI-Native стиль */}
          <div className="relative px-5 py-3.5 rounded-xl backdrop-blur-xl bg-white/95 border border-gray-100/50 shadow-sm">
            {/* Имя персонажа */}
            <div className="flex items-center gap-2 mb-1.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-[#10B981]"
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-xs font-semibold text-[#6366F1]">
                {characters[currentIndex].name}
              </span>
            </div>
            {/* Речь */}
            <p className="text-sm text-[#1E293B] leading-relaxed">
              {characters[currentIndex].speech}
            </p>
          </div>
          {/* Хвостик диалогового окна - минималистичный */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-r border-b border-gray-100/50 rotate-45" />
        </motion.div>

        {/* Область персонажа со стрелками */}
        <div className="w-full flex items-center justify-center relative z-10">

          {/* Стрелка влево - улучшенный hover */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 z-20 p-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-400 hover:text-[#6366F1] hover:bg-white hover:border-[#6366F1]/30 transition-all duration-200 cursor-pointer shadow-sm"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Персонаж + Пьедестал */}
          <div className="flex flex-col items-center">

            {/* Персонаж с парением - увеличен на 10% (h-72 = 288px) */}
            <div className="h-72 flex items-center justify-center mb-3">
              <AnimatePresence mode='popLayout' custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={slideVariants}
                  initial="center"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="cursor-pointer touch-none"
                  onClick={handleCharacterTap}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(_, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                      paginate(-1);
                    }
                  }}
                >
                  <motion.img
                    src={characters[currentIndex].skin}
                    alt={characters[currentIndex].name}
                    className="h-72 w-72 object-contain pointer-events-none select-none"
                    draggable={false}
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Пьедестал - AI-Native стиль */}
            <motion.div
              key={`pedestal-${currentIndex}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={handleCharacterTap}
              className="relative cursor-pointer px-5 py-2.5 rounded-xl
                bg-white/90 backdrop-blur-sm border border-gray-200/60
                shadow-sm
                hover:shadow-md hover:border-[#6366F1]/30
                transition-all duration-200 group"
            >
              {/* Контент */}
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="p-1.5 rounded-lg bg-[#E0E7FF]/50 border border-[#6366F1]/20">
                  <IconComponent size={18} className="text-[#6366F1]" />
                </div>
                <span className="text-sm font-medium text-[#1E293B]/80 group-hover:text-[#1E293B] transition-colors duration-200">
                  {characters[currentIndex].task}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Стрелка вправо - улучшенный hover */}
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 z-20 p-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200/50 text-gray-400 hover:text-[#6366F1] hover:bg-white hover:border-[#6366F1]/30 transition-all duration-200 cursor-pointer shadow-sm"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Индикаторы-точки - улучшенные */}
        <div className="mt-5 flex gap-2.5">
          {characters.map((_, index) => (
            <button
              key={index}
              onClick={() => setPage([index, index > currentIndex ? 1 : -1])}
              className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${index === currentIndex
                ? 'bg-[#6366F1] w-6'
                : 'bg-gray-300 w-1.5 hover:bg-gray-400'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
