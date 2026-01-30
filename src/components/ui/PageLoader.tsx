import { motion } from 'framer-motion'

interface PageLoaderProps {
  text?: string
}

export function PageLoader({ text }: PageLoaderProps) {
  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Фоновая картинка */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/main.jpg)' }}
      />

      {/* Затемнение снизу для читаемости loading bar */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent pointer-events-none" />

      {/* Логотип сверху */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 pt-12 flex justify-center"
      >
        <img
          src="/images/logo.png"
          alt="AI CITY"
          className="h-12 object-contain drop-shadow-lg"
        />
      </motion.div>

      {/* Spacer для центрирования контента */}
      <div className="flex-1" />

      {/* Нижняя часть с загрузкой */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative z-10 pb-16 px-8 flex flex-col items-center gap-4"
      >
        {/* Текст загрузки */}
        {text && (
          <p className="text-gray-600 text-sm font-medium">{text}</p>
        )}

        {/* Креативная полоса загрузки */}
        <div className="w-64 relative">
          {/* Фоновая полоса */}
          <div className="h-2 bg-gray-200/50 backdrop-blur-sm rounded-full overflow-hidden shadow-inner">
            {/* Анимированный градиент */}
            <motion.div
              className="h-full rounded-full relative overflow-hidden"
              style={{
                background: 'linear-gradient(90deg, #00CED1, #20B2AA, #FF7F50, #FFA07A, #00CED1)',
                backgroundSize: '200% 100%',
              }}
              initial={{ width: '0%' }}
              animate={{
                width: '100%',
                backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
              }}
              transition={{
                width: { duration: 2, ease: "easeInOut", repeat: Infinity },
                backgroundPosition: { duration: 3, ease: "linear", repeat: Infinity }
              }}
            >
              {/* Блик на полосе */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>
          </div>

          {/* Светящиеся точки под полосой */}
          <div className="flex justify-center gap-2 mt-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${i % 2 === 0 ? '#00CED1' : '#FF7F50'}, ${i % 2 === 0 ? '#20B2AA' : '#FFA07A'})`
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
            ))}
          </div>
        </div>

        {/* Подпись */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-gray-400 text-xs mt-2"
        >
          Входим в город...
        </motion.p>
      </motion.div>
    </div>
  )
}

export default PageLoader
