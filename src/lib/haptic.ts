/**
 * Haptic Feedback для Telegram Mini App
 * Обёртка над WebApp.HapticFeedback
 */

type ImpactStyle = 'light' | 'medium' | 'heavy'
type NotificationType = 'error' | 'success' | 'warning'

/**
 * Вызвать вибрацию при касании
 */
export function impactOccurred(style: ImpactStyle = 'medium') {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred(style)
    }
  } catch (e) {
    // Игнорируем ошибки - haptic не критичен
  }
}

/**
 * Вибрация для уведомления
 */
export function notificationOccurred(type: NotificationType = 'success') {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.HapticFeedback?.notificationOccurred) {
      tg.HapticFeedback.notificationOccurred(type)
    }
  } catch (e) {
    // Игнорируем ошибки
  }
}

/**
 * Вибрация при выборе (например, переключение)
 */
export function selectionChanged() {
  try {
    const hapticFeedback = window.Telegram?.WebApp?.HapticFeedback as any
    // selectionChanged может не быть в типах, но есть в API
    if (hapticFeedback?.selectionChanged) {
      hapticFeedback.selectionChanged()
    }
  } catch (e) {
    // Игнорируем ошибки
  }
}

// Удобные шорткаты для частых действий
export const haptic = {
  /** Нажатие на кнопку */
  tap: () => impactOccurred('light'),

  /** Важное действие (покупка, генерация) */
  action: () => impactOccurred('medium'),

  /** Успех */
  success: () => notificationOccurred('success'),

  /** Ошибка */
  error: () => notificationOccurred('error'),

  /** Предупреждение */
  warning: () => notificationOccurred('warning'),

  /** Выбор (переключатели, табы) */
  select: () => selectionChanged(),
}

export default haptic
