import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Instagram, CheckCircle, Link2, LogOut, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { getTelegramUser } from '@/lib/telegram'

const INSTAGRAM_APP_ID = '4450547015181166'
const REDIRECT_URI = 'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/instagram-oauth-callback'
const SCOPES = 'instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish,instagram_business_manage_insights'

export default function PosterSettings() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [connectedAccount, setConnectedAccount] = useState<{
    username: string
    instagram_user_id: string
    is_active: boolean
  } | null>(null)

  // Загрузка подключённого аккаунта через edge function (без прямого доступа к токенам)
  const loadAccount = async () => {
    setIsLoading(true)
    try {
      const tgUser = getTelegramUser()
      if (!tgUser?.id) return

      const { data, error } = await supabase.functions.invoke('get-instagram-account', {
        body: { telegram_id: tgUser.id }
      })

      if (error) throw error

      if (data?.account) {
        setConnectedAccount(data.account)
      }
    } catch (err) {
      console.error('Error loading account:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Обработка параметров из OAuth callback
  useEffect(() => {
    const connected = searchParams.get('connected')
    const username = searchParams.get('username')
    const error = searchParams.get('error')

    if (connected === 'true' && username) {
      toast.success(`Instagram @${username} подключён!`)
      setConnectedAccount({
        username,
        instagram_user_id: '',
        is_active: true,
      })
    } else if (error) {
      if (error === 'denied') {
        toast.error('Вы отменили подключение')
      } else {
        toast.error('Ошибка подключения: ' + error)
      }
    }

    loadAccount()
  }, [])

  // Подключение — редирект на Instagram OAuth
  const handleConnect = () => {
    const tgUser = getTelegramUser()
    const state = tgUser?.id ? String(tgUser.id) : ''

    const oauthUrl = `https://www.instagram.com/oauth/authorize?force_reauth=true&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPES)}&state=${state}`

    window.location.href = oauthUrl
  }

  // Отключение аккаунта через edge function
  const handleDisconnect = async () => {
    try {
      const tgUser = getTelegramUser()
      if (!tgUser?.id) return

      const { error } = await supabase.functions.invoke('get-instagram-account', {
        body: { telegram_id: tgUser.id, action: 'disconnect' }
      })

      if (error) throw error

      setConnectedAccount(null)
      toast.success('Аккаунт отключён')
    } catch (err) {
      console.error('Disconnect error:', err)
      toast.error('Ошибка отключения')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8F5] via-white to-white p-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/tools/poster')}
          className="p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Подключить Instagram</h1>
      </div>

      {/* Подключённый аккаунт */}
      {connectedAccount ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 mb-4"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Instagram className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="text-lg font-semibold text-gray-900">@{connectedAccount.username}</h3>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-sm text-green-600 font-medium">Подключён</p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <p className="text-sm text-green-800">
              Посты будут публиковаться в этот аккаунт автоматически
            </p>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium transition-colors cursor-pointer text-sm"
          >
            <LogOut className="w-4 h-4" />
            Отключить аккаунт
          </button>
        </motion.div>
      ) : (
        /* Кнопка подключения */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm p-6 mb-4"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-500/20">
            <Instagram className="w-8 h-8 text-white" />
          </div>

          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">Подключите Instagram</h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Войдите в свой аккаунт для автопубликации постов
          </p>

          <button
            onClick={handleConnect}
            className="w-full px-6 py-3.5 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all cursor-pointer"
          >
            <span className="flex items-center justify-center gap-2">
              <Link2 className="w-5 h-5" />
              Войти через Instagram
            </span>
          </button>
        </motion.div>
      )}

      {/* Как работает */}
      <div className="bg-cyan-50/80 border border-cyan-200/60 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Как это работает</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">1</div>
            <p className="text-sm text-gray-700">Нажмите кнопку и войдите в Instagram</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">2</div>
            <p className="text-sm text-gray-700">Разрешите доступ для публикации постов</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold text-cyan-600 border border-cyan-200">3</div>
            <p className="text-sm text-gray-700">Создавайте посты — они опубликуются автоматически</p>
          </div>
        </div>
      </div>
    </div>
  )
}
