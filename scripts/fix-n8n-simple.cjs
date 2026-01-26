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

(async () => {
  console.log('🚀 Запуск автоматизации n8n...\n');
  
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage();
  
  try {
    console.log('📝 Открываю страницу логина...');
    await page.goto(`${N8N_URL}/login`);
    await page.waitForTimeout(10000);
    
    console.log('📝 Ищу поля для входа...');
    const inputs = await page.$$('input');
    console.log(`Найдено ${inputs.length} input полей`);
    
    if (inputs.length < 2) {
      throw new Error(`Недостаточно input полей: ${inputs.length}`);
    }
    
    // Заполняем первое поле (email)
    await inputs[0].fill(EMAIL);
    console.log('✅ Email введён');
    await page.waitForTimeout(1000);
    
    // Заполняем второе поле (password)
    await inputs[1].fill(PASSWORD);
    console.log('✅ Password введён');
    await page.waitForTimeout(1000);
    
    // Ищем кнопку входа
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes('Sign') || text.includes('Login') || text.includes('Войти'))) {
        await btn.click();
        console.log('✅ Кнопка входа нажата');
        break;
      }
    }
    
    await page.waitForTimeout(8000);
    
    console.log('🔑 Перехожу к Credentials...');
    await page.goto(`${N8N_URL}/credentials`);
    await page.waitForTimeout(5000);
    
    console.log(`🔍 Ищу credential '${CREDENTIAL_NAME}'...`);
    const elements = await page.$$('*');
    for (const el of elements) {
      const text = await el.textContent().catch(() => '');
      if (text.includes(CREDENTIAL_NAME)) {
        await el.click();
        console.log('✅ Credential найден и открыт');
        await page.waitForTimeout(5000);
        break;
      }
    }
    
    console.log('✏️ Ищу поле privateKey...');
    const textareas = await page.$$('textarea');
    if (textareas.length > 0) {
      const textarea = textareas[0]; // Берём первый textarea
      await textarea.click();
      await textarea.fill('');
      await textarea.fill(PRIVATE_KEY);
      console.log('✅ Приватный ключ вставлен');
      
      // Ищем кнопку Save
      const saveBtns = await page.$$('button');
      for (const btn of saveBtns) {
        const text = await btn.textContent();
        if (text && (text.includes('Save') || text.includes('Сохранить'))) {
          await btn.click();
          console.log('✅ Credential сохранён!');
          break;
        }
      }
    }
    
    console.log('\n✅ Готово! Браузер останется открытым для проверки.');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await page.waitForTimeout(60000);
  }
})();
