import { getTelegramUser } from '@/lib/telegram'
import { motion } from 'framer-motion'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white pb-24 overflow-hidden">
      {/* Фоновые частицы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative p-6 space-y-8">
        {/* Приветствие */}
        <motion.div 
          className="text-center pt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-cyan-400 text-sm font-medium mb-1">Добро пожаловать в</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-white to-orange-400 bg-clip-text text-transparent">
            AI CITI
          </h1>
        </motion.div>

        {/* Персонаж Нейрончик */}
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <div className="relative">
            {/* Свечение за персонажем */}
            <motion.div
              className="absolute inset-0 bg-cyan-400/20 blur-3xl rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Персонаж с анимацией покачивания */}
            <motion.img
              src="/images/neurochik.png"
              alt="Нейрончик"
              className="relative w-48 h-auto drop-shadow-2xl"
              animate={{
                y: [0, -10, 0],
                rotate: [-2, 2, -2],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Пульсирующие кружки вокруг */}
            <motion.div
              className="absolute -top-4 -right-4 w-8 h-8 border-2 border-cyan-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute -bottom-2 -left-4 w-6 h-6 border-2 border-orange-400 rounded-full"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: 0.5,
              }}
            />
          </div>
        </motion.div>

        {/* Приветствие пользователя */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <h2 className="text-xl font-semibold">
            Привет, <span className="text-cyan-400">{firstName}</span>! 👋
          </h2>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            Я Нейрончик — твой AI-помощник. Готов создавать контент вместе с тобой!
          </p>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <p className="text-xs text-gray-500 uppercase tracking-wider text-center">Что будем делать?</p>
          
          <div className="grid grid-cols-2 gap-3">
            <motion.a
              href="/agents"
              className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 rounded-2xl p-4 text-center hover:border-cyan-400/50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-2xl mb-2">🤖</div>
              <p className="font-medium text-sm">AI Агенты</p>
              <p className="text-xs text-gray-500 mt-1">Создать контент</p>
            </motion.a>

            <motion.a
              href="/shop"
              className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-4 text-center hover:border-orange-400/50 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-2xl mb-2">🛒</div>
              <p className="font-medium text-sm">Магазин</p>
              <p className="text-xs text-gray-500 mt-1">Тарифы и бонусы</p>
            </motion.a>
          </div>
        </motion.div>

        {/* Карточка пользователя */}
        {telegramUser && (
          <motion.div
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-400 to-orange-400 flex items-center justify-center text-xl font-bold text-white">
                {telegramUser.first_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </h3>
                {telegramUser.username && (
                  <p className="text-gray-400 text-sm">@{telegramUser.username}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Статус</p>
                <p className="text-cyan-400 text-sm font-medium">Активен</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
