import { Logo } from '@/components/ui/Logo'
import { isMobileTelegram } from '@/lib/telegram'

/**
 * Логотип в Telegram header между кнопками "Закрыть" и "..."
 * 
 * ВАЖНО:
 * - Это НЕ контент под кнопками, а элемент В ТОЙ ЖЕ ЗОНЕ header
 * - Размещается строго МЕЖДУ кнопками, не перекрывая их
 * - Только в fullscreen режиме на мобильных (iOS/Android)
 */
export function TelegramHeaderLogo() {
  const tg = window.Telegram?.WebApp
  const isTMA = !!(tg?.initData && tg.initData.length > 0)
  const isMobile = isMobileTelegram()
  
  // Показываем только в Telegram fullscreen на мобильных
  if (!isTMA || !isMobile) {
    return null
  }

  return (
    <div
      className="fixed left-0 right-0 z-[70] pointer-events-none flex justify-center"
      style={{
        // На уровне кнопок Telegram (чуть ниже системной строки)
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        // Резервируем место под кнопки по краям
        paddingLeft: '60px',
        paddingRight: '60px',
      }}
    >
      <div className="flex justify-center items-center">
        <Logo
          height="24px"
          width="auto"
          className={[
            // Нормальный размер для видимости
            'max-w-[200px]',
            // Убираем mix-blend-multiply, чтобы логотип был виден
            // Оставляем только базовый mix-blend-multiply из компонента Logo
          ].join(' ')}
        />
      </div>
    </div>
  )
}
