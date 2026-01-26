# 🔧 ФИНАЛЬНОЕ РЕШЕНИЕ: Исправление "Couldn't connect" в n8n

## 🎯 Главная проблема

Ошибка "Couldn't connect with these settings" возникает из-за **неправильного формата приватного ключа** - ключ должен иметь **реальные переносы строк**, а не `\n` как текст.

## ✅ РЕШЕНИЕ (пошагово):

### Шаг 1: Получи правильный ключ
```bash
cd /Users/aleksandrbekk/ai-citi/ai-citi
./scripts/get-private-key-for-n8n.sh
```

### Шаг 2: В n8n credential

1. **Открой** "Vertex AI Pro Account" credential
2. **Найди поле "Private Key"** (обычно большое textarea)
3. **ВАЖНО: Полностью очисти** старое значение:
   - Кликни в поле
   - Нажми Ctrl+A (или Cmd+A на Mac)
   - Нажми Delete
4. **Скопируй ВЕСЬ блок** из скрипта (от `-----BEGIN PRIVATE KEY-----` до `-----END PRIVATE KEY-----`)
5. **Вставь** (Ctrl+V или Cmd+V)
6. **Проверь визуально**, что каждая строка на новой строке (не всё в одну строку!)

### Шаг 3: Проверь другие поля

- **Region**: `us-central1` (или "Americas (Council Bluffs) - us-central1")
- **Service Account Email**: `imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com`
- **Toggle "Set up for use in HTTP Request node"**: должен быть **включен** (зелёный)

### Шаг 4: Сохрани и проверь

1. Нажми **"Save"**
2. Нажми **"Retry"** (кнопка рядом с ошибкой)
3. Должно показать **"Connection tested successfully"** ✅

## 🔍 Если всё ещё не работает:

### Проверь API в Google Cloud Console:

1. Зайди: https://console.cloud.google.com/apis/library
2. Проверь, что включены:
   - ✅ **Vertex AI API** (`aiplatform.googleapis.com`)
   - ✅ **Cloud Resource Manager API** (`cloudresourcemanager.googleapis.com`)

### Альтернативное решение (если credential не работает):

Используй **OAuth2** вместо Service Account, или используй **JWT node** для генерации токена перед HTTP Request.

## 📝 Формат ключа (правильный):

```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDpYeKVdAHODumy
NTrrwOd064a7hEvK5GHXFdFCjl1DuLKHK4/HooFzedTl2o4qX2NM3/Y3cK2cjAPp
...
-----END PRIVATE KEY-----
```

**Каждая строка должна быть на новой строке!**

## ✅ Что уже исправлено в workflow:

- ✅ URL: `gemini-1.5-flash-001:generateContent`
- ✅ JSON Body: `inlineData` (camelCase)
- ✅ MIME type: `audio/ogg`
- ✅ Workflow активирован

**Осталось только исправить формат приватного ключа в credential!**
