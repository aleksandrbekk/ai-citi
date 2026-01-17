import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Логирование для отладки
console.log('=== SUPABASE CONFIG ===')
console.log('URL:', supabaseUrl || 'MISSING!')
console.log('Key exists:', !!supabaseAnonKey)
console.log('Key prefix:', supabaseAnonKey?.substring(0, 30) || 'MISSING!')

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!')
}

export const supabase = createClient(
  supabaseUrl || 'https://debcwvxlvozjlqkhnauy.supabase.co',
  supabaseAnonKey || ''
)

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
    .single()

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
 * Списать монеты за генерацию
 */
export async function spendCoinsForGeneration(
  telegramId: number,
  amount: number = 1,
  description: string = 'Генерация карусели'
): Promise<SpendCoinsResult> {
  const { data, error } = await supabase
    .rpc('spend_coins', {
      p_telegram_id: telegramId,
      p_amount: amount,
      p_type: 'generation',
      p_description: description,
      p_metadata: {}
    })

  if (error) {
    console.error('Error spending coins:', error)
    return { success: false, error: error.message }
  }

  return data as SpendCoinsResult
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
