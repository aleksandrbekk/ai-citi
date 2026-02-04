import { createClient } from '@supabase/supabase-js'

// Supabase credentials из переменных окружения
// Локально: .env.local (gitignored)
// Vercel: Environment Variables в настройках проекта
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables!')
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '')

export async function checkWhitelist(telegramId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('allowed_users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single()

  return !!data && !error
}

export async function checkIsCurator(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('curators')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  return !!data && !error
}

export async function getOrCreateUser(telegramUser: {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
}) {
  // Только проверяем есть ли пользователь (НЕ создаём!)
  // Создание пользователей происходит через Edge Function auth-telegram
  // чтобы правильно обрабатывать реферальные ссылки
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .maybeSingle()

  return existingUser || null
}

export async function getUserTariffs(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_tariffs')
    .select('tariff_slug')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error || !data) return []
  return data.map(t => t.tariff_slug)
}

export async function getUserTariffsById(telegramId: number): Promise<string[]> {
  // Получаем user по telegram_id
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) return []

  // Получаем активные тарифы
  const { data: tariffs } = await supabase
    .from('user_tariffs')
    .select('tariff_slug')
    .eq('user_id', user.id)
    .eq('is_active', true)

  return tariffs?.map(t => t.tariff_slug) || []
}

// Проверка активной подписки в premium_clients
export async function checkPremiumSubscription(telegramId: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('premium_clients')
    .select('id, expires_at')
    .eq('telegram_id', telegramId)
    .single()

  if (error || !data) return false

  // Если есть expires_at, проверяем не истекла ли подписка
  if (data.expires_at) {
    return new Date(data.expires_at) > new Date()
  }

  // Если expires_at нет — бессрочная подписка
  return true
}

// Информация о тарифе с датой окончания
export interface UserTariffInfo {
  tariff_slug: string
  expires_at: string | null
  is_active: boolean
}

export async function getUserTariffInfo(telegramId: number): Promise<UserTariffInfo | null> {
  // Получаем тариф из premium_clients по telegram_id
  const { data: client, error } = await supabase
    .from('premium_clients')
    .select('plan, expires_at')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !client) return null

  // Проверяем не истёк ли тариф
  const isActive = !client.expires_at || new Date(client.expires_at) > new Date()

  if (!isActive) return null

  return {
    tariff_slug: client.plan,
    expires_at: client.expires_at,
    is_active: isActive
  }
}

// Отмена подписки
export async function cancelSubscription(telegramId: number): Promise<{ ok: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch(
      'https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/lava-cancel-subscription',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId })
      }
    )
    return await response.json()
  } catch (error) {
    return { ok: false, error: 'Ошибка сети' }
  }
}

// Проверка доступа к модулю
export function canAccessModule(moduleTariff: string, userTariffs: string[]): boolean {
  // platinum даёт доступ ко всему
  if (userTariffs.includes('platinum')) return true
  // standard даёт доступ к standard модулям
  if (userTariffs.includes('standard') && moduleTariff === 'standard') return true
  return false
}

// ===========================================
// USER PHOTOS (для каруселей)
// ===========================================

export interface UserPhoto {
  telegram_id: number
  face_main: string | null
  face_cap: string | null
  cloudinary_folder: string | null
}

/**
 * Получить фото пользователя из базы данных
 */
export async function getUserPhoto(telegramId: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_photos')
    .select('face_main')
    .eq('telegram_id', telegramId)
    .single()

  if (error || !data) {
    return null
  }

  return data.face_main
}

/**
 * Сохранить фото пользователя в базу данных
 */
export async function saveUserPhoto(
  telegramId: number,
  photoUrl: string,
  type: 'face_main' | 'face_cap' = 'face_main'
): Promise<boolean> {
  const { error } = await supabase
    .from('user_photos')
    .upsert({
      telegram_id: telegramId,
      [type]: photoUrl,
      cloudinary_folder: `carousel-users/${telegramId}`,
    }, {
      onConflict: 'telegram_id'
    })

  if (error) {
    console.error('Error saving user photo:', error)
    return false
  }

  return true
}

/**
 * Удалить фото пользователя
 */
export async function deleteUserPhoto(
  telegramId: number,
  type: 'face_main' | 'face_cap' = 'face_main'
): Promise<boolean> {
  const { error } = await supabase
    .from('user_photos')
    .update({
      [type]: null,
    })
    .eq('telegram_id', telegramId)

  if (error) {
    console.error('Error deleting user photo:', error)
    return false
  }

  return true
}

// ===========================================
// USER PHOTO GALLERY (до 3 фото)
// ===========================================

export interface GalleryPhoto {
  id: string
  telegram_id: number
  photo_url: string
  slot_index: number
  created_at: string
}

