import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Загружаем переменные окружения
config({ path: resolve(__dirname, '../.env.local') })
config({ path: resolve(__dirname, '../.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY или VITE_SUPABASE_ANON_KEY не найден в переменных окружения')
  console.error('Добавь в .env.local:')
  console.error('VITE_SUPABASE_URL=...')
  console.error('SUPABASE_SERVICE_ROLE_KEY=... (или VITE_SUPABASE_ANON_KEY=...)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Список всех возможных таблиц из кода
const tableNames = [
  'users', 
  'profiles', 
  'allowed_users', 
  'curators', 
  'user_tariffs',
  'course_modules', 
  'course_lessons', 
  'lesson_materials', 
  'homework_submissions',
  'lesson_quizzes', 
  'quiz_options', 
  'lesson_videos',
  'instagram_accounts', 
  'scheduled_posts', 
  'post_media', 
  'publish_logs'
]

async function checkTable(tableName: string) {
  try {
    // Пробуем сделать SELECT с limit 0 - это вернёт структуру без данных
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .limit(0)
    
    if (error) {
      // Если ошибка связана с отсутствием таблицы или RLS
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { exists: false, error: 'Таблица не существует' }
      }
      return { exists: false, error: error.message }
    }
    
    return { exists: true, count: count || 0 }
  } catch (e: any) {
    return { exists: false, error: e.message }
  }
}

async function getTableStructure(tableName: string) {
  try {
    // Пробуем получить одну запись чтобы увидеть структуру
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      return null
    }
    
    if (data && data.length > 0) {
      return Object.keys(data[0])
    }
    
    // Если данных нет, пробуем через пустой запрос
    const { data: emptyData } = await supabase
      .from(tableName)
      .select('*')
      .limit(0)
    
    // Это не сработает, но попробуем другой способ
    return null
  } catch {
    return null
  }
}

async function listAllTables() {
  console.log('🔍 Подключение к Supabase...\n')
  console.log('URL:', supabaseUrl)
  console.log('Key:', supabaseKey.substring(0, 30) + '...\n')
  console.log('=' .repeat(60))
  console.log('📊 ПРОВЕРКА ТАБЛИЦ\n')
  
  const results: Array<{ name: string; exists: boolean; count?: number; error?: string; columns?: string[] }> = []
  
  for (const tableName of tableNames) {
    const result = await checkTable(tableName)
    results.push({ name: tableName, ...result })
    
    if (result.exists) {
      const columns = await getTableStructure(tableName)
      if (columns) {
        results[results.length - 1].columns = columns
      }
    }
  }
  
  // Выводим результаты
  console.log('\n✅ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ:\n')
  results
    .filter(r => r.exists)
    .forEach(r => {
      console.log(`📋 ${r.name}`)
      if (r.count !== undefined) {
        console.log(`   Записей: ${r.count}`)
      }
      if (r.columns && r.columns.length > 0) {
        console.log(`   Колонки: ${r.columns.join(', ')}`)
      }
      console.log()
    })
  
  console.log('\n❌ НЕ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ:\n')
  results
    .filter(r => !r.exists)
    .forEach(r => {
      console.log(`   ${r.name} - ${r.error || 'не найдена'}`)
    })
  
  console.log('\n' + '='.repeat(60))
  console.log(`\nВсего проверено: ${results.length}`)
  console.log(`Существует: ${results.filter(r => r.exists).length}`)
  console.log(`Не существует: ${results.filter(r => !r.exists).length}`)
}

// Запускаем
listAllTables().catch(console.error)

