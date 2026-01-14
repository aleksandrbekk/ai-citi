import { getTelegramUser } from '@/lib/telegram'
import { motion } from 'framer-motion'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 overflow-hidden">
      {/* Декоративные элементы */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-1/3 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-2xl -translate-x-1/2" />

      <div className="relative p-6 space-y-8">
        {/* Приветствие */}
        <motion.div
          className="text-center pt-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-primary text-sm font-medium mb-1">Добро пожаловать в</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
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
            {/* Мягкое свечение */}
            <motion.div
              className="absolute inset-0 bg-primary/10 blur-3xl rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2],
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
              className="relative w-44 h-auto drop-shadow-xl"
              animate={{
                y: [0, -8, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Декоративные кружки */}
            <motion.div
              className="absolute -top-2 -right-2 w-6 h-6 border-2 border-primary/50 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 0, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
            <motion.div
              className="absolute -bottom-1 -left-2 w-4 h-4 bg-accent/30 rounded-full"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.5, 0, 0.5],
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
          <h2 className="text-xl font-semibold text-foreground">
            Привет, <span className="text-primary">{firstName}</span>! 👋
          </h2>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
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
          <p className="text-xs text-muted-foreground uppercase tracking-wider text-center">Что будем делать?</p>

          <div className="grid grid-cols-2 gap-3">
            <motion.a
              href="/agents"
              className="glass-card p-4 text-center hover:shadow-lg transition-all"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <p className="font-semibold text-sm text-foreground">AI Агенты</p>
              <p className="text-xs text-muted-foreground mt-1">Создать контент</p>
            </motion.a>

            <motion.a
              href="/shop"
              className="glass-card p-4 text-center hover:shadow-lg transition-all"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-accent/10 to-primary/5 flex items-center justify-center">
                <span className="text-2xl">🛒</span>
              </div>
              <p className="font-semibold text-sm text-foreground">Магазин</p>
              <p className="text-xs text-muted-foreground mt-1">Тарифы и бонусы</p>
            </motion.a>
          </div>
        </motion.div>

        {/* Карточка пользователя */}
        {telegramUser && (
          <motion.div
            className="glass-card-strong p-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xl font-bold text-white shadow-lg">
                {telegramUser.first_name?.[0] || '?'}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </h3>
                {telegramUser.username && (
                  <p className="text-muted-foreground text-sm">@{telegramUser.username}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Статус</p>
                <p className="text-primary text-sm font-medium">Активен</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