export async function getUserPhotoGallery(telegramId: number): Promise<GalleryPhoto[]> {
  const { data, error } = await supabase
    .from('user_photo_gallery')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('slot_index', { ascending: true })

  if (error || !data) return []
  return data
}

export async function savePhotoToSlot(
  telegramId: number,
  photoUrl: string,
  slotIndex: number
): Promise<boolean> {
  const { error } = await supabase
    .from('user_photo_gallery')
    .upsert({
      telegram_id: telegramId,
      photo_url: photoUrl,
      slot_index: slotIndex,
    }, {
      onConflict: 'telegram_id,slot_index'
    })

  if (error) {
    console.error('Error saving photo to slot:', error)
    return false
  }
  return true
}

export async function deletePhotoFromSlot(
  telegramId: number,
  slotIndex: number
): Promise<boolean> {
  const { error } = await supabase
    .from('user_photo_gallery')
    .delete()
    .eq('telegram_id', telegramId)
    .eq('slot_index', slotIndex)

  if (error) {
    console.error('Error deleting photo from slot:', error)
    return false
  }
  return true
}

export async function getFirstUserPhoto(telegramId: number): Promise<string> {
  // Сначала проверяем новую таблицу user_photo_gallery
  const { data: galleryPhoto } = await supabase
    .from('user_photo_gallery')
    .select('photo_url')
    .eq('telegram_id', telegramId)
    .order('slot_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (galleryPhoto?.photo_url) {
    return galleryPhoto.photo_url
  }

  // Fallback на старую таблицу user_photos
  const { data } = await supabase
    .from('user_photos')
    .select('face_main')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  return data?.face_main || ''
}

// ===========================================
// CLOUDINARY DELETION
// ===========================================

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co')

export async function deleteFromCloudinary(photoUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-cloudinary-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ photoUrl }),
    })

    const result = await response.json()
    return result.success === true
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error)
    return false
  }
}

// ===========================================
// СИСТЕМА МОНЕТ
// ===========================================

export interface SpendCoinsResult {
  success: boolean
  error?: string
  previous_balance?: number
  spent?: number
  new_balance?: number
  current_balance?: number
  required?: number
}

/**
 * Получить баланс монет пользователя
 */
export async function getCoinBalance(telegramId: number): Promise<number> {
  const { data, error } = await supabase
    .rpc('get_coin_balance', { p_telegram_id: telegramId })

  if (error) {
    console.error('Error getting coin balance:', error)
    return 0
  }

  return data || 0
}

/**
 * Получить статистику трат и заработка пользователя
 */
export async function getUserSpendStats(telegramId: number): Promise<{ total_spent: number; total_earned: number }> {
  const { data, error } = await supabase
    .rpc('get_user_spend_stats', { p_telegram_id: telegramId })

  if (error) {
    console.error('Error getting user spend stats:', error)
    return { total_spent: 0, total_earned: 0 }
  }

  return data || { total_spent: 0, total_earned: 0 }
}

/**
 * Списать монеты за генерацию
 */
export async function spendCoinsForGeneration(
  telegramId: number,
  amount: number = 1,
  description: string = 'Генерация карусели',
  metadata: Record<string, unknown> | null = null
): Promise<SpendCoinsResult> {
  try {
    const { data, error } = await supabase
      .rpc('spend_coins', {
        p_telegram_id: telegramId,
        p_amount: amount,
        p_type: 'generation',
        p_description: description,
        p_metadata: metadata
      })

    if (error) {
      return { success: false, error: error.message }
    }

    // Если data пустой, возвращаем ошибку
    if (!data) {
      return { success: false, error: 'Нет ответа от сервера' }
    }

    return data as SpendCoinsResult
  } catch (err) {
    return { success: false, error: 'Ошибка соединения' }
  }
}

/**
 * Начислить монеты
 */
export async function addCoins(
  telegramId: number,
  amount: number,
  type: 'purchase' | 'subscription' | 'referral' | 'bonus',
  description: string
): Promise<SpendCoinsResult> {
  const { data, error } = await supabase
    .rpc('add_coins', {
      p_telegram_id: telegramId,
      p_amount: amount,
      p_type: type,
      p_description: description,
      p_metadata: {}
    })

  if (error) {
    console.error('Error adding coins:', error)
    return { success: false, error: error.message }
  }

  return data as SpendCoinsResult
}

/**
 * Проверить достаточно ли монет
 */
export async function hasEnoughCoins(telegramId: number, required: number = 1): Promise<boolean> {
  const balance = await getCoinBalance(telegramId)
  return balance >= required
}

/**
 * Обновить время последней активности пользователя
 */
