# 🚀 ПЛАН ИНТЕГРАЦИИ RAG (GenAI App Builder)

**Дата:** 2026-01-27  
**Цель:** Использовать кредиты "GenAI App Builder" (฿32,310.50) для RAG-функциональности

---

## ✅ ПОНИМАНИЕ СИТУАЦИИ

### **Кредиты:**
- ✅ **"Trial credit for GenAI App Builder"** (฿32,310.50) - **ПРИМЕНЯЕТСЯ** к Vertex AI Search (GenAI App Builder)
- ❌ **НЕ применяется** к Vertex AI API (`aiplatform.googleapis.com`)

### **Решение:**
Использовать **GenAI App Builder** для RAG, чтобы использовать кредиты!

---

## 🎯 USE CASES (из твоего запроса)

### 1. **SystemA (Трейдинг обучение) - AI-Ментор**
- Загрузить PDF книги, транскрибации уроков про VWAP, POC, Дельту
- Юзер спрашивает → RAG находит ответ в документах → Отвечает в стиле SystemA

### 2. **AR ARENA - Auto-Support & Wiki**
- Индексировать Whitepaper, FAQ, правила игры
- Игроки задают вопросы → RAG отвечает из документации

### 3. **Личный Бренд - Цифровой Аватар**
- Скачать субтитры с YouTube видео, посты из Telegram
- Подписчик спрашивает → RAG находит ответ в твоих материалах

### 4. **Внутренняя аналитика**
- Подключить RAG к заметкам по проектам (roadmap, json-файлы, идеи)
- Ты спрашиваешь → RAG находит информацию из твоих файлов

---

## 🔧 ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### **API Endpoint:**
```
POST https://discoveryengine.googleapis.com/v1/{servingConfig}:search
```

### **Структура:**
```
projects/{PROJECT_ID}/locations/global/collections/default_collection/dataStores/{DATA_STORE_ID}/servingConfigs/default_search
```

### **Текущий код:**
- Edge Function: `supabase/functions/gemini-chat/index.ts`
- Использует: Vertex AI API (`aiplatform.googleapis.com`)
- Нужно добавить: Vertex AI Search (`discoveryengine.googleapis.com`)

---

## 📋 ПЛАН ИНТЕГРАЦИИ

### **Шаг 1: Создать Data Store в GenAI App Builder**

1. Открыть консоль:
   ```
   https://console.cloud.google.com/gen-app-builder/data-stores?project=gen-lang-client-0102901194
   ```

2. Создать Data Store:
   - Название: `systema-docs` (для SystemA)
   - Тип: Website / PDF / Cloud Storage
   - Загрузить документы

3. Получить:
   - `DATA_STORE_ID`
   - `SERVING_CONFIG_ID` (обычно `default_search`)

### **Шаг 2: Добавить функцию RAG в Edge Function**

**Файл:** `supabase/functions/gemini-chat/index.ts`

**Добавить:**
```typescript
// Новая функция для RAG поиска
async function searchRAG(
  token: string,
  query: string,
  dataStoreId: string
): Promise<{ answer: string; sources: any[] }> {
  const endpoint = `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_ID}/locations/global/collections/default_collection/dataStores/${dataStoreId}/servingConfigs/default_search:search`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      pageSize: 5,
      contentSearchSpec: {
        snippetSpec: {
          maxSnippetCount: 3,
          referenceOnly: false,
        },
        summarySpec: {
          summaryPromptSpec: {
            promptTemplate: "Ты AI-ментор SystemA. Отвечай строго по документам, используй трейдерский сленг. Если ответа нет в документах, скажи 'Не знаю'."
          }
        }
      }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`RAG search error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  // Извлекаем ответ из summary
  const answer = data.summary?.summaryText || 'Не нашел ответ в документах.'
  
  // Извлекаем источники
  const sources = data.results?.map((r: any) => ({
    title: r.document?.title,
    uri: r.document?.uri,
    snippet: r.document?.snippets?.[0]?.snippet
  })) || []

  return { answer, sources }
}
```

### **Шаг 3: Интегрировать в основной flow**

**В функции `serve`:**
```typescript
// Проверяем, нужен ли RAG
const useRAG = req.headers.get('x-use-rag') === 'true' || 
               message.toLowerCase().includes('[rag]') ||
               message.toLowerCase().includes('[документы]')

if (useRAG) {
  // Используем RAG
  const ragResult = await searchRAG(token, message, 'systema-docs')
  
  // Комбинируем с Gemini для финального ответа
  const enhancedPrompt = `
Контекст из документов:
${ragResult.answer}

Источники:
${ragResult.sources.map(s => `- ${s.title}: ${s.snippet}`).join('\n')}

Вопрос пользователя: ${message}

Ответь на основе контекста выше, используя стиль SystemA (жестко, по делу, трейдерский сленг).
  `
  
  // Используем обычный Gemini с enhanced prompt
  result = await callGemini(token, usedModel, [{ role: 'user', parts: [{ text: enhancedPrompt }] }], settings.temperature, settings.max_tokens)
} else {
  // Обычный режим без RAG
  result = await callGemini(token, usedModel, contents, settings.temperature, settings.max_tokens)
}
```

### **Шаг 4: Добавить настройки в БД**

**Таблица `chat_settings`:**
```sql
ALTER TABLE chat_settings
  ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS rag_data_store_id TEXT,
  ADD COLUMN IF NOT EXISTS rag_auto_mode BOOLEAN DEFAULT false;
```

---

## 🎨 UI ИЗМЕНЕНИЯ

### **В админке (`src/pages/admin/Settings.tsx`):**
- Добавить вкладку "RAG"
- Поля:
  - ✅ Включить RAG
  - Data Store ID
  - Автоматический режим (всегда использовать RAG)

### **В чате (`src/pages/Chat.tsx`):**
- Кнопка переключения RAG режима
- Показывать источники, если использовался RAG

---

## 📊 МОНИТОРИНГ

### **Логирование:**
- Добавить в `logUsage`:
  - `rag_used: boolean`
  - `rag_data_store_id: string`
  - `rag_sources_count: number`

### **Метрики:**
- Количество RAG запросов
- Использование кредитов GenAI App Builder
- Качество ответов (с RAG vs без RAG)

---

## ✅ ПРЕИМУЩЕСТВА

1. **Используем кредиты** - ฿32,310.50 на GenAI App Builder
2. **Точность** - ответы основаны на твоих документах
3. **Актуальность** - обновляешь документы, бот знает новое
4. **Приватность** - данные не уходят в публичное обучение
5. **Масштабируемость** - один Data Store для всех проектов

---

## 🚀 NEXT STEPS

1. **Создать Data Store** в консоли GenAI App Builder
2. **Добавить функцию RAG** в Edge Function
3. **Интегрировать в чат** (UI + логика)
4. **Протестировать** на реальных вопросах
5. **Мониторить** использование кредитов

---

## 📝 ПРИМЕЧАНИЯ

- **Service Account** должен иметь роль `roles/discoveryengine.viewer` или `roles/discoveryengine.admin`
- **API** `discoveryengine.googleapis.com` должен быть включен
- **Data Store** нужно создать заранее (не через API, только через консоль)
