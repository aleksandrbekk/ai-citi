import { chromium, Browser, Page } from 'playwright'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

interface LessonMaterial {
  type: 'pdf' | 'sheet' | 'link' | 'file'
  title: string | null
  url: string
}

interface Lesson {
  title: string
  order_index: number
  video_url: string | null
  video_id: string | null
  description: string | null
  materials: LessonMaterial[]
  has_homework: boolean
  homework_description: string | null
}

interface Module {
  title: string
  order_index: number
  lessons: Lesson[]
}

interface ParsedData {
  parsed_at: string
  modules: Module[]
}

// Извлечение video_id из URL Kinescope
function extractVideoId(url: string): string | null {
  const match = url.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// Определение типа материала по URL
function detectMaterialType(url: string, title: string | null): 'pdf' | 'sheet' | 'link' | 'file' {
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

// Парсинг урока
async function parseLesson(page: Page, lessonTitle: string): Promise<Lesson | null> {
  try {
    console.log(`    📄 Парсинг урока: ${lessonTitle}`)
    
    // Ждем загрузки страницы
    await page.waitForTimeout(3000)
    
    // 1. Извлекаем title
    let title = lessonTitle
    try {
      const titleSelectors = [
        'h1',
        'h2',
        '.lesson-title',
        '[class*="title"]',
        'input[name*="title"]',
        'input[name*="name"]'
      ]
      
      for (const selector of titleSelectors) {
        const element = await page.$(selector)
        if (element) {
          const text = await element.textContent()
          if (text && text.trim()) {
            title = text.trim()
            break
          }
        }
      }
    } catch (e) {
      // Используем переданное название
    }
    
    // 2. Ищем video_url в iframe
    let video_url: string | null = null
    let video_id: string | null = null
    
    try {
      const iframe = await page.$('iframe[src*="kinescope"], iframe[src*="kinescope.io"]')
      if (iframe) {
        video_url = await iframe.getAttribute('src')
        if (video_url) {
          video_id = extractVideoId(video_url)
          console.log(`    ✅ Видео найдено: ${video_id}`)
        }
      } else {
        // Ищем в тексте страницы
        const pageContent = await page.content()
        const embedMatch = pageContent.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/)
        if (embedMatch) {
          video_id = embedMatch[1]
          video_url = `https://kinescope.io/embed/${video_id}`
          console.log(`    ✅ Видео найдено в коде: ${video_id}`)
        } else {
          console.log(`    ❌ Видео не найдено`)
        }
      }
    } catch (e) {
      console.log(`    ❌ Ошибка поиска видео: ${e}`)
    }
    
    // 3. Извлекаем description
    let description: string | null = null
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
        description = texts.join('\n\n')
      }
    } catch (e) {
      console.log(`    ⚠️ Не удалось извлечь описание`)
    }
    
    // 4. Ищем материалы
    const materials: LessonMaterial[] = []
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
          const linkText = text?.trim() || null
          const fullUrl = href.startsWith('http') ? href : `https://antitreningi.ru${href}`
          
          materials.push({
            type: detectMaterialType(fullUrl, linkText),
            title: linkText,
            url: fullUrl
          })
        }
      }
      
      if (materials.length > 0) {
        console.log(`    ✅ Найдено материалов: ${materials.length}`)
      }
    } catch (e) {
      console.log(`    ⚠️ Ошибка поиска материалов`)
    }
    
    // 5. Ищем домашнее задание
    let has_homework = false
    let homework_description: string | null = null
    
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
            has_homework = true
            
            // Ищем описание рядом
            const parent = await element.evaluateHandle((el) => {
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
                homework_description = text.trim()
              }
            }
            
            // Или берем значение textarea
            const tagName = await element.evaluate((el) => el.tagName.toLowerCase())
            if (tagName === 'textarea' || tagName === 'input') {
              const value = await element.inputValue()
              if (value) {
                homework_description = value
              }
            }
            
            break
          }
        } catch (e) {
          // Продолжаем поиск
        }
      }
      
      if (has_homework) {
        console.log(`    ✅ ДЗ найдено`)
      } else {
        console.log(`    ❌ ДЗ не найдено`)
      }
    } catch (e) {
      console.log(`    ⚠️ Ошибка поиска ДЗ`)
    }
    
    return {
      title,
      order_index: 0, // Будет установлено позже
      video_url,
      video_id,
      description,
      materials,
      has_homework,
      homework_description
    }
  } catch (error) {
    console.error(`    ❌ Ошибка парсинга урока:`, error)
    return null
  }
}