export async function updateLastActive(telegramId: number): Promise<void> {
  try {
    await supabase.rpc('update_last_active', { p_telegram_id: telegramId })
  } catch (err) {
    console.error('Error updating last active:', err)
  }
}

// ===========================================
// СТИЛИ КАРУСЕЛЕЙ (АДМИНКА)
// ===========================================

export interface CarouselStyleDB {
  id: string
  style_id: string
  name: string
  description: string | null
  emoji: string
  audience: 'universal' | 'female' | 'male'
  preview_color: string
  preview_image: string | null
  is_active: boolean
  sort_order: number
  config: Record<string, unknown>
  example_images: string[]
  created_at: string
  updated_at: string
  created_by: number | null
  updated_by: number | null
}

export interface CarouselStyleInput {
  style_id: string
  name: string
  description?: string | null
  emoji?: string
  audience?: 'universal' | 'female' | 'male'
  preview_color?: string
  preview_image?: string | null
  is_active?: boolean
  sort_order?: number
  config: Record<string, unknown>
  example_images?: string[]
  created_by?: number
  updated_by?: number
}

/**
 * Получить все активные стили каруселей
 */
export async function getCarouselStyles(): Promise<CarouselStyleDB[]> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching carousel styles:', error)
    return []
  }

  return data || []
}

/**
 * Получить все стили (включая неактивные) - для админки
 */
export async function getAllCarouselStyles(): Promise<CarouselStyleDB[]> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching all carousel styles:', error)
    return []
  }

  return data || []
}

/**
 * Получить стиль по ID
 */
export async function getCarouselStyleById(id: string): Promise<CarouselStyleDB | null> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching carousel style:', error)
    return null
  }

  return data
}

/**
 * Получить стиль по style_id
 */
export async function getCarouselStyleByStyleId(styleId: string): Promise<CarouselStyleDB | null> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .select('*')
    .eq('style_id', styleId)
    .single()

  if (error) {
    console.error('Error fetching carousel style by style_id:', error)
    return null
  }

  return data
}

/**
 * Создать новый стиль
 */
export async function createCarouselStyle(style: CarouselStyleInput): Promise<CarouselStyleDB | null> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .insert(style)
    .select()
    .single()

  if (error) {
    console.error('Error creating carousel style:', error)
    return null
  }

  return data
}

/**
 * Обновить стиль
 */
export async function updateCarouselStyle(
  id: string,
  updates: Partial<CarouselStyleInput>
): Promise<CarouselStyleDB | null> {
  const { data, error } = await supabase
    .from('carousel_styles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating carousel style:', error)
    return null
  }

  return data
}

/**
 * Удалить стиль (мягкое удаление - деактивация)
 */
export async function deleteCarouselStyle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('carousel_styles')
    .update({ is_active: false })
    .eq('id', id)

  if (error) {
    console.error('Error deleting carousel style:', error)
    return false
  }

  return true
}

/**
 * Жёсткое удаление стиля
 */
export async function hardDeleteCarouselStyle(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('carousel_styles')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error hard deleting carousel style:', error)
    return false
  }

  return true
}

/**
 * Дублировать стиль
 */
export async function duplicateCarouselStyle(
  id: string,
  newStyleId: string,
  newName: string,
  createdBy?: number
): Promise<CarouselStyleDB | null> {
  const original = await getCarouselStyleById(id)
  if (!original) return null

  const duplicate: CarouselStyleInput = {
    style_id: newStyleId,
    name: newName,
    description: original.description,
    emoji: original.emoji,
    audience: original.audience,
    preview_color: original.preview_color,
    preview_image: original.preview_image,
    is_active: false, // Дубликат по умолчанию неактивен
    sort_order: original.sort_order + 1,
    config: original.config,
    example_images: original.example_images,
    created_by: createdBy,
  }

  return createCarouselStyle(duplicate)
}

// ===========================================
// GIFT COINS (Подарочные монеты)
// ===========================================

export interface GiftCoinsBalance {
  coins: number
  gift_coins: number
  total: number
}

export interface RedeemPromoResult {
  success: boolean
  coins_added?: number
  error?: string
}

/**
 * Получить полный баланс (монеты + подарочные)
 */
export async function getFullCoinBalance(telegramId: number): Promise<GiftCoinsBalance> {
  const { data, error } = await supabase
    .from('profiles')
    .select('coins, gift_coins')
    .eq('telegram_id', telegramId)
    .single()

  if (error || !data) {
    return { coins: 0, gift_coins: 0, total: 0 }
  }

  return {
    coins: data.coins || 0,
    gift_coins: data.gift_coins || 0,
    total: (data.coins || 0) + (data.gift_coins || 0)
  }
}

/**
 * Получить только баланс подарочных монет
 */
