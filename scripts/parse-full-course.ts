import { chromium } from 'playwright';
import * as fs from 'fs';

async function parseFullCourse() {
  const browser = await chromium.launch({ 
    headless: false,  // ВИДИМЫЙ браузер
    slowMo: 200       // Замедление для стабильности
  });
  
  const page = await browser.newPage();
  
  // ШАГ 1: Авторизация
  await page.goto('https://antitreningi.ru/#/login', {
    timeout: 120000,
    waitUntil: 'domcontentloaded'
  });
  console.log('⏳ АВТОРИЗУЙСЯ В БРАУЗЕРЕ! Жду 90 секунд...');
  await page.waitForTimeout(90000);
  
  // ШАГ 2: Переход на страницу курса
  console.log('🔄 Перехожу на страницу курса...');
  await page.goto('https://antitreningi.ru/panel/279505/lessons', {
    timeout: 120000,
    waitUntil: 'domcontentloaded'
  });
  
  console.log('⏳ Жду загрузки контента...');
  await page.waitForTimeout(10000);
  
  console.log('✅ Страница загружена, начинаю парсинг...');
  
  const result = {
    course_name: 'МЛМ ЛАГЕРЬ',
    parsed_at: new Date().toISOString(),
    modules: []
  };
  
  // ШАГ 3: Найти все модули (MUI Accordion)
  console.log('🔍 Ищу модули...');
  const moduleElements = await page.locator('.MuiPaper-root.MuiAccordion-root').all();
  console.log(`📦 Найдено модулей: ${moduleElements.length}`);
  
  if (moduleElements.length === 0) {
    console.log('⚠️ Модули не найдены. Делаю скриншот для отладки...');
    await page.screenshot({ path: 'scripts/debug-no-modules.png', fullPage: true });
    console.log('📸 Скриншот сохранён: scripts/debug-no-modules.png');
    await browser.close();
    return;
  }
  
  const modules: any[] = [];
  
  // ШАГ 4: Раскрыть ВСЕ модули и собрать уроки
  for (let i = 0; i < moduleElements.length; i++) {
    const moduleEl = moduleElements[i];
    
    // Получаем название модуля и количество уроков из заголовка
    let moduleTitle = `Модуль ${i + 1}`;
    let expectedLessonsCount = 0;
    
    try {
      const titleEl = moduleEl.locator('.MuiAccordionSummary-content h6').first();
      const titleText = await titleEl.textContent();
      if (titleText) {
        moduleTitle = titleText.trim();
        
        // Парсим количество уроков из заголовка
        // Ищем число в скобках: "Модуль 3. Прогревы (30)"
        // Или число рядом с иконкой книги в заголовке
        const countMatch = titleText.match(/\((\d+)\)/);
        if (countMatch) {
          expectedLessonsCount = parseInt(countMatch[1], 10);
        } else {
          // Пробуем найти число в самом заголовке (например "30 уроков")
          const numberMatch = titleText.match(/(\d+)\s*(урок|lesson)/i);
          if (numberMatch) {
            expectedLessonsCount = parseInt(numberMatch[1], 10);
          }
        }
      }
      
      // Также пробуем найти число в иконке/бейдже рядом с заголовком
      if (expectedLessonsCount === 0) {
        try {
          const badgeEl = moduleEl.locator('[class*="badge"], [class*="Badge"], [class*="count"]').first();
          const badgeText = await badgeEl.textContent();
          if (badgeText) {
            const badgeMatch = badgeText.match(/(\d+)/);
            if (badgeMatch) {
              expectedLessonsCount = parseInt(badgeMatch[1], 10);
            }
          }
        } catch (e) {
          // Игнорируем
        }
      }
    } catch (e) {
      // Игнорируем ошибку
    }
    
    console.log(`\n📂 Модуль ${i + 1}/${moduleElements.length}: ${moduleTitle}`);
    if (expectedLessonsCount > 0) {
      console.log(`   🎯 Ожидаем: ${expectedLessonsCount} уроков`);
    }
    
    // Кликаем чтобы раскрыть модуль
    const summary = moduleEl.locator('.MuiAccordionSummary-root').first();
    try {
      await summary.click();
      await page.waitForTimeout(2000);
    } catch (e) {
      console.log('   ⚠️ Не удалось раскрыть модуль');
      continue;
    }
    
    // ВАЖНО: Используем scrollIntoView для последнего видимого урока
    const details = moduleEl.locator('.MuiAccordionDetails-root').first();
    
    try {
      let previousLinkCount = 0;
      let iteration = 0;
      const maxIterations = 30;
      let noChangeCount = 0;
      
      console.log('   🔄 Начинаю прокрутку через scrollIntoView...');
      
      while (iteration < maxIterations) {
        // Получаем все ссылки на уроки внутри модуля
        const lessonLinks = await details.locator('a[href*="lesson"]').all();
        const currentLinkCount = lessonLinks.length;
        
        iteration++;
        
        // Логируем каждую итерацию
        console.log(`   📊 Итерация ${iteration}: найдено ${currentLinkCount} уроков, скроллим к последнему...`);
        
        // Если достигли ожидаемого количества
        if (expectedLessonsCount > 0 && currentLinkCount >= expectedLessonsCount) {
          console.log(`   ✅ Найдено ${currentLinkCount} уроков (ожидалось ${expectedLessonsCount})`);
          break;
        }
        
        // Если количество не изменилось
        if (currentLinkCount === previousLinkCount) {
          noChangeCount++;
          if (noChangeCount >= 3) {
            console.log(`   ⚠️ Количество не меняется (${currentLinkCount}), возможно все загружено`);
            break;
          }
        } else {
          noChangeCount = 0; // Сбрасываем счетчик при изменении
        }
        
        // Если нет ссылок, выходим
        if (lessonLinks.length === 0) {
          console.log('   ⚠️ Ссылки на уроки не найдены');
          break;
        }
        
        // Находим последний элемент и прокручиваем к нему
        const lastLink = lessonLinks[lessonLinks.length - 1];
        
        try {
          // Прокручиваем последний урок в поле зрения
          await lastLink.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000); // Ждем подгрузки новых уроков
        } catch (e) {
          console.log(`   ⚠️ Ошибка при прокрутке к последнему уроку: ${e}`);
          // Пробуем альтернативный способ
          try {
            await lastLink.evaluate((el: any) => {
              el.scrollIntoView({ behavior: 'smooth', block: 'end' });
            });
            await page.waitForTimeout(1000);
          } catch (e2) {
            console.log(`   ⚠️ Альтернативная прокрутка тоже не сработала`);
            break;
          }
        }
        
        previousLinkCount = currentLinkCount;
      }
      
      // Финальная проверка и небольшая задержка
      await page.waitForTimeout(1000);
      
      // Финальный подсчет
      const finalLinkCount = await details.locator('a[href*="lesson"]').count();
      console.log(`   ✅ Финальный подсчет: найдено ${finalLinkCount} уроков`);
      if (expectedLessonsCount > 0) {
        console.log(`   📊 Ожидаем: ${expectedLessonsCount}, найдено: ${finalLinkCount}`);
      }
      
    } catch (e) {
      console.log('   ⚠️ Ошибка при прокрутке модуля:', e);
    }
    
    // Теперь собираем ВСЕ уроки из раскрытого модуля
    const lessonLinks = await details.locator('a[href*="lesson"]').all();
    console.log(`   📝 Найдено ссылок на уроки: ${lessonLinks.length}`);
    
    // ВЫВОДИМ ВСЕ НАЙДЕННЫЕ ССЫЛКИ ПЕРЕД ФИЛЬТРАЦИЕЙ
    console.log(`   📋 Все найденные ссылки (до фильтрации):`);
    const allLinksBeforeFilter: any[] = [];
    for (let j = 0; j < lessonLinks.length; j++) {
      try {
        const link = lessonLinks[j];
        const lessonTitle = await link.textContent() || '';
        const lessonUrl = await link.getAttribute('href') || '';
        allLinksBeforeFilter.push({ title: lessonTitle.trim(), url: lessonUrl });
        console.log(`      ${j + 1}. "${lessonTitle.trim()}" -> ${lessonUrl}`);
      } catch (e) {
        console.log(`      ${j + 1}. [Ошибка чтения ссылки]`);
      }
    }
    
    const lessons: any[] = [];
    const seenTitles = new Set<string>();
    
    for (let j = 0; j < lessonLinks.length; j++) {
      try {
        const link = lessonLinks[j];
        const lessonTitle = await link.textContent() || '';
        const lessonUrl = await link.getAttribute('href') || '';
        
        // Фильтруем служебные уроки
        const trimmedTitle = lessonTitle.trim();
        
        if (
          !trimmedTitle ||
          trimmedTitle === 'Урок' ||
          /^Урок\s*\d+$/.test(trimmedTitle) ||
          trimmedTitle.includes('Копировать') ||
          trimmedTitle.includes('другого курса') ||
          trimmedTitle.length < 3 ||
          trimmedTitle === 'Поддержка' ||
          trimmedTitle === 'Уроки' ||
          trimmedTitle === 'Темы и уроки курса' ||
          trimmedTitle === 'Правила открытия уроков' ||
          trimmedTitle === 'Удаленные уроки'
        ) {
          continue;
        }
        
        // Пропускаем дубликаты
        if (seenTitles.has(trimmedTitle)) {
          console.log(`   ⚠️ Пропущен дубликат: "${trimmedTitle}"`);
          continue;
        }
        seenTitles.add(trimmedTitle);
        
        lessons.push({
          title: trimmedTitle,
          order_index: lessons.length,
          url: lessonUrl,
          materials: [],
          has_homework: false
        });
      } catch (e) {
        // Пропускаем проблемные ссылки
        console.log(`   ⚠️ Ошибка обработки ссылки ${j + 1}: ${e}`);
        continue;
      }
    }
    
    console.log(`   ✅ Реальных уроков после фильтрации: ${lessons.length}`);
    console.log(`   📊 Отфильтровано: ${lessonLinks.length - lessons.length} служебных/дубликатов`);
    
    modules.push({
      title: moduleTitle,
      order_index: i,
      lessons: lessons
    });
    
    // Закрываем модуль перед переходом к следующему (опционально)
    try {
      await summary.click();
      await page.waitForTimeout(500);
    } catch (e) {
      // Игнорируем ошибку
    }
  }
  
  // ШАГ 5: Парсим содержимое каждого урока
  console.log('\n\n🎬 Парсинг содержимого уроков...\n');
  
  let totalProcessed = 0;
  const totalLessons = modules.reduce((sum: number, m: any) => sum + m.lessons.length, 0);
  
  for (const module of modules) {
    console.log(`\n📂 ${module.title} (${module.lessons.length} уроков)`);
    
    for (const lesson of module.lessons) {
      totalProcessed++;
      
      try {
        const fullUrl = lesson.url.startsWith('http') 
          ? lesson.url 
          : `https://antitreningi.ru${lesson.url}`;
        
        await page.goto(fullUrl, {
          timeout: 120000,
          waitUntil: 'domcontentloaded'
        });
        await page.waitForTimeout(2000);
        
        // Видео Kinescope
        const videoIframe = await page.locator('iframe[src*="kinescope"]').first();
        const isVideoVisible = await videoIframe.isVisible().catch(() => false);
        
        if (isVideoVisible) {
          const videoSrc = await videoIframe.getAttribute('src');
          if (videoSrc) {
            lesson.video_url = videoSrc;
            const match = videoSrc.match(/embed\/([a-f0-9-]+)/);
            if (match) {
              lesson.video_id = match[1];
            }
          }
        } else {
          // Ищем в HTML
          const html = await page.content();
          const embedMatch = html.match(/kinescope\.io\/embed\/([a-f0-9_-]+)/);
          if (embedMatch) {
            lesson.video_id = embedMatch[1];
            lesson.video_url = `https://kinescope.io/embed/${lesson.video_id}`;
          }
        }
        
        // Домашнее задание
        const hwSelectors = [
          'textarea[placeholder*="ответ"]',
          'input[placeholder*="ответ"]',
          '[class*="homework"]'
        ];
        
        for (const selector of hwSelectors) {
          try {
            const hwField = await page.locator(selector).first();
            const isVisible = await hwField.isVisible().catch(() => false);
            if (isVisible) {
              lesson.has_homework = true;
              break;
            }
          } catch (e) {
            // Продолжаем поиск
          }
        }
        
        // Материалы
        const materialLinks = await page.locator('a[href*="drive.google"], a[href*=".pdf"], a[href*="storage"], a[href*="filestorage"], a[href*="docs.google"]').all();
        
        for (const matLink of materialLinks) {
          try {
            const matUrl = await matLink.getAttribute('href');
            const matTitle = await matLink.textContent();
            
            if (matUrl && (matUrl.includes('drive.google') || matUrl.includes('.pdf') || matUrl.includes('storage'))) {
              let matType: string = 'link';
              if (matUrl.includes('.pdf')) matType = 'pdf';
              else if (matUrl.includes('docs.google.com') || matUrl.includes('sheets.google.com')) matType = 'sheet';
              else if (matUrl.includes('storage') || matUrl.includes('filestorage')) matType = 'file';
              
              lesson.materials.push({
                type: matType,
                title: matTitle?.trim() || 'Материал',
                url: matUrl
              });
            }
          } catch (e) {
            // Пропускаем проблемные ссылки
          }
        }
        
        if (totalProcessed % 10 === 0) {
          console.log(`   📊 Обработано: ${totalProcessed}/${totalLessons}`);
        }
        
        console.log(`   ✅ ${lesson.title.substring(0, 50)} | video: ${lesson.video_id ? '✓' : '✗'} | hw: ${lesson.has_homework ? '✓' : '✗'} | mat: ${lesson.materials.length}`);
        
      } catch (err) {
        console.log(`   ❌ ${lesson.title.substring(0, 50)} — ошибка: ${err}`);
      }
    }
  }
  
  // Сохраняем результат
  result.modules = modules;
  
  fs.writeFileSync('scripts/mlm-camp-full.json', JSON.stringify(result, null, 2));
  
  console.log('\n\n✅ ГОТОВО!');
  console.log(`📦 Модулей: ${modules.length}`);
  console.log(`📝 Уроков: ${totalLessons}`);
  console.log('💾 Сохранено в scripts/mlm-camp-full.json');
  
  // Статистика по модулям
  console.log('\n📊 Статистика по модулям:');
  modules.forEach((m: any, i: number) => {
    const withVideo = m.lessons.filter((l: any) => l.video_id).length;
    const withHW = m.lessons.filter((l: any) => l.has_homework).length;
    console.log(`   ${i + 1}. ${m.title}: ${m.lessons.length} уроков (видео: ${withVideo}, ДЗ: ${withHW})`);
  });
  
  const totalWithVideo = modules.reduce((sum: number, m: any) => sum + m.lessons.filter((l: any) => l.video_id).length, 0);
  const totalWithMaterials = modules.reduce((sum: number, m: any) => sum + m.lessons.filter((l: any) => l.materials.length > 0).length, 0);
  const totalWithHomework = modules.reduce((sum: number, m: any) => sum + m.lessons.filter((l: any) => l.has_homework).length, 0);
  
  console.log(`\n📊 Общая статистика:`);
  console.log(`   С видео: ${totalWithVideo}`);
  console.log(`   С материалами: ${totalWithMaterials}`);
  console.log(`   С ДЗ: ${totalWithHomework}`);
  
  console.log('\n⏸️ Нажмите Enter для закрытия браузера...');
  await new Promise(resolve => {
    process.stdin.once('data', () => resolve(null));
  });
  
  await browser.close();
}

parseFullCourse().catch(console.error);
