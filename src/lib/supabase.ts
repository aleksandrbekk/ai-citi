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
  // Сначала проверим есть ли пользователь
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramUser.id)
    .single()
  
  if (existingUser) {
    return existingUser
  }
  
  // Создаём нового пользователя
  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramUser.id,
      first_name: telegramUser.first_name || 'Пользователь',
      last_name: telegramUser.last_name || null,
      username: telegramUser.username || null,
      avatar_url: telegramUser.photo_url || null
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating user:', error)
    return null
  }
  
  return newUser
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

// Проверка доступа к модулю
export function canAccessModule(moduleTariff: string, userTariffs: string[]): boolean {
  // platinum даёт доступ ко всему
  if (userTariffs.includes('platinum')) return true
  // standard даёт доступ к standard модулям
  if (userTariffs.includes('standard') && moduleTariff === 'standard') return true
  return false
}
