const { chromium } = require('playwright');

const N8N_URL = 'https://n8n.iferma.pro';
const EMAIL = 'levbekk@bk.ru';
const PASSWORD = 'Sibbek199031';
const CREDENTIAL_NAME = 'Vertex AI Pro Account';

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDpYeKVdAHODumy
NTrrwOd064a7hEvK5GHXFdFCjl1DuLKHK4/HooFzedTl2o4qX2NM3/Y3cK2cjAPp
ljmw+COfBP7PczScaRpInm/RodNiP1CQFk6giNPKVyVt6pRaRYypWgsSxRIqg2w1
xzBz/t+RZRyrRgbqNaOcbmMlDWE/A4I5wbSxsMebsgaF/o+pSTOIueQC+3EHwmtf
GN7xuoy52KUKUHfJGvUvYX4fI7jGZVSSCn8N1Ph5YYssFlZGsdSIgZaeh219Egfz
yauH6BwqyYwx+GHtGyAn6xNdd6GYs2iOck3+SObrawQlN7z2/+OUrVcVZFHyBYCw
JFOhx223AgMBAAECggEAHeNcSjmOFZ6RTTJF9nVA7xdOrOsXbcdrxEjWAMkMpqSb
sHXitvVX0LsUic9Aj6qho/G2rYjvovHHen2zq7dLkIzqORUO8sz/AbfQqC8qTBXB
soI41ZRQU0Rv1bDKCPmJNxMCAghc+DbWf9ifmutUJGGnl0OjlREDgAAfEFqzTodc
18wl9TLiwxUSh1aT+m6pt3+7fdth9bKa9NEGsoLQkRKv1e1qKyS6sqUDx9rrBCtv
gzb9DhXkEqdGjSHJS6iAdk4bAx4IeyBrHOEn6nNk5HNCP11FsayK2CtTeNd91ou0
AjW0P79BSaOBiOxJsVvvGqHNNHv1zwukONHPEj210QKBgQD+2iWrffE3lJJZ0zhz
WuOSIzHOPK0u+6bZ0rCY7p+huuLJIBm0dGzQbBML7sBY3Nqzw+eQQ+45qXN0GKs8
d0PiNjJb7lP8fvQR+25SX+8t8D2AxWFxLreoWQnDf1IAKheBKx/ZKSR+7awsnLF4
yYpgsd/x4mXODOdPHAY90F2cGQKBgQDqbvuLQBswzYLgsOj22ZY3CFXhM89wGi6k
gfIgBXAq5nW5fYdv1LLYf1uMfEE/TaodkUU9JSIgjaOwwtKkB649g41hwQlUtnjJ
jPuj9UTuHIdjGOhojj/yxNcDbPTmFw2JM6BX7w2e1hmElhpk0zdVue7cTJxKhXN/
nj48vI6STwKBgE4yh254ZWRlfQZ8zgxvLfawP98FNSp+YvLhN/ik92w7mMyXweth
8eV909ZMes6Jbb3M9aeJgHZG7TsJOrmB6t1lPcyBc1m9ZoyB9pbmAtC4r1Zsufpt
mELalylaTsHoKHAk2E/c1OrxaGwD5FyokoIa8hkZG52+zdazRaL/5Uk5AoGAOUxa
6tQGUU1JmcVji0HvNxAwfVR+dPXRRKAGH9F0cufVCjsmKS0hcUzfgVy1TdWbqJJj
C+jRiIdV5NQZS8Ic0igfHC9kKnJW31w3/QDrkg8jABOMalGqS5nUu5+b08j6o/gc
TqG9AH9vyTouxUnikm9ZdDq9UHGBo0V4DLxBVH0CgYBX0zjbyiJB+bheNd3Aw65y
KA4igV/clyyO2NkPMLCTpQw2+RMj3fCW3Z1eSojMH4G1IgAZbsDlLaov4y7wTmcZ
awopS37qyuGXoz8wtXv6BBEUtrvZ9tEtDIOsdWIEIkdvmjTWIxyBxfzMG8rpYSgW
S7L0bJeMgOQyw1T2zncr4w==
-----END PRIVATE KEY-----`;

async function fixCredential() {
  console.log('🚀 Запуск автоматизации n8n...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Замедляем действия для надёжности
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Шаг 1: Вход
    console.log('📝 Шаг 1: Открываю страницу логина...');
    await page.goto(`${N8N_URL}/login`, { waitUntil: 'domcontentloaded' });
    
    // Ждём полной загрузки страницы (включая JS)
    console.log('⏳ Ожидание загрузки страницы (может занять до 30 секунд)...');
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {
      console.log('⚠️  networkidle timeout, продолжаю...');
    });
    await page.waitForTimeout(8000); // Дополнительная задержка для JS
    
    console.log('📝 Шаг 2: Ищу поля для входа...');
    
    // Ищем все input поля
    let allInputs = await page.$$('input');
    
    // Делаем скриншот для отладки
    try {
      await page.screenshot({ path: '/tmp/n8n-login.png' });
      console.log('📸 Скриншот сохранён: /tmp/n8n-login.png');
    } catch (e) {
      console.log('⚠️  Не удалось сделать скриншот');
    }
    
    // Проверяем HTML страницы для отладки
    const pageContent = await page.content();
    console.log(`📄 Длина HTML: ${pageContent.length} символов`);
    console.log(`📄 Содержит "input": ${pageContent.includes('<input')}`);
    console.log(`📄 Содержит "email": ${pageContent.toLowerCase().includes('email')}`);
    
    // Если не нашли, пробуем через evaluate
    if (allInputs.length === 0) {
      console.log('⏳ Пробую найти через evaluate...');
      const inputsCount = await page.evaluate(() => document.querySelectorAll('input').length);
      console.log(`Найдено через evaluate: ${inputsCount} input полей`);
      
      if (inputsCount > 0) {
        await page.waitForTimeout(2000);
        allInputs = await page.$$('input');
      }
    }
    
    // Если всё ещё не нашли, ждём и пробуем ещё раз
    if (allInputs.length === 0) {
      console.log('⏳ Input поля не найдены, жду ещё 10 секунд...');
      await page.waitForTimeout(10000);
      allInputs = await page.$$('input');
    }
    
    console.log(`Найдено ${allInputs.length} input полей`);
    
    if (allInputs.length === 0) {
      // Сохраняем HTML для анализа
      const fs = require('fs');
      fs.writeFileSync('/tmp/n8n-page.html', pageContent);
      console.log('💾 HTML сохранён в /tmp/n8n-page.html для анализа');
      throw new Error('Input поля не найдены на странице. Проверь /tmp/n8n-page.html');
    }
    
    let emailField = null;
    let passwordField = null;
    
    // Анализируем все input поля
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      try {
        const type = await input.getAttribute('type') || '';
        const name = await input.getAttribute('name') || '';
        const id = await input.getAttribute('id') || '';
        const placeholder = await input.getAttribute('placeholder') || '';
        
        console.log(`Input ${i}: type=${type}, name=${name}, id=${id}`);
        
        if (type === 'email' || name.toLowerCase().includes('email') || id.toLowerCase().includes('email') || placeholder.toLowerCase().includes('email')) {
          emailField = input;
          console.log(`✅ Найдено поле email (input ${i})`);
        }
        
        if (type === 'password' || name.toLowerCase().includes('password') || id.toLowerCase().includes('password') || placeholder.toLowerCase().includes('password')) {
          passwordField = input;
          console.log(`✅ Найдено поле password (input ${i})`);
        }
      } catch (e) {
        console.log(`⚠️  Ошибка при анализе input ${i}: ${e.message}`);
      }
    }
    
    // Если не нашли по атрибутам, пробуем по порядку
    if (!emailField && allInputs.length >= 1) {
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type');
        if (type !== 'password' && type !== 'checkbox' && type !== 'hidden') {
          emailField = allInputs[i];
          console.log(`✅ Использую input ${i} как email`);
          break;
        }
      }
    }
    
    if (!passwordField && allInputs.length >= 2) {
      for (let i = 0; i < allInputs.length; i++) {
        const type = await allInputs[i].getAttribute('type');
        if (type === 'password') {
          passwordField = allInputs[i];
          console.log(`✅ Использую input ${i} как password`);
          break;
        }
      }
      // Если не нашли password, берём последний не-email input
      if (!passwordField) {
        for (let i = allInputs.length - 1; i >= 0; i--) {
          const type = await allInputs[i].getAttribute('type');
          if (type !== 'checkbox' && type !== 'hidden' && allInputs[i] !== emailField) {
            passwordField = allInputs[i];
            console.log(`✅ Использую input ${i} как password (последний доступный)`);
            break;
          }
        }
      }
    }
    
    if (!emailField) {
      throw new Error('Поле email не найдено');
    }
    
    if (!passwordField) {
      throw new Error('Поле password не найдено');
    }
    
    // Заполняем поля
    await emailField.click();
    await emailField.fill(EMAIL);
    console.log('✅ Email введён');
    await page.waitForTimeout(500);
    
    await passwordField.click();
    await passwordField.fill(PASSWORD);
    console.log('✅ Password введён');
    await page.waitForTimeout(500);
    
    // Ищем кнопку входа
    console.log('📝 Шаг 3: Нажимаю кнопку входа...');
    const loginButton = await page.waitForSelector('button[type="submit"], form button', { timeout: 10000 });
    await loginButton.click();
    
    console.log('⏳ Ожидание загрузки после входа...');
    await page.waitForTimeout(5000);
    
    // Проверяем, что мы залогинились
    const currentUrl = page.url();
    console.log(`✅ Текущий URL: ${currentUrl}`);
    
    // Шаг 2: Переход к Credentials
    console.log('\n🔑 Шаг 4: Перехожу к Credentials...');
    await page.goto(`${N8N_URL}/credentials`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Шаг 3: Поиск credential
    console.log(`🔍 Шаг 5: Ищу credential '${CREDENTIAL_NAME}'...`);
    
    // Пробуем поиск
    try {
      const searchInput = await page.$('input[type="search"], input[placeholder*="Search" i]');
      if (searchInput) {
        await searchInput.fill(CREDENTIAL_NAME);
        await page.waitForTimeout(2000);
        console.log('✅ Поиск выполнен');
      }
    } catch (e) {
      console.log('⚠️  Поле поиска не найдено, продолжаю...');
    }
    
    await page.waitForTimeout(2000);
    
    // Ищем credential
    const allElements = await page.$$('*');
    let credentialElement = null;
    
    for (const element of allElements) {
      try {
        const text = await element.textContent();
        if (text && text.includes(CREDENTIAL_NAME)) {
          const tagName = await element.evaluate(el => el.tagName);
          const isClickable = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.cursor === 'pointer' || el.onclick !== null || 
                   el.tagName === 'A' || el.tagName === 'BUTTON' || 
                   el.getAttribute('role') === 'button';
          });
          
          if (isClickable || tagName === 'TR' || tagName === 'TD') {
            credentialElement = element;
            console.log(`✅ Найден credential: "${text.trim().substring(0, 50)}..."`);
            break;
          }
        }
      } catch (e) {}
    }
    
    if (credentialElement) {
      await credentialElement.click();
      console.log('✅ Credential открыт');
      await page.waitForTimeout(3000);
    } else {
      throw new Error('Credential не найден');
    }
    
    // Шаг 4: Редактирование приватного ключа
    console.log('\n✏️ Шаг 6: Ищу поле privateKey...');
    
    // Ищем все textarea
    const textareas = await page.$$('textarea');
    let privateKeyField = null;
    
    for (const textarea of textareas) {
      const name = await textarea.getAttribute('name') || '';
      const placeholder = await textarea.getAttribute('placeholder') || '';
      const id = await textarea.getAttribute('id') || '';
      
      if (name.toLowerCase().includes('private') || 
          placeholder.toLowerCase().includes('private') ||
          id.toLowerCase().includes('private')) {
        privateKeyField = textarea;
        console.log('✅ Найдено поле privateKey');
        break;
      }
    }
    
    // Если не нашли по атрибутам, берём самый большой textarea
    if (!privateKeyField && textareas.length > 0) {
      let maxRows = 0;
      for (const textarea of textareas) {
        const rows = await textarea.getAttribute('rows');
        const rowsNum = rows ? parseInt(rows) : 0;
        if (rowsNum > maxRows) {
          maxRows = rowsNum;
          privateKeyField = textarea;
        }
      }
      if (privateKeyField) {
        console.log('✅ Найдено поле privateKey (самый большой textarea)');
      }
    }
    
    if (privateKeyField) {
      console.log('📝 Шаг 7: Очищаю и вставляю новый приватный ключ...');
      await privateKeyField.click();
      await privateKeyField.fill(''); // Очищаем
      await page.waitForTimeout(500);
      await privateKeyField.fill(PRIVATE_KEY); // Вставляем новый
      console.log('✅ Приватный ключ вставлен');
      
      // Проверяем email
      const emailField = await page.$('input[name="email"]');
      if (emailField) {
        const emailValue = await emailField.inputValue();
        if (emailValue !== 'imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com') {
          await emailField.fill('imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com');
          console.log('✅ Email обновлён');
        }
      }
      
      // Проверяем region
      const regionSelect = await page.$('select[name="region"]');
      if (regionSelect) {
        await regionSelect.selectOption('us-central1');
        console.log('✅ Region установлен');
      }
      
      // Сохраняем
      console.log('\n💾 Шаг 8: Сохраняю credential...');
      await page.waitForTimeout(1000);
      
      const saveButtons = await page.$$('button');
      for (const button of saveButtons) {
        const text = await button.textContent();
        if (text && (text.includes('Save') || text.includes('Сохранить') || text.includes('Update'))) {
          await button.click();
          console.log('✅ Credential сохранён!');
          await page.waitForTimeout(3000);
          break;
        }
      }
      
      // Пробуем через Enter или submit
      await privateKeyField.press('Control+Enter').catch(() => {});
      
    } else {
      throw new Error('Поле privateKey не найдено');
    }
    
    console.log('\n✅ Готово! Credential исправлен!');
    console.log('⏳ Браузер останется открытым для проверки...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('\n❌ Ошибка:', error.message);
    console.log('\n📋 Текущий URL:', page.url());
    console.log('⏳ Браузер останется открытым для ручного исправления...');
    await page.waitForTimeout(60000);
  } finally {
    // Не закрываем браузер сразу
    console.log('\n💡 Закрой браузер вручную когда закончишь');
  }
}

fixCredential().catch(console.error);
