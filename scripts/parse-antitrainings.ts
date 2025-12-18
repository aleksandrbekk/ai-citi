import { chromium, Page } from 'playwright'
import { writeFileSync } from 'fs'
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

async function parseAntitrainings() {
  console.log('🚀 Запуск парсинга Antitrainings...\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300
  })
  
  const page = await browser.newPage()
  
  // 1. Авторизация
  console.log('📄 Переход на страницу входа...')
  await page.goto('https://antitreningi.ru/#/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })
  
  console.log('⏳ Введи логин/пароль в браузере...')
  console.log('   Жду 30 секунд...')
  await page.waitForTimeout(30000)
  
  // 2. Переход к курсу
  console.log('📚 Переход на страницу уроков...')
  await page.goto('https://antitreningi.ru/panel/279505/lessons', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })
  await page.waitForTimeout(5000)
  
  // Делаем скриншот для проверки
  const screenshotPath = join(__dirname, 'screenshot-after-load.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 Скриншот сохранён: ${screenshotPath}\n`)
  
  // 3. Ищем модули
  console.log('🔍 Поиск модулей...')
  const moduleElements = page.locator('.MuiPaper-root.MuiAccordion-root')
  const moduleCount = await moduleElements.count()
  console.log(`✅ Найдено модулей: ${moduleCount}\n`)
  
  if (moduleCount === 0) {
    console.log('❌ Модули не найдены. Делаю скриншот...')
    await page.screenshot({ path: join(__dirname, 'debug-no-modules.png'), fullPage: true })
    await browser.close()
    return
  }
  
  const modules: Module[] = []
  
  // 4. Проходим по каждому модулю
  for (let i = 0; i < moduleCount; i++) {
    const moduleEl = moduleElements.nth(i)
    
    // Получаем название модуля
    const titleEl = moduleEl.locator('.MuiAccordionSummary-content h6').first()
    const moduleTitle = await titleEl.textContent() || `Модуль ${i + 1}`
    console.log(`📁 Модуль ${i + 1}/${moduleCount}: ${moduleTitle.trim()}`)
    
    // Кликаем чтобы раскрыть
    const summaryEl = moduleEl.locator('.MuiAccordionSummary-root').first()
    const isExpanded = await moduleEl.getAttribute('aria-expanded')
    
    if (isExpanded !== 'true') {
      await summaryEl.click()
      await page.waitForTimeout(2000) // Ждём загрузки уроков
    }
    
    // Ищем уроки внутри
    const detailsEl = moduleEl.locator('.MuiAccordionDetails-root').first()
    const lessonLinks = detailsEl.locator('a')
    const lessonCount = await lessonLinks.count()
    console.log(`   📄 Уроков в модуле: ${lessonCount}`)
    
    const lessons: Lesson[] = []
    
    for (let j = 0; j < lessonCount; j++) {
      const lessonLink = lessonLinks.nth(j)
      const lessonTitle = await lessonLink.textContent() || `Урок ${j + 1}`
      const lessonUrl = await lessonLink.getAttribute('href') || ''
      
      const shortTitle = lessonTitle.trim().substring(0, 50)
      console.log(`   📄 Урок ${j + 1}/${lessonCount}: ${shortTitle}${lessonTitle.trim().length > 50 ? '...' : ''}`)
      
      lessons.push({
        title: lessonTitle.trim(),
        order_index: j,
        url: lessonUrl,
        materials: [],
        has_homework: false
      })
    }
    
    modules.push({
      title: moduleTitle.trim(),
      order_index: i,
      lessons
    })
    
    console.log(`   ✅ Модуль обработан: ${lessons.length} уроков\n`)
  }
  
  // 5. Сохраняем базовую структуру
  const data = {
    parsed_at: new Date().toISOString(),
    total_modules: modules.length,
    total_lessons: modules.reduce((sum, m) => sum + m.lessons.length, 0),
    modules
  }
  
  const jsonPath = join(__dirname, 'kinoskop_structure.json')
  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`✅ Структура сохранена в ${jsonPath}`)
  
  // 6. Статистика
  console.log('\n📊 Статистика:')
  console.log(`   Модулей: ${data.total_modules}`)
  console.log(`   Уроков всего: ${data.total_lessons}`)
  
  // Показываем структуру
  console.log('\n📋 Структура курса:')
  for (const mod of modules) {
    console.log(`   ${mod.title}: ${mod.lessons.length} уроков`)
  }
  
  console.log('\n⏸️ Структура готова!')
  console.log('Следующий шаг — парсинг содержимого каждого урока.')
  console.log('Нажми Enter для закрытия браузера...')
  
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve(null))
  })
  await browser.close()
}

parseAntitrainings().catch(console.error)
