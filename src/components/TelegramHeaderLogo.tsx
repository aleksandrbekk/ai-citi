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
        // Резервируем место под кнопки по краям (примерно 80px с каждой стороны)
        paddingLeft: '80px',
        paddingRight: '80px',
      }}
    >
      <div
        className="flex justify-center items-center"
        style={{
          // Ограничиваем ширину, чтобы логотип не расползался
          maxWidth: '200px',
          width: '100%',
        }}
      >
        <Logo
          className={[
            // Маленький и аккуратный размер
            'h-[20px] w-auto',
            // Убираем белый фон на светлом фоне
            'mix-blend-multiply opacity-[0.88]',
            // Мягкое свечение (в стилистике проекта)
            'drop-shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
            'drop-shadow-[0_0_12px_rgba(255,90,31,0.15)]',
            'drop-shadow-[0_0_10px_rgba(6,182,212,0.12)]',
          ].join(' ')}
        />
      </div>
    </div>
  )
}
