# ✅ ЧЕКЛИСТ: Настройка Vertex AI для n8n

## 📋 Что уже сделано:

- ✅ **Проект Google Cloud**: `gen-lang-client-0102901194`
- ✅ **Service Account**: `imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com`
- ✅ **Vertex AI API**: Включен
- ✅ **Cloud Resource Manager API**: Включен
- ✅ **Приватный ключ**: Получен из `/Users/aleksandrbekk/.config/gcloud/legacy_credentials/...`
- ✅ **Workflow в n8n**: Обновлен с правильным URL и JSON body

## ❓ Что нужно проверить/добавить:

### 1. **OAuth Consent Screen** (КРИТИЧНО!)

**Проверка:**
1. Зайди: https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0102901194
2. Если видишь "OAuth consent screen is not configured" → **настрой его!**

**Настройка (если не настроен):**
1. Выбери **"External"** (Внешний)
2. Заполни обязательные поля:
   - **App name**: `AI CITI Vertex AI`
   - **User support email**: `levbekk@bk.ru`
   - **Developer contact information**: `levbekk@bk.ru`
3. Нажми **"Save and Continue"** до конца
4. **Не нужно** добавлять scopes или тестировать пользователей

**Важно:** OAuth Consent Screen нужен **даже для Service Account** в n8n!

---

### 2. **Роль Service Account**

**Проверка:**
1. Зайди: https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0102901194
2. Найди `imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com`
3. Проверь роли

**Должны быть:**
- ✅ **Vertex AI Administrator** (или `roles/aiplatform.admin`)
- ✅ **Owner** (если уже есть - отлично)

**Если нет Vertex AI Administrator:**
1. Кликни на Service Account
2. Нажми **"Grant Access"** (или "Предоставить доступ")
3. Добавь роль: **Vertex AI Administrator**
4. Сохрани

---

### 3. **Формат приватного ключа в n8n**

**Проверка:**
1. Открой credential "Vertex AI Pro Account" в n8n
2. Проверь поле "Private Key"
3. Должно быть:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDpYeKVdAHODumy
   ...
   -----END PRIVATE KEY-----
   ```
   **Каждая строка на новой строке!**

**Если неправильно:**
1. Полностью очисти поле
2. Запусти: `./scripts/get-private-key-for-n8n.sh`
3. Скопируй весь блок и вставь
4. Сохрани → Retry

---

### 4. **Настройки credential в n8n**

**Проверь:**
- ✅ **Region**: `us-central1` (или "Americas (Council Bluffs) - us-central1")
- ✅ **Service Account Email**: `imagen-generator@gen-lang-client-0102901194.iam.gserviceaccount.com`
- ✅ **Private Key**: Правильный формат (см. выше)
- ✅ **Toggle "Set up for use in HTTP Request node"**: **Включен** (зелёный)

---

## 🎯 Порядок действий:

1. **Сначала** настрой OAuth Consent Screen (если не настроен)
2. **Потом** проверь роли Service Account
3. **Затем** исправь формат приватного ключа в n8n
4. **И наконец** проверь credential в n8n (Save → Retry)

---

## 🔍 Если всё ещё не работает:

### Проверь логи в n8n:
1. Запусти workflow
2. Открой execution
3. Посмотри ошибку в node "Gemini File"

### Возможные ошибки:
- `"Couldn't connect with these settings"` → Проверь OAuth Consent Screen и формат ключа
- `"Permission denied"` → Проверь роли Service Account
- `"API not enabled"` → Проверь, что Vertex AI API включен
- `"Cloud Resource Manager API has not been used"` → Включи Cloud Resource Manager API

---

## 📝 Ссылки:

- **OAuth Consent Screen**: https://console.cloud.google.com/apis/credentials/consent?project=gen-lang-client-0102901194
- **IAM & Admin**: https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0102901194
- **APIs**: https://console.cloud.google.com/apis/library?project=gen-lang-client-0102901194
- **Service Accounts**: https://console.cloud.google.com/iam-admin/serviceaccounts?project=gen-lang-client-0102901194