export async function getGiftCoinBalance(telegramId: number): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('gift_coins')
    .eq('telegram_id', telegramId)
    .single()

  if (error || !data) {
    return 0
  }

  return data.gift_coins || 0
}

/**
 * Активировать промокод
 */
export async function redeemPromoCode(
  telegramId: number,
  code: string
): Promise<RedeemPromoResult> {
  try {
    const { data, error } = await supabase
      .rpc('redeem_promo_code', {
        p_telegram_id: telegramId,
        p_code: code.toUpperCase().trim()
      })

    if (error) {
      // Парсим ошибки от функции
      if (error.message.includes('не найден') || error.message.includes('not found')) {
        return { success: false, error: 'Промокод не найден' }
      }
      if (error.message.includes('истёк') || error.message.includes('expired')) {
        return { success: false, error: 'Промокод истёк' }
      }
      if (error.message.includes('уже использовали') || error.message.includes('already used')) {
        return { success: false, error: 'Вы уже использовали этот промокод' }
      }
      if (error.message.includes('лимит') || error.message.includes('limit')) {
        return { success: false, error: 'Лимит использования промокода исчерпан' }
      }
      return { success: false, error: error.message }
    }

    return {
      success: true,
      coins_added: data?.coins_added || 0
    }
  } catch (err) {
    return { success: false, error: 'Ошибка соединения' }
  }
}

/**
 * Списать монеты (сначала подарочные, потом обычные)
 * Использует функцию spend_coins_smart из базы данных
 */
export async function spendCoinsSmart(
  telegramId: number,
  amount: number,
  description: string = 'Генерация карусели'
): Promise<SpendCoinsResult> {
  try {
    const { data, error } = await supabase
      .rpc('spend_coins_smart', {
        p_telegram_id: telegramId,
        p_amount: amount,
        p_description: description
      })

    if (error) {
      if (error.message.includes('Недостаточно') || error.message.includes('insufficient')) {
        return { success: false, error: 'Недостаточно монет' }
      }
      return { success: false, error: error.message }
    }

    return data as SpendCoinsResult
  } catch (err) {
    return { success: false, error: 'Ошибка соединения' }
  }
}

// ===========================================
// ИСТОРИЯ ТРАНЗАКЦИЙ
// ===========================================

export interface CoinTransaction {
  id: string
  amount: number
  balance_after: number
  type: 'generation' | 'purchase' | 'subscription' | 'referral' | 'bonus' | 'promo' | 'gift'
  description: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface TransactionStats {
  total_earned: number
  total_spent: number
  total_transactions: number
  generations_count: number
}

/**
 * Получить историю транзакций пользователя
 */
export async function getCoinTransactions(
  telegramId: number,
  limit: number = 50,
  offset: number = 0
): Promise<CoinTransaction[]> {
  // Сначала получаем user_id по telegram_id
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('telegram_id', telegramId)
    .single()

  if (!user) return []

  const { data, error } = await supabase
    .from('coin_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching transactions:', error)
    return []
  }

  return data || []
}

/**
 * Получить статистику транзакций
 */
// ===========================================
// ПОДПИСКИ
// ===========================================

export interface UserSubscription {
  id: string
  plan: 'starter' | 'pro' | 'business'
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  started_at: string
  expires_at: string
  next_charge_at: string | null
  amount_rub: number
  neurons_per_month: number
  lava_contract_id: string | null
}

/**
 * Проверить есть ли активная подписка
 */
export async function hasActiveSubscription(telegramId: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_active_subscription', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error checking subscription:', error)
    return false
  }

  return data === true
}

/**
 * Получить информацию об активной подписке
 */
export async function getActiveSubscription(telegramId: number): Promise<UserSubscription | null> {
  const { data, error } = await supabase.rpc('get_active_subscription', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error getting subscription:', error)
    return null
  }

  // rpc возвращает массив, берём первый элемент
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null
  }

  return Array.isArray(data) ? data[0] : data
}

/**
 * Получить все подписки пользователя (история)
 */
export async function getUserSubscriptions(telegramId: number): Promise<UserSubscription[]> {
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error getting user subscriptions:', error)
    return []
  }

  return data || []
}

export async function getTransactionStats(telegramId: number): Promise<TransactionStats> {
  const { data, error } = await supabase.rpc('get_user_transaction_stats', {
    p_telegram_id: telegramId
  })

  if (error) {
    console.error('Error fetching transaction stats:', error)
    return {
      total_earned: 0,
      total_spent: 0,
      total_transactions: 0,
      generations_count: 0
    }
  }

  return (data as TransactionStats) || {
    total_earned: 0,
    total_spent: 0,
    total_transactions: 0,
    generations_count: 0
  }
}
