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

// Парсинг урока в режиме редактирования
async function parseLesson(page: Page, lessonTitle: string): Promise<Lesson | null> {
  try {
    console.log(`  📝 Парсинг урока: ${lessonTitle}`)
    
    // Ждем загрузки редактора
    await page.waitForTimeout(3000)
    
    // 1. Извлекаем title (может быть в заголовке или поле ввода)
    let title = lessonTitle
    try {
      const titleInput = await page.$('input[type="text"], input[name*="title"], input[name*="name"]')
      if (titleInput) {
        const value = await titleInput.inputValue()
        if (value) title = value
      }
    } catch (e) {
      // Игнорируем ошибки
    }
    
    // 2. Ищем video_url в iframe
    let video_url: string | null = null
    let video_id: string | null = null
    
    try {
      // Ищем iframe с kinescope
      const iframe = await page.$('iframe[src*="kinescope"], iframe[src*="kinescope.io"]')
      if (iframe) {
        video_url = await iframe.getAttribute('src')
        if (video_url) {
          video_id = extractVideoId(video_url)
        }
      }
      
      // Если не нашли iframe, ищем embed код в тексте
      if (!video_url) {
        const pageContent = await page.content()
        const embedMatch = pageContent.match(/kinescope\.io\/embed\/([a-zA-Z0-9_-]+)/)
        if (embedMatch) {
          video_id = embedMatch[1]
          video_url = `https://kinescope.io/embed/${video_id}`
        }
      }
    } catch (e) {
      console.log(`    ⚠️ Не удалось извлечь видео: ${e}`)
    }
    
    // 3. Извлекаем description (текстовый контент)
    let description: string | null = null
    try {
      // Ищем блоки с текстом контента
      const contentBlocks = await page.$$('div[contenteditable], .editor-content, .lesson-content, textarea[name*="content"], textarea[name*="description"]')
      
      const texts: string[] = []
      for (const block of contentBlocks) {
        const text = await block.textContent()
        if (text && text.trim()) {
          texts.push(text.trim())
        }
      }
      
      if (texts.length > 0) {
        description = texts.join('\n\n')
      }
    } catch (e) {
      console.log(`    ⚠️ Не удалось извлечь описание: ${e}`)
    }
    
    // 4. Ищем материалы (ссылки на файлы)
    const materials: LessonMaterial[] = []
    
    try {
      // Ищем все ссылки
      const links = await page.$$('a[href], button[href]')
      
      for (const link of links) {
        const href = await link.getAttribute('href')
        const text = await link.textContent()
        
        if (href && (href.includes('FILESTORAGE') || href.includes('.pdf') || href.includes('docs.google.com') || href.includes('drive.google.com'))) {
          const linkText = text?.trim() || null
          materials.push({
            type: detectMaterialType(href, linkText),
            title: linkText,
            url: href.startsWith('http') ? href : `https://antitreningi.ru${href}`
          })
        }
      }
      
      // Ищем кнопки "Скачать", "Заполнить"
      const downloadButtons = await page.$$('button:has-text("Скачать"), button:has-text("Заполнить"), a:has-text("Скачать")')
      for (const btn of downloadButtons) {
        const href = await btn.getAttribute('href')
        if (href) {
          const text = await btn.textContent()
          materials.push({
            type: detectMaterialType(href, text),
            title: text?.trim() || null,
            url: href.startsWith('http') ? href : `https://antitreningi.ru${href}`
          })
        }
      }
    } catch (e) {
      console.log(`    ⚠️ Не удалось извлечь материалы: ${e}`)
    }
    
    // 5. Ищем домашнее задание
    let has_homework = false
    let homework_description: string | null = null
    
    try {
      // Ищем блоки с текстом "Домашнее задание", "ДЗ", "Задание"
      const homeworkSelectors = [
        'text=/домашнее задание/i',
        'text=/домашнее/i',
        'text=/дз/i',
        'text=/задание/i',
        'textarea[name*="homework"]',
        'textarea[name*="task"]',
        'input[name*="homework"]'
      ]
      
      for (const selector of homeworkSelectors) {
        try {
          const element = await page.$(selector)
          if (element) {
            has_homework = true
            
            // Пытаемся найти описание рядом
            const parent = await element.evaluateHandle((el) => el.closest('div, section, article'))
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
    } catch (e) {
      console.log(`    ⚠️ Не удалось извлечь ДЗ: ${e}`)
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
    console.error(`  ❌ Ошибка парсинга урока "${lessonTitle}":`, error)
    return null
  }
}

// Основная функция парсинга
async function parseCourse() {
  console.log('🚀 Запуск парсинга Antitrainings...\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 // Замедление для отладки
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
    await page.waitForTimeout(3000)
    
    // Шаг 4: Поиск модулей и уроков
    console.log('🔍 Поиск модулей и уроков...\n')
    
    const modules: Module[] = []
    
    // Ищем все элементы уроков/модулей
    // Варианты селекторов для списка уроков
    const lessonSelectors = [
      'a[href*="/lesson/"]',
      'a[href*="/edit"]',
      '.lesson-item',
      '.module-item',
      'tr[data-id]',
      '.list-item',
      '[data-lesson-id]'
    ]
    
    let lessonLinks: any[] = []
    for (const selector of lessonSelectors) {
      try {
        lessonLinks = await page.$$(selector)
        if (lessonLinks.length > 0) {
          console.log(`✅ Найдено элементов по селектору "${selector}": ${lessonLinks.length}`)
          break
        }
      } catch (e) {
        // Продолжаем поиск
      }
    }
    
    // Если не нашли через селекторы, попробуем найти все ссылки
    if (lessonLinks.length === 0) {
      console.log('⚠️ Не найдено через селекторы, ищем все ссылки...')
      const allLinks = await page.$$('a')
      const filteredLinks: any[] = []
      for (const link of allLinks) {
        const href = await link.getAttribute('href')
        if (href && (href.includes('lesson') || href.includes('edit') || href.includes('panel'))) {
          filteredLinks.push(link)
        }
      }
      lessonLinks = filteredLinks
    }
    
    console.log(`📊 Найдено потенциальных уроков: ${lessonLinks.length}\n`)
    
    // Сначала попробуем найти структуру модулей на странице
    // Ищем заголовки модулей или группы уроков
    const moduleHeaders = await page.$$('h2, h3, .module-title, [class*="module"]')
    const moduleTitles: string[] = []
    for (const header of moduleHeaders) {
      const text = await header.textContent()
      if (text && text.trim().length > 0) {
        moduleTitles.push(text.trim())
      }
    }
    
    // Группируем по модулям (если есть структура модулей)
    // Пока парсим все уроки подряд
    const allLessons: Lesson[] = []
    
    // Собираем уникальные ссылки на уроки
    const uniqueLessons = new Map<string, any>()
    
    for (const link of lessonLinks) {
      try {
        const href = await link.getAttribute('href')
        const text = await link.textContent()
        
        if (href && text && !uniqueLessons.has(href)) {
          uniqueLessons.set(href, { link, href, text: text.trim() })
        }
      } catch (e) {
        // Пропускаем
      }
    }
    
    const lessonsToParse = Array.from(uniqueLessons.values())
    console.log(`📚 Уникальных уроков для парсинга: ${lessonsToParse.length}\n`)
    
    for (let i = 0; i < lessonsToParse.length; i++) {
      const { link, href, text } = lessonsToParse[i]
      
      try {
        console.log(`\n📖 Урок ${i + 1}/${lessonsToParse.length}: ${text}`)
        
        // Открываем урок в новой вкладке или кликаем
        const fullUrl = href.startsWith('http') ? href : `https://antitreningi.ru${href}`
        
        // Если ссылка ведет на редактирование, используем её напрямую
        if (href.includes('/edit') || href.includes('/lesson/')) {
          await page.goto(fullUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          }).catch(() => {})
        } else {
          // Иначе кликаем и ждем перехода
          await link.click()
          await page.waitForNavigation({ 
            waitUntil: 'domcontentloaded', 
            timeout: 10000 
          }).catch(() => {})
        }
        
        await page.waitForTimeout(3000)
        
        // Парсим урок
        const lesson = await parseLesson(page, text)
        
        if (lesson) {
          lesson.order_index = allLessons.length
          allLessons.push(lesson)
        }
        
        // Возвращаемся к списку
        await page.goto('https://antitreningi.ru/panel/279505/lessons', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        }).catch(() => {})
        await page.waitForTimeout(2000)
        
      } catch (error) {
        console.error(`❌ Ошибка при обработке урока ${i + 1}:`, error)
        // Продолжаем дальше
        try {
          await page.goto('https://antitreningi.ru/panel/279505/lessons', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          })
          await page.waitForTimeout(2000)
        } catch (e) {
          // Игнорируем ошибки навигации
        }
      }
    }
    
    // Группируем уроки по модулям (пока один модуль со всеми уроками)
    modules.push({
      title: 'Все модули',
      order_index: 0,
      lessons: allLessons
    })
    
    // Формируем результат
    const result: ParsedData = {
      parsed_at: new Date().toISOString(),
      total_modules: modules.length,
      total_lessons: allLessons.length,
      modules
    }
    
    // Сохраняем JSON
    const jsonPath = join(__dirname, 'kinoskop_structure.json')
    writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`\n✅ Данные сохранены в ${jsonPath}`)
    
    // Статистика
    const stats = {
      modules: result.total_modules,
      lessons: result.total_lessons,
      withVideo: allLessons.filter(l => l.video_url).length,
      withHomework: allLessons.filter(l => l.has_homework).length,
      pdfMaterials: allLessons.reduce((sum, l) => sum + l.materials.filter(m => m.type === 'pdf').length, 0),
      sheets: allLessons.reduce((sum, l) => sum + l.materials.filter(m => m.type === 'sheet').length, 0)
    }
    
    console.log('\n📊 Статистика:')
    console.log(`  Модулей: ${stats.modules}`)
    console.log(`  Уроков всего: ${stats.lessons}`)
    console.log(`  С видео: ${stats.withVideo}`)
    console.log(`  С ДЗ: ${stats.withHomework}`)
    console.log(`  PDF материалов: ${stats.pdfMaterials}`)
    console.log(`  Таблиц: ${stats.sheets}`)
    
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
  
  let moduleOrder = 0
  let lessonOrder = 0
  
  for (const module of data.modules) {
    moduleOrder++
    
    sql.push(`-- Модуль: ${module.title}`)
    sql.push(`INSERT INTO course_modules (id, title, description, order_index, min_tariff, lessons_count, is_active)`)
    sql.push(`VALUES (gen_random_uuid(), '${module.title.replace(/'/g, "''")}', NULL, ${moduleOrder}, 'platinum', ${module.lessons.length}, true);`)
    sql.push('')
    
    for (const lesson of module.lessons) {
      lessonOrder++
      
      const videoId = lesson.video_id ? `'${lesson.video_id}'` : 'NULL'
      const videoUrl = lesson.video_url ? `'${lesson.video_url.replace(/'/g, "''")}'` : 'NULL'
      const description = lesson.description ? `'${lesson.description.replace(/'/g, "''")}'` : 'NULL'
      const homeworkDesc = lesson.homework_description ? `'${lesson.homework_description.replace(/'/g, "''")}'` : 'NULL'
      
      sql.push(`-- Урок: ${lesson.title}`)
      sql.push(`INSERT INTO course_lessons (id, module_id, title, description, order_index, video_id, video_url, video_duration, has_homework, homework_title, homework_description, is_active)`)
      sql.push(`VALUES (gen_random_uuid(), (SELECT id FROM course_modules WHERE order_index = ${moduleOrder} LIMIT 1), '${lesson.title.replace(/'/g, "''")}', ${description}, ${lessonOrder}, ${videoId}, ${videoUrl}, NULL, ${lesson.has_homework}, NULL, ${homeworkDesc}, true);`)
      sql.push('')
      
      // Материалы
      if (lesson.materials.length > 0) {
        for (let i = 0; i < lesson.materials.length; i++) {
          const material = lesson.materials[i]
          const materialTitle = material.title ? `'${material.title.replace(/'/g, "''")}'` : 'NULL'
          
          sql.push(`INSERT INTO lesson_materials (id, lesson_id, type, title, url, order_index)`)
          sql.push(`VALUES (gen_random_uuid(), (SELECT id FROM course_lessons WHERE title = '${lesson.title.replace(/'/g, "''")}' LIMIT 1), '${material.type}', ${materialTitle}, '${material.url.replace(/'/g, "''")}', ${i});`)
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

