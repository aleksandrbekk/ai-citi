
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
    <div className="h-screen bg-white text-foreground overflow-hidden relative">

      {/* Фон */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[120%] h-[60%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-orange-100/40 via-orange-50/20 to-transparent blur-3xl opacity-80" />
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[150%] h-[50%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-100/30 via-white/50 to-transparent blur-[80px]" />
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white via-white/80 to-transparent" />
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

      <div className="relative flex flex-col items-center px-6 h-full pb-28 justify-end">

        {/* Диалоговое окно - речь персонажа */}
        <motion.div
          key={currentIndex}
          className="relative z-30 mb-6 max-w-[280px]"
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* Основное окно */}
          <div className="relative px-5 py-4 rounded-2xl backdrop-blur-xl bg-white/80 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
            {/* Имя персонажа */}
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="text-sm font-semibold text-cyan-600">
                {characters[currentIndex].name}
              </span>
            </div>
            {/* Речь */}
            <p className="text-base text-foreground/80 font-medium">
              {characters[currentIndex].speech}
            </p>
          </div>
          {/* Хвостик диалогового окна */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/80 border-r border-b border-white/60 rotate-45 shadow-[2px_2px_4px_rgba(0,0,0,0.05)]" />
        </motion.div>

        {/* Область персонажа со стрелками */}
        <div className="w-full flex items-center justify-center relative z-10">

          {/* Стрелка влево */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 z-20 p-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 text-foreground/40 hover:text-foreground/70 hover:bg-white/50 transition-all"
          >
            <ChevronLeft size={24} />
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
                    animate={{ y: [0, -10, 0] }}
                    transition={{
                      duration: 2.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Стеклянный пьедестал */}
            <motion.div
              key={`pedestal-${currentIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              onClick={handleCharacterTap}
              className="relative cursor-pointer px-6 py-3 rounded-2xl
                bg-gradient-to-b from-cyan-200/40 via-cyan-100/30 to-white/50
                backdrop-blur-xl border border-cyan-200/50
                shadow-[0_8px_32px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.6)]
                hover:shadow-[0_12px_40px_rgba(6,182,212,0.3)]
                transition-all duration-300 group"
            >
              {/* Блики */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                <motion.div
                  className="absolute top-2 right-6 w-1 h-1 bg-white rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Контент */}
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-400/30 to-cyan-500/20 border border-cyan-300/30">
                  <IconComponent size={20} className="text-cyan-600" />
                </div>
                <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground/90 transition-colors">
                  {characters[currentIndex].task}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Стрелка вправо */}
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 z-20 p-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 text-foreground/40 hover:text-foreground/70 hover:bg-white/50 transition-all"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Индикаторы-точки */}
        <div className="mt-6 flex gap-3">
          {characters.map((_, index) => (
            <button
              key={index}
              onClick={() => setPage([index, index > currentIndex ? 1 : -1])}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                ? 'bg-orange-500 w-6'
                : 'bg-foreground/20 w-2 hover:bg-foreground/40'
                }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
