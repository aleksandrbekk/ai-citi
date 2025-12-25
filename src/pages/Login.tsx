import { useEffect } from 'react'

declare global {
  interface Window {
    onTelegramAuth: (user: any) => void
  }
}

export default function Login() {
  useEffect(() => {
    // Callback после авторизации
    window.onTelegramAuth = async (user: any) => {
      // Сохраняем данные в localStorage
      localStorage.setItem('tg_user', JSON.stringify(user))
      // Перезагружаем страницу для проверки доступа
      window.location.reload()
    }

    // Загружаем Telegram Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', 'Neirociti_bot')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '10')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    
    document.getElementById('telegram-login-container')?.appendChild(script)

    return () => {
      const container = document.getElementById('telegram-login-container')
      if (container) container.innerHTML = ''
    }
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">🏙️</div>
        <h1 className="text-3xl font-bold text-white mb-2">AI CITI</h1>
        <p className="text-zinc-400 mb-8">Войдите через Telegram для доступа к платформе</p>
        <div id="telegram-login-container" className="flex justify-center"></div>
      </div>
    </div>
  )
}

