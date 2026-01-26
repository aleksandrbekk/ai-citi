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
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    
    console.log('⏳ Ожидание загрузки...');
    await page.waitForURL('**/workflow**', { timeout: 15000 });
    
    // Шаг 2: Переход к Credentials
    console.log('🔑 Переход к Credentials...');
    await page.goto(`${N8N_URL}/credentials`);
    await page.waitForTimeout(3000);
    
    // Шаг 3: Поиск credential
    console.log(`🔍 Поиск credential '${CREDENTIAL_NAME}'...`);
    
    // Ждём загрузки списка credentials
    await page.waitForTimeout(2000);
    
    // Пробуем найти через поиск
    const searchInput = await page.$('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');
    if (searchInput) {
      await searchInput.fill(CREDENTIAL_NAME);
      await page.waitForTimeout(1000);
      console.log('✅ Поиск выполнен');
    }
    
    // Ищем credential по имени в ссылках и кнопках
    let found = false;
    
    // Пробуем разные селекторы
    const selectors = [
      `a:has-text("${CREDENTIAL_NAME}")`,
      `button:has-text("${CREDENTIAL_NAME}")`,
      `[data-test-id*="credential"]:has-text("${CREDENTIAL_NAME}")`,
      `tr:has-text("${CREDENTIAL_NAME}")`,
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✅ Найден credential через селектор: ${selector}`);
          await element.click();
          found = true;
          await page.waitForTimeout(2000);
          break;
        }
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    // Если не нашли через селекторы, ищем вручную
    if (!found) {
      const allLinks = await page.$$('a, button, [role="button"]');
      for (const link of allLinks) {
        try {
          const text = await link.textContent();
          if (text && text.trim().includes(CREDENTIAL_NAME)) {
            console.log('✅ Найден credential по тексту!');
            await link.click();
            found = true;
            await page.waitForTimeout(2000);
            break;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }
    }
    
    if (!found) {
      console.log('⚠️  Credential не найден автоматически');
      console.log('Попробуй найти его вручную в открытом браузере');
      console.log('URL:', page.url());
      await page.waitForTimeout(30000);
    }
    
    // Шаг 4: Редактирование приватного ключа
    console.log('✏️ Редактирование credential...');
    
    // Ждём загрузки формы редактирования
    await page.waitForTimeout(2000);
    
    // Ищем поле privateKey (может быть textarea или input)
    let privateKeyField = await page.$('textarea[name="privateKey"], textarea[data-test-id*="privateKey"], textarea[placeholder*="private"], textarea');
    
    if (!privateKeyField) {
      // Пробуем найти через input
      privateKeyField = await page.$('input[name="privateKey"], input[data-test-id*="privateKey"]');
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
