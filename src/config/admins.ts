// Централизованный список админов
// Используется везде где нужна проверка на админа

export const ADMIN_IDS = [643763835, 190202791, 1762872372]

// Тестеры — видят профиль и магазин, но не админку
export const TESTER_IDS = [24062910]

export const isAdmin = (telegramId: number | undefined | null): boolean => {
  if (!telegramId) return false
  return ADMIN_IDS.includes(telegramId)
}

// Проверка на расширенное меню (профиль, магазин) — теперь для всех
export const canSeeFullMenu = (_telegramId: number | undefined | null): boolean => {
  // Открыто для всех пользователей
  return true
}
