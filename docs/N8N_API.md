# 🔧 N8N API — Инструкции для агентов

## 📋 ОБЩАЯ ИНФОРМАЦИЯ

**N8N URL:** https://n8n.iferma.pro  
**API Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ`

**Заголовок для запросов:**
```
X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ
```

---

## 🎯 ДЛЯ ЧЕГО ИСПОЛЬЗУЕТСЯ

N8N используется для:
1. **Автопубликация постов в Instagram** — webhook `/webhook/neuroposter-publish`
2. **Генерация каруселей** — webhook `/webhook/client-carousel`
3. **Создание новых workflow** — через API (для агентов)

---

## 📡 СУЩЕСТВУЮЩИЕ WEBHOOKS

### 1. Публикация постов в Instagram
**URL:** `https://n8n.iferma.pro/webhook/neuroposter-publish`  
**Метод:** POST  
**Тело запроса:**
```json
{
  "postId": "uuid",
  "caption": "текст поста",
  "imageUrls": ["url1", "url2", ...]
}
```

### 2. Генерация каруселей
**URL:** `https://n8n.iferma.pro/webhook/carousel-v2`  
**Метод:** POST  
**Workflow:** AI CITI карусели (RgapTTGAu6acuaGc)  
**Error Workflow:** AI CITI — Refund при ошибке карусели (5xeeTKBqJ6BN14eo) — при ошибке возвращает 30 монет и шлёт сообщение в Telegram  
**API:** OpenRouter (google/gemini-3-pro-preview для Copywriter, google/gemini-3-pro-image-preview для изображений)  
**Тело запроса:** chatId, topic, userPhoto, cta, gender, styleConfig, vasiaCore (см. `src/pages/agents/carousel/content.tsx`, `index.tsx`)

### 3. Refund при ошибке (Edge Function)
**URL:** `https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/refund-carousel-coins`  
**Метод:** POST  
**Тело:** `{ chatId?: number, executionId?: string, amount?: number, reason?: string }`  
**Секреты Supabase:** `N8N_API_KEY` (для получения chatId из executionId), `REFUND_WEBHOOK_SECRET` (опционально, для защиты)

---

## 🛠️ СОЗДАНИЕ WORKFLOW ЧЕРЕЗ API

### Базовый запрос

```bash
curl -X POST https://n8n.iferma.pro/api/v1/workflows \
  -H "X-N8N-API-KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Название workflow",
    "nodes": [...],
    "connections": {...},
    "active": true
  }'
```

### Пример создания простого workflow

```typescript
// Пример для агента БОРЯ
const createWorkflow = async (name: string, nodes: any[], connections: any) => {
  const response = await fetch('https://n8n.iferma.pro/api/v1/workflows', {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhNzA3MjRlZS1jNTIxLTQzODEtOGEwZC0wYTM5MTI3ZDdlNmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY1NjA2Mzk3fQ.gHdOp3h7jQtGX0qZjXGlz2uzROuecGSOFYxe5gO2qQQ',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      nodes,
      connections,
      active: true
    })
  })
  
  return await response.json()
}
```

---

## 📚 ДОКУМЕНТАЦИЯ N8N API

**Официальная документация:** https://docs.n8n.io/api/

**Основные endpoints:**
- `GET /api/v1/workflows` — список workflow
- `POST /api/v1/workflows` — создать workflow
- `GET /api/v1/workflows/:id` — получить workflow
- `PUT /api/v1/workflows/:id` — обновить workflow
- `DELETE /api/v1/workflows/:id` — удалить workflow
- `POST /api/v1/workflows/:id/activate` — активировать workflow
- `POST /api/v1/workflows/:id/deactivate` — деактивировать workflow

---

## ⚠️ ВАЖНО ДЛЯ АГЕНТОВ

1. **Всегда используй заголовок `X-N8N-API-KEY`** в запросах к API
2. **Не коммить ключ в код** — используй переменные окружения или этот файл
3. **Перед созданием workflow** — проверь, нет ли похожего
4. **После создания workflow** — обязательно протестируй его
5. **Всегда пуши изменения** после работы с n8n (если создал скрипты/документацию)

---

## 🔗 СВЯЗАННЫЕ ФАЙЛЫ

- `src/hooks/usePosts.ts` — использование webhook для публикации
- `src/pages/agents/carousel/content.tsx` — использование webhook для каруселей
- `CLAUDE.md` — общие правила для агентов

