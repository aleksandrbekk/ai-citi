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
