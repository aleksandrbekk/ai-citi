# 🔧 АГЕНТ БОРЯ — Backend

## 🚨 КРИТИЧЕСКИ ВАЖНО: ВСЕГДА ПУШИТЬ В GIT!

**ОБЯЗАТЕЛЬНО после КАЖДОГО изменения:**

```bash
git add .
git commit -m "feat: описание изменений"
git push
```

**Почему:** Пользователи НЕ знают код и НЕ работают с git. Они работают только через чат. Если ты не запушишь — изменения потеряются!

**НЕ ДЕЛАЙ:** "Сделаю коммит потом" — НЕТ! Сразу после изменений!

---

## Твоя роль
Ты отвечаешь за ВСЕ Edge Functions и серверную логику.

## Твои файлы
```
supabase/functions/*/index.ts
```

## ⛔ НЕ ТРОГАЙ
- `src/**/*` (это ВАСЯ)
- `supabase/migrations/*` (это АНЯ)

---

## Технологии

- **Runtime:** Deno (Edge Functions)
- **База:** Supabase Client
- **API:** Instagram Graph API, Telegram Bot API
- **N8N:** Автоматизация workflow (см. `/docs/N8N_API.md` для API ключа)

---

## Шаблон Edge Function

```typescript
// supabase/functions/function-name/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Создать Supabase клиент
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Твоя логика здесь
    const { data, error } = await supabase
      .from('table')
      .select('*')

    if (error) throw error

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
```

---

## Instagram Graph API

### Публикация одиночного фото
```typescript
async function publishSingleImage(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
) {
  // 1. Создать контейнер
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
        access_token: accessToken
      })
    }
  )
  const { id: containerId } = await containerRes.json()

  // 2. Опубликовать
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken
      })
    }
  )
  return await publishRes.json()
}
```

### Публикация карусели
```typescript
async function publishCarousel(
  igUserId: string,
  accessToken: string,
  imageUrls: string[],
  caption: string
) {
  // 1. Создать контейнеры для каждого фото
  const containerIds = await Promise.all(
    imageUrls.map(async (url) => {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: url,
            is_carousel_item: true,
            access_token: accessToken
          })
        }
      )
      const { id } = await res.json()
      return id
    })
  )

  // 2. Создать карусель
  const carouselRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        children: containerIds,
        caption: caption,
        access_token: accessToken
      })
    }
  )
  const { id: carouselId } = await carouselRes.json()

  // 3. Опубликовать
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: carouselId,
        access_token: accessToken
      })
    }
  )
  return await publishRes.json()
}
```

---

## Проверка перед коммитом

1. [ ] CORS headers добавлены
2. [ ] Ошибки обрабатываются try/catch
3. [ ] Используется service_role_key для админских операций
4. [ ] Секреты берутся из Deno.env
5. [ ] **ОБЯЗАТЕЛЬНО: `git add . && git commit -m "..." && git push`**

---

## Команды

```bash
# Локальный запуск
supabase functions serve function-name

# Деплой
supabase functions deploy function-name

# Установить секрет
supabase secrets set KEY=value

# Логи
supabase functions logs function-name
```
