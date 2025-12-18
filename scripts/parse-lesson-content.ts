import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

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

// Извлечение video_id из URL Kinescope
function extractVideoId(url: string): string | null {
  const match = url.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// Определение типа материала по URL
function detectMaterialType(url: string, title: string): 'pdf' | 'sheet' | 'link' | 'file' {
  if (url.includes('docs.google.com') || url.includes('sheets.google.com')) {
    return 'sheet'
  }
  if (url.includes('.pdf') || url.toLowerCase().includes('pdf')) {
    return 'pdf'
  }
  if (url.includes('FILESTORAGE')) {
    return 'file'
  }
  return 'link'
}

// Парсинг содержимого урока
async function parseLessonContent(page: any, lesson: Lesson): Promise<Lesson> {
  try {
    console.log(`    📄 Парсинг: ${lesson.title.substring(0, 50)}...`)
    
    if (!lesson.url) {
      console.log(`    ⚠️ Нет URL для урока`)
      return lesson
    }
    
    const fullUrl = lesson.url.startsWith('http') 
      ? lesson.url 
      : `https://antitreningi.ru${lesson.url}`
    
    // Переходим на страницу урока
    await page.goto(fullUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    })
    await page.waitForTimeout(3000)
    
    // 1. Ищем video_url в iframe
    try {
      const iframe = await page.$('iframe[src*="kinescope"], iframe[src*="kinescope.io"]')
      if (iframe) {
        const videoUrl = await iframe.getAttribute('src')
        if (videoUrl) {
          lesson.video_url = videoUrl
          lesson.video_id = extractVideoId(videoUrl)
          console.log(`    ✅ Видео найдено: ${lesson.video_id}`)
        }
      } else {
        // Ищем в тексте страницы
        const pageContent = await page.content()
        const embedMatch = pageContent.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/)
        if (embedMatch) {
          lesson.video_id = embedMatch[1]
          lesson.video_url = `https://kinescope.io/embed/${lesson.video_id}`
          console.log(`    ✅ Видео найдено в коде: ${lesson.video_id}`)
        } else {
          console.log(`    ❌ Видео не найдено`)
        }
      }
    } catch (e) {
      console.log(`    ⚠️ Ошибка поиска видео`)
    }
    
    // 2. Извлекаем description
    try {
      const contentSelectors = [
        '.lesson-content',
        '.lesson-description',
        '[class*="description"]',
        '[class*="content"]',
        'textarea[name*="content"]',
        'textarea[name*="description"]',
        'div[contenteditable]'
      ]
      
      const texts: string[] = []
      for (const selector of contentSelectors) {
        const elements = await page.$$(selector)
        for (const el of elements) {
          const text = await el.textContent()
          if (text && text.trim() && text.length > 20) {
            texts.push(text.trim())
          }
        }
      }
      
      if (texts.length > 0) {
        lesson.description = texts.join('\n\n')
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // 3. Ищем материалы
    try {
      const links = await page.$$('a[href]')
      
      for (const link of links) {
        const href = await link.getAttribute('href')
        const text = await link.textContent()
        
        if (href && (
          href.includes('FILESTORAGE') || 
          href.includes('.pdf') || 
          href.includes('docs.google.com') || 
          href.includes('drive.google.com') ||
          href.includes('sheets.google.com')
        )) {
          const linkText = text?.trim() || 'Материал'
          const fullUrl = href.startsWith('http') ? href : `https://antitreningi.ru${href}`
          
          lesson.materials.push({
            type: detectMaterialType(fullUrl, linkText),
            title: linkText,
            url: fullUrl
          })
        }
      }
      
      if (lesson.materials.length > 0) {
        console.log(`    ✅ Найдено материалов: ${lesson.materials.length}`)
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // 4. Ищем домашнее задание
    try {
      const homeworkSelectors = [
        'text=/домашнее задание/i',
        'text=/домашнее/i',
        'text=/дз/i',
        'text=/задание/i',
        '.homework',
        '[class*="homework"]',
        'textarea[name*="homework"]',
        'textarea[name*="task"]'
      ]
      
      for (const selector of homeworkSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            lesson.has_homework = true
            
            // Ищем описание рядом
            const parent = await element.evaluateHandle((el: any) => {
              let current = el
              for (let i = 0; i < 5; i++) {
                current = current.parentElement
                if (!current) break
                if (current.textContent && current.textContent.length > 50) {
                  return current
                }
              }
              return el
            })
            
            if (parent) {
              const text = await parent.asElement()?.textContent()
              if (text) {
                lesson.homework_description = text.trim()
              }
            }
            
            // Или берем значение textarea
            const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase())
            if (tagName === 'textarea' || tagName === 'input') {
              const value = await element.inputValue()
              if (value) {
                lesson.homework_description = value
              }
            }
            
            break
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }
      
      if (lesson.has_homework) {
        console.log(`    ✅ ДЗ найдено`)
      } else {
        console.log(`    ❌ ДЗ не найдено`)
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    return lesson
  } catch (error) {
    console.error(`    ❌ Ошибка парсинга урока:`, error)
    return lesson
  }
}

// Генерация SQL
function generateSQL(data: ParsedData) {
  const sql: string[] = []
  
  sql.push('-- SQL для импорта курса КИНОСКОП')
  sql.push(`-- Сгенерировано: ${data.parsed_at}`)
  sql.push('')
  
  for (const module of data.modules) {
    sql.push(`-- Модуль: ${module.title}`)
    sql.push(`INSERT INTO course_modules (id, title, description, order_index, min_tariff, lessons_count, is_active)`)
    sql.push(`VALUES (gen_random_uuid(), '${module.title.replace(/'/g, "''")}', NULL, ${module.order_index}, 'platinum', ${module.lessons.length}, true);`)
    sql.push('')
    
    for (const lesson of module.lessons) {
      const videoId = lesson.video_id ? `'${lesson.video_id}'` : 'NULL'
      const videoUrl = lesson.video_url ? `'${lesson.video_url.replace(/'/g, "''")}'` : 'NULL'
      const description = lesson.description ? `'${lesson.description.replace(/'/g, "''").replace(/\n/g, ' ')}'` : 'NULL'
      const homeworkDesc = lesson.homework_description ? `'${lesson.homework_description.replace(/'/g, "''").replace(/\n/g, ' ')}'` : 'NULL'
      
      sql.push(`-- Урок: ${lesson.title}`)
      sql.push(`INSERT INTO course_lessons (id, module_id, title, description, order_index, video_id, video_url, video_duration, has_homework, homework_title, homework_description, is_active)`)
      sql.push(`VALUES (`)
      sql.push(`  gen_random_uuid(),`)
      sql.push(`  (SELECT id FROM course_modules WHERE title ILIKE '%${module.title.replace(/'/g, "''")}%' LIMIT 1),`)
      sql.push(`  '${lesson.title.replace(/'/g, "''")}',`)
      sql.push(`  ${description},`)
      sql.push(`  ${lesson.order_index},`)
      sql.push(`  ${videoId},`)
      sql.push(`  ${videoUrl},`)
      sql.push(`  NULL,`)
      sql.push(`  ${lesson.has_homework},`)
      sql.push(`  NULL,`)
      sql.push(`  ${homeworkDesc},`)
      sql.push(`  true`)
      sql.push(`);`)
      sql.push('')
      
      // Материалы
      if (lesson.materials.length > 0) {
        for (let i = 0; i < lesson.materials.length; i++) {
          const material = lesson.materials[i]
          
          sql.push(`INSERT INTO lesson_materials (id, lesson_id, type, title, url, order_index)`)
          sql.push(`VALUES (`)
          sql.push(`  gen_random_uuid(),`)
          sql.push(`  (SELECT id FROM course_lessons WHERE title = '${lesson.title.replace(/'/g, "''")}' LIMIT 1),`)
          sql.push(`  '${material.type}',`)
          sql.push(`  '${material.title.replace(/'/g, "''")}',`)
          sql.push(`  '${material.url.replace(/'/g, "''")}',`)
          sql.push(`  ${i}`)
          sql.push(`);`)
        }
        sql.push('')
      }
    }
  }
  
  const sqlPath = join(__dirname, 'kinoskop_lessons.sql')
  writeFileSync(sqlPath, sql.join('\n'), 'utf-8')
  console.log(`✅ SQL сохранен в ${sqlPath}`)
}

async function parseLessonContent() {
  console.log('🚀 Запуск парсинга содержимого уроков...\n')
  
  // Читаем очищенную структуру
  const data: ParsedData = JSON.parse(
    readFileSync(join(__dirname, 'kinoskop_structure_clean.json'), 'utf-8')
  )
  
  console.log(`📚 Загружено: ${data.total_modules} модулей, ${data.total_lessons} уроков\n`)
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200
  })
  
  const page = await browser.newPage()
  
  try {
    // Переходим на страницу входа (если нужно)
    console.log('📄 Переход на страницу входа...')
    await page.goto('https://antitreningi.ru/#/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })
    
    console.log('⏳ Введи логин/пароль в браузере...')
    console.log('   Жду 30 секунд...')
    await page.waitForTimeout(30000)
    
    let totalProcessed = 0
    const totalLessons = data.total_lessons
    
    // Проходим по каждому модулю и уроку
    for (const module of data.modules) {
      console.log(`\n📁 Модуль: ${module.title} (${module.lessons.length} уроков)`)
      
      for (const lesson of module.lessons) {
        totalProcessed++
        console.log(`\n  [${totalProcessed}/${totalLessons}] Урок ${lesson.order_index + 1}/${module.lessons.length}`)
        
        const updatedLesson = await parseLessonContent(page, lesson)
        
        // Обновляем урок в данных
        const lessonIndex = module.lessons.findIndex(l => l.title === lesson.title)
        if (lessonIndex !== -1) {
          module.lessons[lessonIndex] = updatedLesson
        }
        
        // Сохраняем промежуточный результат каждые 10 уроков
        if (totalProcessed % 10 === 0) {
          data.parsed_at = new Date().toISOString()
          writeFileSync(
            join(__dirname, 'kinoskop_structure.json'),
            JSON.stringify(data, null, 2),
            'utf-8'
          )
          console.log(`  💾 Промежуточное сохранение...`)
        }
      }
    }
    
    // Финальное сохранение
    data.parsed_at = new Date().toISOString()
    writeFileSync(
      join(__dirname, 'kinoskop_structure.json'),
      JSON.stringify(data, null, 2),
      'utf-8'
    )
    console.log(`\n✅ Данные сохранены в scripts/kinoskop_structure.json`)
    
    // Статистика
    const withVideo = data.modules.reduce((sum, m) => 
      sum + m.lessons.filter(l => l.video_url).length, 0)
    const withHomework = data.modules.reduce((sum, m) => 
      sum + m.lessons.filter(l => l.has_homework).length, 0)
    const totalMaterials = data.modules.reduce((sum, m) => 
      sum + m.lessons.reduce((s, l) => s + l.materials.length, 0), 0)
    
    console.log('\n📊 Статистика:')
    console.log(`   Уроков обработано: ${totalProcessed}`)
    console.log(`   С видео: ${withVideo}`)
    console.log(`   С ДЗ: ${withHomework}`)
    console.log(`   Материалов всего: ${totalMaterials}`)
    
    // Генерируем SQL
    generateSQL(data)
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
  } finally {
    console.log('\n⏸️ Нажмите Enter для закрытия браузера...')
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve(null))
    })
    await browser.close()
  }
}

parseLessonContent().catch(console.error)

