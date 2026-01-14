import { getTelegramUser } from '@/lib/telegram'
import { motion } from 'framer-motion'

export default function Profile() {
  const telegramUser = getTelegramUser()
  const firstName = telegramUser?.first_name || 'Друг'

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 overflow-hidden">
      {/* Header вывеска - бесшовно сверху */}
      <div className="bg-gradient-to-r from-primary via-accent to-primary pt-safe-area-top">
        <div className="px-6 py-4 pb-6">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI CITI
            </h1>
            <p className="text-white/80 text-xs mt-1">Твой AI-помощник</p>
          </motion.div>
        </div>
        {/* Плавный переход */}
        <div className="h-6 bg-gradient-to-b from-primary/20 to-transparent" />
      </div>

      {/* Декоративные элементы */}
      <div className="absolute top-32 right-0 w-64 h-64 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-3xl translate-x-1/2" />
      <div className="absolute bottom-1/3 left-0 w-48 h-48 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-2xl -translate-x-1/2" />

      <div className="relative px-6 space-y-6">
        {/* Приветствие пользователя */}
        <motion.div
          className="text-center pt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-foreground">
            Привет, <span className="text-primary">{firstName}</span>! 👋
          </h2>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
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
            transition={{ duration: 0.6, delay: 0.7 }}
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

        {/* Персонаж Нейрончик - внизу */}
        <motion.div
          className="flex justify-center pt-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
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
              className="relative w-36 h-auto drop-shadow-xl"
              animate={{
                y: [0, -6, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
