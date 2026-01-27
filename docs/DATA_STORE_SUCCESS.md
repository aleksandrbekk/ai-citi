# ✅ DATA STORE УСПЕШНО СОЗДАН!

**Дата:** 2026-01-27  
**Статус:** ✅ Готов к использованию

---

## 📋 ИНФОРМАЦИЯ О DATA STORE

### **Основные данные:**
- **Название:** `test-rag-store`
- **Data Store ID:** `test-rag-store_1769472332931`
- **Тип:** Website
- **Локация:** `global` (Multi-region)
- **Создан:** Jan 27, 2026
- **Источник:** `cloud.google.com/generative-ai-app-builder/docs`
- **Advanced indexing:** ✅ Включен

---

## 🔗 ПОЛНЫЙ ПУТЬ ДЛЯ API

```
projects/gen-lang-client-0102901194/locations/global/collections/default_collection/dataStores/test-rag-store_1769472332931/servingConfigs/default_search
```

---

## 🧪 КАК ПРОТЕСТИРОВАТЬ

### **Вариант 1: Через чат в приложении**

Добавь в запрос к Edge Function:

```typescript
{
  message: "Что такое Vertex AI Search?",
  userId: "test-user",
  useRAG: true,
  ragDataStoreId: "test-rag-store_1769472332931"
}
```

### **Вариант 2: Через curl**

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/gemini-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Что такое Vertex AI Search?",
    "userId": "test-user",
    "useRAG": true,
    "ragDataStoreId": "test-rag-store_1769472332931"
  }'
```

---

## 📊 ПРОВЕРКА РАБОТЫ

После тестового запроса проверь:

1. **Ответ содержит:**
   - Текст ответа на основе документов
   - Источники (sources)
   - `ragUsed: true` в ответе

2. **В логах Supabase:**
   - Должны быть логи: `RAG search: query="..."`
   - Должны быть логи: `RAG result: ...`
   - Не должно быть ошибок

3. **В консоли биллинга:**
   - Должны появиться расходы на `discoveryengine.googleapis.com`
   - Кредит "GenAI App Builder" (฿32,310.50) должен начать списываться

---

## ✅ СЛЕДУЮЩИЕ ШАГИ

1. ✅ Data Store создан
2. ⏳ Протестировать RAG через API
3. ⏳ Проверить списание кредитов
4. ⏳ Добавить UI для переключения режимов (опционально)

---

## 🔗 ССЫЛКИ

- **Data Store:** https://console.cloud.google.com/gen-app-builder/data-stores/test-rag-store_1769472332931?project=gen-lang-client-0102901194
- **Список Data Stores:** https://console.cloud.google.com/gen-app-builder/data-stores?project=gen-lang-client-0102901194
- **Биллинг:** https://console.cloud.google.com/billing/01DB30-E9BEE6-19F55A/reports?project=gen-lang-client-0102901194
