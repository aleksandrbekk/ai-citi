import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config({ path: join(process.cwd(), '.env.local') })

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface Material {
  type: 'pdf' | 'sheet' | 'link' | 'file'
  title: string
  url: string
}

interface Lesson {
  title: string
  order_index: number
  url?: string
  video_url?: string
  video_id?: string
  description?: string
  materials: Material[]
  has_homework: boolean
  homework_description?: string
}

interface Module {
  title: string
  order_index: number
  lessons: Lesson[]
}

interface ParsedData {
  parsed_at: string
  total_modules: number
  total_lessons: number
  modules: Module[]
}

// Подключение к Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://debcwvxlvozjlqkhnauy.supabase.co'
// Используем SERVICE_ROLE_KEY для записи данных (обходит RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY или VITE_SUPABASE_ANON_KEY не найден в .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Очистка текста от лишних символов
function cleanText(text: string | undefined | null): string | null {
  if (!text) return null
  // Удаляем лишние пробелы и переносы строк
  return text.trim().replace(/\s+/g, ' ').substring(0, 10000) || null
}

async function uploadToSupabase() {
  console.log('🚀 Загрузка данных курса МЛМ ЛАГЕРЬ в Supabase...\n')

  // Читаем JSON
  const data: ParsedData = JSON.parse(
    readFileSync(join(__dirname, 'mlm-camp-full.json'), 'utf-8')
  )

  console.log(`📚 Загружено: ${data.total_modules} модулей, ${data.total_lessons} уроков\n`)

  const moduleIds: Record<string, string> = {}

  try {
    // 1. Создаем/обновляем модули
    console.log('📁 Создание модулей...')
    for (const module of data.modules) {
      // Проверяем, существует ли модуль
      const { data: existingModule } = await supabase
        .from('course_modules')
        .select('id')
        .eq('title', module.title)
        .eq('order_index', module.order_index)
        .single()

      if (existingModule) {
        // Обновляем модуль
        const { error } = await supabase
          .from('course_modules')
          .update({
            lessons_count: module.lessons.length,
            is_active: true
          })
          .eq('id', existingModule.id)

        if (error) {
          console.error(`   ❌ Ошибка обновления модуля "${module.title}":`, error.message)
          continue
        }

        moduleIds[module.title] = existingModule.id
        console.log(`   ✅ Обновлен: ${module.title} (${module.lessons.length} уроков)`)
      } else {
        // Создаем новый модуль
        const { data: newModule, error } = await supabase
          .from('course_modules')
          .insert({
            title: module.title,
            description: null,
            order_index: module.order_index,
            min_tariff: 'platinum',
            lessons_count: module.lessons.length,
            is_active: true
          })
          .select('id')
          .single()

        if (error) {
          console.error(`   ❌ Ошибка создания модуля "${module.title}":`, error.message)
          continue
        }

        if (newModule) {
          moduleIds[module.title] = newModule.id
          console.log(`   ✅ Создан: ${module.title} (${module.lessons.length} уроков)`)
        }
      }
    }

    console.log('\n📄 Создание уроков...')
    let totalLessons = 0
    let totalMaterials = 0

    // 2. Создаем уроки
    for (const module of data.modules) {
      const moduleId = moduleIds[module.title]
      if (!moduleId) {
        console.log(`   ⚠️ Пропущен модуль "${module.title}" - нет ID`)
        continue
      }

      for (const lesson of module.lessons) {
        totalLessons++

        // Проверяем, существует ли урок
        const { data: existingLesson } = await supabase
          .from('course_lessons')
          .select('id')
          .eq('module_id', moduleId)
          .eq('title', lesson.title)
          .single()

        const lessonData = {
          module_id: moduleId,
          title: lesson.title,
          description: cleanText(lesson.description),
          order_index: lesson.order_index,
          video_id: lesson.video_id || null,
          video_url: lesson.video_url || null,
          video_duration: null,
          has_homework: lesson.has_homework,
          homework_title: null,
          homework_description: cleanText(lesson.homework_description),
          is_active: true
        }

        let lessonId: string

        if (existingLesson) {
          // Обновляем урок
          const { error } = await supabase
            .from('course_lessons')
            .update(lessonData)
            .eq('id', existingLesson.id)

          if (error) {
            console.error(`   ❌ Ошибка обновления урока "${lesson.title}":`, error.message)
            continue
          }

          lessonId = existingLesson.id
        } else {
          // Создаем новый урок
          const { data: newLesson, error } = await supabase
            .from('course_lessons')
            .insert(lessonData)
            .select('id')
            .single()

          if (error) {
            console.error(`   ❌ Ошибка создания урока "${lesson.title}":`, error.message)
            continue
          }

          if (!newLesson) {
            console.error(`   ❌ Не удалось создать урок "${lesson.title}"`)
            continue
          }

          lessonId = newLesson.id
        }

        // 3. Создаем материалы
        if (lesson.materials.length > 0) {
          // Удаляем старые материалы
          await supabase
            .from('lesson_materials')
            .delete()
            .eq('lesson_id', lessonId)

          // Создаем новые материалы
          const materialsToInsert = lesson.materials.map((material, index) => ({
            lesson_id: lessonId,
            type: material.type,
            title: material.title || 'Материал',
            url: material.url,
            order_index: index
          }))

          const { error: materialsError } = await supabase
            .from('lesson_materials')
            .insert(materialsToInsert)

          if (materialsError) {
            console.error(`   ⚠️ Ошибка создания материалов для "${lesson.title}":`, materialsError.message)
          } else {
            totalMaterials += materialsToInsert.length
          }
        }

        if (totalLessons % 10 === 0) {
          console.log(`   📊 Обработано уроков: ${totalLessons}/${data.total_lessons}`)
        }
      }
    }

    console.log('\n✅ Загрузка завершена!')
    console.log(`\n📊 Статистика:`)
    console.log(`   Модулей: ${data.total_modules}`)
    console.log(`   Уроков: ${totalLessons}`)
    console.log(`   Материалов: ${totalMaterials}`)

  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    process.exit(1)
  }
}

uploadToSupabase().catch(console.error)

