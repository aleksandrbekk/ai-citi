import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { OnboardingOverlay, useOnboarding } from '@/components/OnboardingOverlay'
import { isAdmin } from '@/config/admins'
import { getTelegramUser } from '@/lib/telegram'

// Персонажи привязаны к разделам
const getCharacters = (_userIsAdmin: boolean) => [
  {
    id: 'designer',
    skin: '/images/skins/skin_2.png',
    name: 'Дизайнер',
    label: 'Создатель карусели',
    path: '/agents/carousel',
    task: 'Создать карусель',
    defaultSpeech: 'Карусель за 2 минуты?\nЛегко! 🎨',
    icon: Sparkles,
    disabled: false,
    comingSoon: false
  },
  {
    id: 'coach',
    skin: '/images/ai-coach-avatar.png',
    name: 'AI-Coach',
    label: 'Твой внутренний компас',
    path: '/agents/karmalogik',
    task: 'Начать сессию',
    defaultSpeech: 'Готов к переменам?\nДавай разберёмся вместе 🧘',
    icon: Sparkles,
    disabled: false,
    comingSoon: false
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
  const navigate = useNavigate()
  const telegramUser = getTelegramUser()
  const userIsAdmin = isAdmin(telegramUser?.id)
  const characters = getCharacters(userIsAdmin)
  const [[currentIndex, direction], setPage] = useState([0, 0]);
  const [greetings, setGreetings] = useState<Record<string, string>>({})
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())

  // Onboarding
  const { showOnboarding, isChecked, completeOnboarding } = useOnboarding()

  // Генерация приветствия для персонажа (всегда новое)
  const generateGreeting = async (characterId: string, forceNew = false) => {
    // Если уже загружается — не дублируем запрос
    if (loadingIds.has(characterId)) return

    // Если есть кешированное и не нужно новое — используем кеш
    if (greetings[characterId] && !forceNew) return

    setLoadingIds(prev => new Set(prev).add(characterId))

    try {
      const { data, error } = await supabase.functions.invoke('character-greeting', {
        body: { characterId }
      })

      if (error) throw error

      setGreetings(prev => ({
        ...prev,
        [characterId]: data.greeting || characters.find(c => c.id === characterId)?.defaultSpeech || 'Привет!'
      }))
    } catch (error) {
      console.error('Failed to generate greeting:', error)
      // Используем дефолтное приветствие
      const character = characters.find(c => c.id === characterId)
      if (character && !greetings[characterId]) {
        setGreetings(prev => ({
          ...prev,
          [characterId]: character.defaultSpeech
        }))
      }
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(characterId)
        return next
      })
    }
  }

  // Генерируем приветствия для ВСЕХ персонажей при загрузке страницы
  useEffect(() => {
    // Генерируем для всех персонажей параллельно
    characters.forEach(char => {
      generateGreeting(char.id, true) // forceNew = true — всегда новое при загрузке
    })
  }, []) // Только при монтировании

  const paginate = (newDirection: number) => {
    let nextIndex = currentIndex + newDirection;
    if (nextIndex < 0) nextIndex = characters.length - 1;
    if (nextIndex >= characters.length) nextIndex = 0;
    setPage([nextIndex, newDirection]);
  };

  const handleCharacterTap = () => {
    // Если персонаж disabled — не переходим
    if (characters[currentIndex].disabled) return
    // Используем React Router для мгновенной SPA-навигации
    navigate(characters[currentIndex].path);
  }

  const IconComponent = characters[currentIndex].icon;
  const currentCharacter = characters[currentIndex]
  const currentGreeting = greetings[currentCharacter.id] || currentCharacter.defaultSpeech

  return (
    <div className="h-screen bg-white text-foreground overflow-hidden relative">

      {/* Onboarding для новых пользователей */}
      {isChecked && showOnboarding && (
        <OnboardingOverlay
          onComplete={completeOnboarding}
          onCreateCarousel={() => navigate('/agents/carousel')}
        />
      )}

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
          className="relative z-30 mb-8 max-w-[85%]"
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Основное окно */}
          <div className="relative px-5 py-4 rounded-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.1)] border border-gray-100/80">
            {/* Бейдж с именем */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-50 to-orange-50 mb-3">
              <motion.div
                className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-xs font-bold text-cyan-700 tracking-wide">
                {characters[currentIndex].name}
              </span>
              {currentCharacter.comingSoon && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold text-orange-600 bg-orange-100 rounded-full">
                  СКОРО
                </span>
              )}
            </div>
            {/* Речь персонажа */}
            <motion.p
              className="text-base text-gray-800 leading-relaxed whitespace-pre-line font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {currentGreeting}
            </motion.p>
          </div>
          {/* Хвостик */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-100/80 rotate-45 shadow-sm" />
        </motion.div>

        {/* Область персонажа со стрелками */}
        <div className="w-full flex items-center justify-center relative z-10">

          {/* Стрелка влево */}
          <button
            onClick={() => paginate(-1)}
            className="absolute left-2 z-20 p-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 text-foreground/40 hover:text-foreground/70 hover:bg-white/50 transition-all cursor-pointer"
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
              className={`relative px-6 py-3 rounded-2xl backdrop-blur-xl transition-all duration-300 group
                ${currentCharacter.disabled
                  ? 'cursor-not-allowed bg-gradient-to-b from-gray-200/40 via-gray-100/30 to-white/50 border border-gray-200/50 shadow-[0_8px_24px_rgba(100,100,100,0.15)]'
                  : 'cursor-pointer bg-gradient-to-b from-cyan-200/40 via-cyan-100/30 to-white/50 border border-cyan-200/50 shadow-[0_8px_32px_rgba(6,182,212,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_12px_40px_rgba(6,182,212,0.3)]'
                }`}
            >
              {/* Бейдж "Скоро" для disabled */}
              {currentCharacter.comingSoon && (
                <div className="absolute -top-2 -right-2 z-20">
                  <motion.div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-400 text-white text-[10px] font-bold shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Lock size={10} />
                    СКОРО
                  </motion.div>
                </div>
              )}

              {/* Блики */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                {!currentCharacter.disabled && (
                  <motion.div
                    className="absolute top-2 right-6 w-1 h-1 bg-white rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>

              {/* Контент */}
              <div className="flex items-center gap-3 relative z-10">
                <div className={`p-2 rounded-xl border ${currentCharacter.disabled
                  ? 'bg-gradient-to-br from-gray-300/30 to-gray-400/20 border-gray-300/30'
                  : 'bg-gradient-to-br from-cyan-400/30 to-cyan-500/20 border-cyan-300/30'
                  }`}>
                  <IconComponent size={20} className={currentCharacter.disabled ? 'text-gray-500' : 'text-cyan-600'} />
                </div>
                <span className={`text-sm font-medium transition-colors ${currentCharacter.disabled
                  ? 'text-gray-500'
                  : 'text-foreground/70 group-hover:text-foreground/90'
                  }`}>
                  {characters[currentIndex].task}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Стрелка вправо */}
          <button
            onClick={() => paginate(1)}
            className="absolute right-2 z-20 p-2 rounded-full bg-white/30 backdrop-blur-sm border border-white/40 text-foreground/40 hover:text-foreground/70 hover:bg-white/50 transition-all cursor-pointer"
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
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${index === currentIndex
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
// redeploy Wed Jan 28 17:15:21 +07 2026
