# RAG Integration Complete

## Summary

RAG (Retrieval-Augmented Generation) успешно интегрирован в приложение AI CITI.

## Созданные ресурсы

### 1. Data Store: Karmalogik Sutra
- **ID:** `karmalogik-datastore`
- **Display Name:** Karmalogik Sutra
- **Location:** global
- **Content:** PDF документ "Сутра Отношения"

### 2. Search Engine: Karmalogik Search
- **Engine ID:** `karmalogik-search`
- **Display Name:** Karmalogik Search
- **Type:** SOLUTION_TYPE_SEARCH
- **Add-ons:** SEARCH_ADD_ON_LLM

### 3. GCS Bucket
- **URI:** `gs://gen-lang-client-0102901194-rag-docs`
- **Files:** `karmalogic-sutra-relationships.pdf`

## Как использовать RAG

### API запрос:
```bash
curl -X POST https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/gemini-chat \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ваш вопрос",
    "userId": "user-id",
    "useRAG": true,
    "ragEngineId": "karmalogik-search"
  }'
```

### Параметры:
- `useRAG: true` — включить RAG
- `ragEngineId` — ID поискового движка:
  - `karmalogik-search` — для вопросов по Кармалогик
  - `ai-citi-rag-search_1769480621647` — для документации Vertex AI

### Формат ответа:
```json
{
  "reply": "Ответ от Gemini с контекстом из документов",
  "rag": {
    "used": true,
    "sources": [
      {"title": "...", "uri": "...", "snippet": "..."}
    ],
    "answer": "Краткий ответ из RAG"
  }
}
```

## Идентификаторы

| Ресурс | Значение |
|--------|----------|
| Google Cloud Project | `gen-lang-client-0102901194` |
| Karmalogik Engine ID | `karmalogik-search` |
| Karmalogik Data Store | `karmalogik-datastore` |
| GCS Bucket | `gs://gen-lang-client-0102901194-rag-docs` |
| Edge Function | `gemini-chat` (v22) |

## Как добавить новые документы

1. Загрузить PDF в GCS bucket:
```bash
gcloud storage cp your-document.pdf gs://gen-lang-client-0102901194-rag-docs/
```

2. Запустить импорт:
```bash
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/gen-lang-client-0102901194/locations/global/collections/default_collection/dataStores/karmalogik-datastore/branches/default_branch/documents:import" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-goog-user-project: gen-lang-client-0102901194" \
  -d '{
    "gcsSource": {
      "inputUris": ["gs://gen-lang-client-0102901194-rag-docs/*.pdf"],
      "dataSchema": "content"
    },
    "reconciliationMode": "INCREMENTAL"
  }'
```

## Биллинг

Использует $1000 бонусных кредитов GenAI App Builder.
Проверка: https://console.cloud.google.com/billing/01E1C9-A9E52B-A5F0B1/reports

---

**Дата создания:** 2026-01-27
**Статус:** Работает
