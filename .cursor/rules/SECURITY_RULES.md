# 🔒 ПРАВИЛА БЕЗОПАСНОСТИ | 2026

> **КРИТИЧЕСКИ ВАЖНО:** Эти правила обязательны для всех агентов!

---

## 🚨 КРИТИЧЕСКИЕ ПРАВИЛА

### 1. НИКОГДА НЕ ЛОГИРОВАТЬ СЕКРЕТЫ

**ЗАПРЕЩЕНО:**
```typescript
// ❌ НИКОГДА ТАК НЕ ДЕЛАЙ!
console.log('URL:', supabaseUrl)
console.log('Key:', supabaseAnonKey)
console.log('Key prefix:', supabaseAnonKey?.substring(0, 30))
console.log('Token:', accessToken)
```

**ПОЧЕМУ:** В продакшене эти логи видны всем в консоли браузера!

**РАЗРЕШЕНО:**
```typescript
// ✅ Только в dev режиме, без секретов
if (import.meta.env.DEV) {
  console.log('Supabase configured:', !!supabaseUrl)
  console.log('Environment:', import.meta.env.MODE)
}

// ✅ Или использовать специальную библиотеку логирования
import { logger } from '@/lib/logger'
logger.debug('Supabase initialized', { hasUrl: !!supabaseUrl })
```

---

### 2. ВАЛИДАЦИЯ ENV ПЕРЕМЕННЫХ

**ОБЯЗАТЕЛЬНО:** Проверять наличие обязательных переменных при старте приложения.

**Создай файл:** `src/lib/env.ts`

```typescript
/**
 * Валидация переменных окружения
 * Выбрасывает ошибку если отсутствуют обязательные переменные
 */

interface EnvConfig {
  VITE_SUPABASE_URL: string
  VITE_SUPABASE_ANON_KEY: string
  VITE_TELEGRAM_BOT_USERNAME?: string
  VITE_META_APP_ID?: string
}

function validateEnv(): EnvConfig {
  const required: (keyof EnvConfig)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
  ]

  const config: Partial<EnvConfig> = {}

  for (const key of required) {
    const value = import.meta.env[key]
    if (!value) {
      throw new Error(
        `❌ Missing required environment variable: ${key}\n` +
        `Please check your .env.local file.`
      )
    }
    config[key] = value
  }

  // Опциональные переменные
  config.VITE_TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME
  config.VITE_META_APP_ID = import.meta.env.VITE_META_APP_ID

  return config as EnvConfig
}

export const env = validateEnv()
```

**Использование:**
```typescript
import { env } from '@/lib/env'

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
```

---

### 3. НЕТ ХАРДКОДА В КОДЕ

**ЗАПРЕЩЕНО:**
```typescript
// ❌ НИКОГДА не хардкодить URL, ключи, токены
const supabase = createClient(
  supabaseUrl || 'https://debcwvxlvozjlqkhnauy.supabase.co', // ❌
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // ❌
)
```

**РАЗРЕШЕНО:**
```typescript
// ✅ Выбрасывать ошибку если env переменные отсутствуют
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Check .env.local')
}
const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

### 4. RLS ВСЕГДА ВКЛЮЧЕН

**Правило:** Каждая таблица ДОЛЖНА иметь RLS политики!

**Шаблон:**
```sql
-- Включить RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Политика для SELECT (чтение своих данных)
CREATE POLICY "Users can read own data" ON table_name
  FOR SELECT USING (user_id = auth.uid());

-- Политика для INSERT (создание своих данных)
CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Политика для UPDATE (обновление своих данных)
CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (user_id = auth.uid());

-- Политика для DELETE (удаление своих данных)
CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (user_id = auth.uid());
```

**Проверка:** После каждой миграции проверяй что RLS включен!

---

### 5. СЕКРЕТЫ В SUPABASE SECRETS

**Правило:** Все секретные ключи хранятся в Supabase Secrets, НЕ в коде!

**Секреты для Edge Functions:**
```bash
# Установить секрет
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
supabase secrets set META_APP_SECRET=xxx
supabase secrets set INSTAGRAM_ACCESS_TOKEN=xxx
```

**Использование в Edge Functions:**
```typescript
// ✅ Правильно
const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
if (!token) {
  throw new Error('Missing TELEGRAM_BOT_TOKEN')
}
```

**НЕ ДЕЛАЙ:**
```typescript
// ❌ НИКОГДА не хардкодить секреты
const token = '123456:ABC-DEF...' // ❌
```

---

### 6. ПУБЛИЧНЫЕ КЛЮЧИ VS СЕКРЕТНЫЕ

**Публичные ключи (можно в коде):**
- `VITE_SUPABASE_ANON_KEY` - публичный ключ, безопасен для фронтенда
- `VITE_META_APP_ID` - публичный ID приложения

**Секретные ключи (НИКОГДА в коде):**
- `SUPABASE_SERVICE_ROLE_KEY` - только в Edge Functions через Deno.env
- `TELEGRAM_BOT_TOKEN` - только в Edge Functions через Supabase Secrets
- `META_APP_SECRET` - только в Edge Functions через Supabase Secrets
- `INSTAGRAM_ACCESS_TOKEN` - только в Edge Functions через Supabase Secrets

---

### 7. ПРОВЕРКА ПЕРЕД КОММИТОМ

**Чеклист безопасности:**

1. [ ] Нет `console.log` с секретами или конфигурацией
2. [ ] Нет хардкода URL, ключей, токенов
3. [ ] Все env переменные валидируются при старте
4. [ ] RLS политики настроены для всех таблиц
5. [ ] Секреты используются только через `Deno.env.get()` в Edge Functions
6. [ ] Проверено что `.env.local` в `.gitignore`

---

## 🔍 АВТОМАТИЧЕСКАЯ ПРОВЕРКА

**Создай скрипт:** `scripts/check-security.ts`

```typescript
#!/usr/bin/env tsx

import { readFileSync } from 'fs'
import { glob } from 'glob'

const forbiddenPatterns = [
  /console\.log\(['"](URL|Key|Token|Secret|Password)/i,
  /https:\/\/.*\.supabase\.co['"]/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9/,
  /['"]\|\| ['"]https:\/\//,
]

const files = glob.sync('src/**/*.{ts,tsx}')

let foundIssues = false

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      console.error(`❌ Security issue found in ${file}`)
      foundIssues = true
    }
  }
}

if (foundIssues) {
  console.error('\n❌ Security check failed! Fix issues before committing.')
  process.exit(1)
} else {
  console.log('✅ Security check passed!')
}
```

**Добавь в package.json:**
```json
{
  "scripts": {
    "check:security": "tsx scripts/check-security.ts"
  }
}
```

---

## 📚 РЕСУРСЫ

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [React Security Best Practices](https://react.dev/learn/escape-hatches)

---

**ПОМНИ:** Безопасность — это не опция, это обязательство!
