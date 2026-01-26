# 🧪 ИНСТРУКЦИЯ: Тестирование RAG агента

**Дата:** 2026-01-27  
**Цель:** Проверить, списываются ли кредиты GenAI App Builder при использовании RAG

---

## ✅ ЧТО УЖЕ СДЕЛАНО

1. ✅ Добавлена функция `searchRAG()` в `supabase/functions/gemini-chat/index.ts`
2. ✅ Добавлена поддержка параметров `useRAG` и `ragDataStoreId` в запросе
3. ✅ Реализован гибридный режим (RAG + Gemini)

---

## 🔧 ПЕРЕД ТЕСТИРОВАНИЕМ

### **Шаг 1: Создать Data Store в консоли**

1. Открой консоль GenAI App Builder:
   ```
   https://console.cloud.google.com/gen-app-builder/data-stores?project=gen-lang-client-0102901194
   ```

2. Нажми "Create Data Store"

3. Настройки:
   - **Display name:** `test-rag-store` (или любое имя)
   - **Data store type:** Website / Cloud Storage / PDF
   - **Location:** `global` (обязательно!)

4. Загрузи тестовые документы:
   - Можно загрузить простой текстовый файл
   - Или указать URL сайта
   - Или загрузить PDF

5. Дождись индексации (может занять несколько минут)

6. **Скопируй Data Store ID:**
   - После создания, в URL будет что-то вроде:
   ```
   https://console.cloud.google.com/gen-app-builder/data-stores/1234567890?project=gen-lang-client-0102901194
   ```
   - Data Store ID = `1234567890`

---

### **Шаг 2: Проверить права Service Account**

Service Account должен иметь роль для Discovery Engine API:

```bash
gcloud projects add-iam-policy-binding gen-lang-client-0102901194 \
  --member="serviceAccount:ai-citi-assistant@gen-lang-client-0102901194.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.viewer"
```

Или через консоль:
1. https://console.cloud.google.com/iam-admin/iam?project=gen-lang-client-0102901194
2. Найди `ai-citi-assistant@...`
3. Добавь роль: `Discovery Engine Viewer` или `Discovery Engine Admin`

---

### **Шаг 3: Включить Discovery Engine API**

```bash
gcloud services enable discoveryengine.googleapis.com --project=gen-lang-client-0102901194
```

Или через консоль:
1. https://console.cloud.google.com/apis/library/discoveryengine.googleapis.com?project=gen-lang-client-0102901194
2. Нажми "Enable"

---

## 🧪 ТЕСТИРОВАНИЕ

### **Вариант 1: Через curl (быстрый тест)**

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/gemini-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Что такое VWAP?",
    "userId": "test-user-123",
    "useRAG": true,
    "ragDataStoreId": "YOUR_DATA_STORE_ID"
  }'
```

**Замени:**
- `YOUR_SUPABASE_URL` - твой Supabase URL
- `YOUR_ANON_KEY` - твой Supabase Anon Key
- `YOUR_DATA_STORE_ID` - ID Data Store из консоли

---

### **Вариант 2: Через фронтенд (Chat.tsx)**

Добавь в запрос параметры:

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/gemini-chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: userMessage,
    userId: userId,
    history: chatHistory,
    useRAG: true,  // ← Включить RAG
    ragDataStoreId: 'YOUR_DATA_STORE_ID'  // ← ID Data Store
  })
})
```

---

### **Вариант 3: Тестовый endpoint (можно добавить)**

Можно создать отдельный тестовый endpoint в Edge Function:

```typescript
// В serve() добавить:
if (req.url.includes('/test-rag')) {
  const { query, dataStoreId } = await req.json()
  const token = await getAccessToken(credentials)
  const result = await searchRAG(token, query, dataStoreId)
  return new Response(JSON.stringify(result), { headers: corsHeaders })
}
```

---

## 📊 ПРОВЕРКА РЕЗУЛЬТАТОВ

### **1. Проверить ответ API:**

Должен вернуться ответ с полем `rag`:

```json
{
  "reply": "Ответ на основе документов...",
  "model": "gemini-2.5-flash",
  "rag": {
    "used": true,
    "sources": [
      {
        "title": "Название документа",
        "uri": "https://...",
        "snippet": "Фрагмент текста..."
      }
    ],
    "answer": "Ответ из RAG..."
  }
}
```

### **2. Проверить логи Edge Function:**

В Supabase Dashboard → Edge Functions → Logs:
- Должны быть логи: `RAG search: query="..."`, `RAG result: ...`
- Не должно быть ошибок типа `RAG search error`

### **3. Проверить списание кредитов:**

1. Открой консоль биллинга:
   ```
   https://console.cloud.google.com/billing/01DB30-E9BEE6-19F55A/reports?project=gen-lang-client-0102901194
   ```

2. Фильтр: `discoveryengine.googleapis.com`

3. Проверь:
   - Есть ли расходы на Discovery Engine API?
   - Списывается ли кредит "GenAI App Builder" (฿32,310.50)?

---

## ⚠️ ВОЗМОЖНЫЕ ОШИБКИ

### **Ошибка 1: "Data Store not found"**

**Причина:** Неправильный Data Store ID или Data Store не создан

**Решение:**
- Проверь ID в консоли
- Убедись, что Data Store создан и проиндексирован

---

### **Ошибка 2: "Permission denied"**

**Причина:** Service Account не имеет прав

**Решение:**
```bash
gcloud projects add-iam-policy-binding gen-lang-client-0102901194 \
  --member="serviceAccount:ai-citi-assistant@gen-lang-client-0102901194.iam.gserviceaccount.com" \
  --role="roles/discoveryengine.viewer"
```

---

### **Ошибка 3: "API not enabled"**

**Причина:** Discovery Engine API не включен

**Решение:**
```bash
gcloud services enable discoveryengine.googleapis.com --project=gen-lang-client-0102901194
```

---

### **Ошибка 4: "RAG не нашел ответ"**

**Причина:** В Data Store нет релевантных документов

**Решение:**
- Загрузи документы в Data Store
- Подожди индексации (несколько минут)
- Попробуй другой вопрос

---

## ✅ УСПЕШНЫЙ ТЕСТ

Если все работает:

1. ✅ API возвращает ответ с `rag.used: true`
2. ✅ В логах нет ошибок
3. ✅ В консоли биллинга видны расходы на `discoveryengine.googleapis.com`
4. ✅ Кредит "GenAI App Builder" списывается

---

## 🎯 NEXT STEPS

После успешного теста:

1. Добавить UI для переключения RAG режима
2. Сохранить Data Store ID в настройках (БД)
3. Добавить мониторинг использования RAG
4. Оптимизировать промпты для лучших результатов

---

## 📝 ПРИМЕЧАНИЯ

- **Бесплатно:** Первые 10,000 запросов в месяц (GenAI App Builder)
- **Стоимость:** ~$1.50 за 1000 запросов (после бесплатного лимита)
- **Локация:** Data Store должен быть в `global` (не `us-central1`!)