// Основная функция парсинга
async function parseCourse() {
  console.log('🚀 Запуск парсинга Antitrainings...\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100
  })
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  })
  
  const page = await context.newPage()
  
  try {
    // Шаг 1: Переход на страницу входа
    console.log('📄 Переход на страницу входа...')
    try {
      await page.goto('https://antitreningi.ru/#/login', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      })
    } catch (e) {
      console.log('⚠️ Таймаут загрузки страницы, продолжаем...')
    }
    await page.waitForTimeout(3000)
    
    // Шаг 2: Ожидание ввода логина/пароля
    console.log('⏳ Введи логин/пароль в браузере...')
    console.log('   Жду 30 секунд, затем автоматически продолжу...')
    await page.waitForTimeout(30000)
    console.log('✅ Продолжаю парсинг...')
    
    // Шаг 3: Переход на страницу уроков
    console.log('📚 Переход на страницу уроков...')
    try {
      await page.goto('https://antitreningi.ru/panel/279505/lessons', { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      })
    } catch (e) {
      console.log('⚠️ Таймаут загрузки страницы уроков, продолжаем...')
    }
    
    // Ждем загрузки React компонентов
    console.log('⏳ Жду загрузки React компонентов...')
    await page.waitForTimeout(5000)
    
    // Шаг 4: Поиск модулей
    console.log('🔍 Поиск модулей...\n')
    
    // Ищем все MUI Accordion (модули)
    const accordions = await page.$$('.MuiAccordion-root')
    console.log(`✅ Найдено модулей: ${accordions.length}\n`)
    
    const modules: Module[] = []
    
    for (let i = 0; i < accordions.length; i++) {
      const accordion = accordions[i]
      
      try {
        // Получаем название модуля
        const titleElement = await accordion.$('h6')
        const moduleTitle = titleElement ? await titleElement.textContent() : `Модуль ${i + 1}`
        const title = moduleTitle?.trim() || `Модуль ${i + 1}`
        
        console.log(`📁 Модуль ${i + 1}/${accordions.length}: ${title}`)
        
        // Раскрываем модуль (кликаем на заголовок)
        const summary = await accordion.$('.MuiAccordionSummary-root')
        if (summary) {
          const isExpanded = await accordion.getAttribute('aria-expanded')
          if (isExpanded !== 'true') {
            await summary.click()
            await page.waitForTimeout(1000) // Ждем раскрытия
          }
        }
        
        // Ищем уроки внутри модуля
        const lessonLinks = await accordion.$$('a[href*="/panel/"], a[href*="/lesson/"], a[href*="/edit"]')
        
        // Если не нашли через ссылки, ищем по другим селекторам
        let lessons: Lesson[] = []
        
        if (lessonLinks.length > 0) {
          console.log(`  📚 Найдено уроков: ${lessonLinks.length}`)
          
          for (let j = 0; j < lessonLinks.length; j++) {
            const link = lessonLinks[j]
            
            try {
              const href = await link.getAttribute('href')
              const linkText = await link.textContent()
              
              if (!href || !linkText) continue
              
              const fullUrl = href.startsWith('http') ? href : `https://antitreningi.ru${href}`
              
              console.log(`  📄 Урок ${j + 1}/${lessonLinks.length}: ${linkText.trim()}`)
              
              // Открываем урок
              await link.click()
              await page.waitForTimeout(2000)
              
              // Парсим урок
              const lesson = await parseLesson(page, linkText.trim())
              
              if (lesson) {
                lesson.order_index = j
                lessons.push(lesson)
              }
              
              // Возвращаемся к списку уроков
              await page.goto('https://antitreningi.ru/panel/279505/lessons', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
              })
              await page.waitForTimeout(3000)
              
              // Переоткрываем модуль
              const accordionsAfter = await page.$$('.MuiAccordion-root')
              if (accordionsAfter[i]) {
                const summaryAfter = await accordionsAfter[i].$('.MuiAccordionSummary-root')
                if (summaryAfter) {
                  await summaryAfter.click()
                  await page.waitForTimeout(1000)
                }
              }
              
            } catch (error) {
              console.error(`  ❌ Ошибка при обработке урока ${j + 1}:`, error)
              // Продолжаем дальше
              await page.goto('https://antitreningi.ru/panel/279505/lessons', { 
                waitUntil: 'domcontentloaded',
                timeout: 30000 
              })
              await page.waitForTimeout(2000)
            }
          }
        } else {
          console.log(`  ⚠️ Уроки не найдены в модуле`)
        }
        
        modules.push({
          title,
          order_index: i,
          lessons
        })
        
        console.log(`  ✅ Модуль обработан: ${lessons.length} уроков\n`)
        
      } catch (error) {
        console.error(`❌ Ошибка при обработке модуля ${i + 1}:`, error)
      }
    }
    
    // Формируем результат
    const result: ParsedData = {
      parsed_at: new Date().toISOString().split('T')[0],
      modules
    }
    
    // Сохраняем JSON
    const jsonPath = join(__dirname, 'kinoskop_structure.json')
    writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`\n✅ Данные сохранены в ${jsonPath}`)
    
    // Статистика
    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
    const withVideo = modules.reduce((sum, m) => 
      sum + m.lessons.filter(l => l.video_url).length, 0)
    const withHomework = modules.reduce((sum, m) => 
      sum + m.lessons.filter(l => l.has_homework).length, 0)
    
    console.log('\n📊 Статистика:')
    console.log(`  Модулей: ${modules.length}`)
    console.log(`  Уроков всего: ${totalLessons}`)
    console.log(`  С видео: ${withVideo}`)
    console.log(`  С ДЗ: ${withHomework}`)
    
    // Генерируем SQL
    generateSQL(result)
    
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
          const materialTitle = material.title ? `'${material.title.replace(/'/g, "''")}'` : 'NULL'
          
          sql.push(`INSERT INTO lesson_materials (id, lesson_id, type, title, url, order_index)`)
          sql.push(`VALUES (`)
          sql.push(`  gen_random_uuid(),`)
          sql.push(`  (SELECT id FROM course_lessons WHERE title = '${lesson.title.replace(/'/g, "''")}' LIMIT 1),`)
          sql.push(`  '${material.type}',`)
          sql.push(`  ${materialTitle},`)
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

// Запуск
parseCourse().catch(console.error)
