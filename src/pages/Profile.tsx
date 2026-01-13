import { getTelegramUser } from '@/lib/telegram'

export default function Profile() {
  const telegramUser = getTelegramUser()

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-900 pb-24">
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-bold">Профиль</h1>

        {/* Информация о пользователе */}
        {telegramUser && (
          <div className="glass-card/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-2xl">
                {telegramUser.first_name?.[0] || '?'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  {telegramUser.first_name} {telegramUser.last_name || ''}
                </h2>
                {telegramUser.username && (
                  <p className="text-gray-500">@{telegramUser.username}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

