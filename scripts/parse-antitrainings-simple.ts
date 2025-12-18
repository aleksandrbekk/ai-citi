import { chromium } from 'playwright'
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function parseAntitrainings() {
  console.log('🚀 Запускаю браузер...')
  
  const browser = await chromium.launch({ 
    headless: false,  // Видимый режим
    slowMo: 500       // Замедление для наглядности
  })
  
  const page = await browser.newPage()
  
  // Переходим на страницу входа
  console.log('📍 Открываю страницу входа...')
  await page.goto('https://antitreningi.ru/#/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })
  
  // Ждём пока пользователь залогинится
  console.log('')
  console.log('⏳ ===================================')
  console.log('⏳ ВВЕДИ ЛОГИН И ПАРОЛЬ В БРАУЗЕРЕ!')
  console.log('⏳ После входа жду 60 секунд...')
  console.log('⏳ ===================================')
  console.log('')
  
  // Ждём 60 секунд для ручного логина
  await page.waitForTimeout(60000)
  
  // Переходим к курсу
  console.log('📍 Перехожу к курсу...')
  await page.goto('https://antitreningi.ru/panel/279505/lessons', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })
  await page.waitForTimeout(5000)
  
  // Делаем скриншот для проверки
  const screenshotPath = join(__dirname, 'screenshot-course.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  console.log(`📸 Скриншот сохранён: ${screenshotPath}`)
  
  // Получаем HTML страницы для анализа
  const html = await page.content()
  const htmlPath = join(__dirname, 'page-content.html')
  writeFileSync(htmlPath, html, 'utf-8')
  console.log(`📄 HTML сохранён: ${htmlPath}`)
  
  console.log('')
  console.log('✅ Готово! Проверь скриншот и HTML.')
  console.log('Следующий шаг — парсинг структуры.')
  
  // Не закрываем браузер чтобы посмотреть результат
  console.log('')
  console.log('🔍 Браузер открыт. Нажми Ctrl+C в терминале чтобы закрыть.')
  
  // Ждём бесконечно (пока пользователь не нажмет Ctrl+C)
  await new Promise(() => {})
}

parseAntitrainings().catch(console.error)

