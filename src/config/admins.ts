// Централизованный список админов
// Используется везде где нужна проверка на админа

export const ADMIN_IDS = [643763835, 190202791, 1762872372]

export const isAdmin = (telegramId: number | undefined | null): boolean => {
  if (!telegramId) return false
  return ADMIN_IDS.includes(telegramId)
}
