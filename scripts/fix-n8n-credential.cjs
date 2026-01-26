const { chromium } = require('playwright');
const fs = require('fs');

const N8N_URL = 'https://n8n.iferma.pro';
const EMAIL = 'levbekk@bk.ru';
const PASSWORD = 'Sibbek199031';
const CREDENTIAL_NAME = 'Vertex AI Pro Account';

// Правильный приватный ключ из JSON файла
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
  console.log('🚀 Запуск автоматизации n8n...');
  
  const browser = await chromium.launch({ headless: false }); // headless: false для видимого браузера
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Шаг 1: Вход
    console.log('📝 Вход в n8n...');
    await page.goto(`${N8N_URL}/login`);
    
    // Ждём загрузки страницы
    await page.waitForTimeout(2000);
    
    // Пробуем разные селекторы для email
    const emailSelectors = [
      'input[name="email"]',
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[id*="email" i]'
    ];
    
    let emailField = null;
    for (const selector of emailSelectors) {
      try {
        emailField = await page.$(selector);
        if (emailField) {
          console.log(`✅ Найдено поле email: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    if (!emailField) {
      // Пробуем найти все input и выбрать нужный
      const inputs = await page.$$('input');
      for (const input of inputs) {
        const type = await input.getAttribute('type');
        const name = await input.getAttribute('name');
        if (type === 'email' || name === 'email') {
          emailField = input;
          break;
        }
      }
    }
    
    if (emailField) {
      await emailField.fill(EMAIL);
    } else {
      throw new Error('Поле email не найдено');
    }
    
    // Пробуем разные селекторы для password
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[placeholder*="password" i]',
      'input[id*="password" i]'
    ];
    
    let passwordField = null;
    for (const selector of passwordSelectors) {
      try {
        passwordField = await page.$(selector);
        if (passwordField) {
          console.log(`✅ Найдено поле password: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    if (!passwordField) {
      const inputs = await page.$$('input[type="password"]');
      if (inputs.length > 0) {
        passwordField = inputs[0];
      }
    }
    
    if (passwordField) {
      await passwordField.fill(PASSWORD);
    } else {
      throw new Error('Поле password не найдено');
    }
    
    // Ищем кнопку входа
    const loginButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Войти")',
      'form button'
    ];
    
    let loginButton = null;
    for (const selector of loginButtonSelectors) {
      try {
        loginButton = await page.$(selector);
        if (loginButton) {
          console.log(`✅ Найдена кнопка входа: ${selector}`);
          break;
        }
      } catch (e) {}
    }
    
    if (loginButton) {
      await loginButton.click();
    } else {
      // Пробуем Enter
      await passwordField.press('Enter');
    }
    
    console.log('⏳ Ожидание загрузки после входа...');
    await page.waitForTimeout(5000);
    
    // Проверяем, что мы залогинились (URL изменился или появился контент)
    const currentUrl = page.url();
    console.log(`Текущий URL: ${currentUrl}`);
    
    // Шаг 2: Переход к Credentials
    console.log('🔑 Переход к Credentials...');
    await page.goto(`${N8N_URL}/credentials`);
    await page.waitForTimeout(3000);
    
    // Шаг 3: Поиск credential
    console.log(`🔍 Поиск credential '${CREDENTIAL_NAME}'...`);
    
    // Ждём загрузки списка credentials
    await page.waitForTimeout(3000);
    
    // Пробуем найти через поиск
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="Search" i]',
      'input[placeholder*="search" i]',
      'input[class*="search" i]'
    ];
    
    for (const selector of searchSelectors) {
      try {
        const searchInput = await page.$(selector);
        if (searchInput) {
          console.log(`✅ Найдено поле поиска: ${selector}`);
          await searchInput.fill(CREDENTIAL_NAME);
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {}
    }
    
    // Ищем credential по имени
    let found = false;
    await page.waitForTimeout(2000);
    
    // Пробуем найти все кликабельные элементы с текстом
    const allClickable = await page.$$('a, button, [role="button"], tr, [class*="credential" i], [data-test-id*="credential" i]');
    
    for (const element of allClickable) {
      try {
        const text = await element.textContent();
        if (text && text.includes(CREDENTIAL_NAME)) {
          console.log(`✅ Найден credential: "${text.trim()}"`);
          await element.click();
          found = true;
          await page.waitForTimeout(3000);
          break;
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    if (!found) {
      console.log('⚠️  Credential не найден автоматически');
      console.log('Попробуй найти его вручную в открытом браузере');
      console.log('URL:', page.url());
      console.log('Ожидание 60 секунд для ручного поиска...');
      await page.waitForTimeout(60000);
    }
    
    // Шаг 4: Редактирование приватного ключа
    console.log('✏️ Редактирование credential...');
    
    // Ждём загрузки формы редактирования
    await page.waitForTimeout(3000);
    
    // Ищем поле privateKey (может быть textarea или input)
    const privateKeySelectors = [
      'textarea[name="privateKey"]',
      'textarea[data-test-id*="privateKey" i]',
      'textarea[placeholder*="private" i]',
      'textarea[id*="private" i]',
      'textarea[class*="private" i]',
      'input[name="privateKey"]',
      'input[data-test-id*="privateKey" i]',
      'textarea' // Последний вариант - любой textarea
    ];
    
    let privateKeyField = null;
    for (const selector of privateKeySelectors) {
      try {
        privateKeyField = await page.$(selector);
        if (privateKeyField) {
          const placeholder = await privateKeyField.getAttribute('placeholder') || '';
          const name = await privateKeyField.getAttribute('name') || '';
          if (placeholder.toLowerCase().includes('private') || name.toLowerCase().includes('private') || selector === 'textarea') {
            console.log(`✅ Найдено поле privateKey: ${selector}`);
            break;
          }
        }
      } catch (e) {}
    }
    
    // Если не нашли, ищем все textarea и выбираем самый большой
    if (!privateKeyField) {
      const textareas = await page.$$('textarea');
      if (textareas.length > 0) {
        // Выбираем самый большой textarea (обычно это поле для ключа)
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
    }
    
    if (privateKeyField) {
      console.log('✅ Найдено поле privateKey');
      
      // Очищаем поле и вставляем правильный ключ
      await privateKeyField.click();
      await privateKeyField.fill('');
      await privateKeyField.fill(PRIVATE_KEY);
      
      console.log('✅ Приватный ключ вставлен');
      
      // Ищем поле email и проверяем его
      const emailField = await page.$('input[name="email"]');
      if (emailField) {
        const emailValue = await emailField.inputValue();
        if (!emailValue || emailValue !== 'imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com') {
          await emailField.fill('imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com');
          console.log('✅ Email обновлён');
        }
      }
      
      // Ищем поле region
      const regionField = await page.$('select[name="region"], input[name="region"]');
      if (regionField) {
        await regionField.selectOption('us-central1').catch(() => {
          regionField.fill('us-central1');
        });
        console.log('✅ Region установлен');
      }
      
      // Ищем кнопку сохранения
      console.log('💾 Сохранение credential...');
      const saveButton = await page.$('button:has-text("Save"), button[type="submit"], button[data-test-id*="save"]');
      
      if (saveButton) {
        await saveButton.click();
        console.log('✅ Credential сохранён!');
        await page.waitForTimeout(3000);
      } else {
        console.log('⚠️  Кнопка сохранения не найдена автоматически');
        console.log('Нажми "Save" вручную в браузере');
        await page.waitForTimeout(30000);
      }
    } else {
      console.log('❌ Поле privateKey не найдено');
      console.log('Попробуй найти его вручную в открытом браузере');
      console.log('URL:', page.url());
      await page.waitForTimeout(60000);
    }
    
    console.log('✅ Готово!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
    console.log('\nОткрой браузер вручную и исправь credential:');
    console.log(`1. Зайди на ${N8N_URL}/login`);
    console.log(`2. Войди с email: ${EMAIL}`);
    console.log(`3. Перейди в Credentials`);
    console.log(`4. Найди "${CREDENTIAL_NAME}"`);
    console.log('5. Открой JSON файл сервисного аккаунта');
    console.log('6. Скопируй поле "private_key" (весь блок)');
    console.log('7. Вставь в поле privateKey');
    console.log('8. Сохрани');
  } finally {
    // Не закрываем браузер сразу, чтобы пользователь мог проверить
    console.log('\nБраузер останется открытым для проверки...');
    await page.waitForTimeout(10000);
    // await browser.close();
  }
}

fixCredential().catch(console.error);
