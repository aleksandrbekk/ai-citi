# Backend Rules

> Применяется к: `supabase/functions/**/*`

## Edge Functions (Deno)

Расположение: `supabase/functions/[name]/index.ts`

```typescript
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data, error } = await req.json()

    // Логика...

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## Деплой

### 🚨 КРИТИЧЕСКИ ВАЖНО: --no-verify-jwt для вебхуков

Вебхуки от внешних сервисов (Lava, Prodamus и т.д.) НЕ отправляют JWT токен.
**ВСЕГДА** деплой вебхук-функции с флагом `--no-verify-jwt`, иначе они получат 401!

```bash
# ❌ ЗАПРЕЩЕНО для вебхуков — сломает приём платежей!
supabase functions deploy lava-webhook --project-ref debcwvxlvozjlqkhnauy

# ✅ ПРАВИЛЬНО — вебхуки ВСЕГДА с --no-verify-jwt
supabase functions deploy lava-webhook --project-ref debcwvxlvozjlqkhnauy --no-verify-jwt
supabase functions deploy prodamus-webhook --project-ref debcwvxlvozjlqkhnauy --no-verify-jwt
```

Функции-вебхуки (ОБЯЗАТЕЛЬНО `--no-verify-jwt`):
- `lava-webhook`
- `prodamus-webhook`
- `telegram-bot-webhook`

Обычные функции (с JWT, без флага):
- `lava-create-invoice`
- `lava-create-subscription`
- `prodamus-create-invoice`
- `auth-telegram`
- `gemini-chat`
- и остальные

### Деплой обычных функций

```bash
supabase functions deploy function-name --project-ref debcwvxlvozjlqkhnauy
```

## Логи

```bash
supabase functions logs function-name
```

## Секреты

```bash
supabase secrets set KEY=value
```

Доступ: `Deno.env.get('KEY')`

## N8N Webhooks

URL: `https://n8n.iferma.pro`

Существующие:
- `/webhook/neuroposter-publish` — публикация в Instagram
- `/webhook/client-carousel` — генерация каруселей

Документация: `docs/N8N_API.md`

## Supabase Client (фронт)

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

## Запросы

```typescript
// SELECT
const { data, error } = await supabase
  .from('scheduled_posts')
  .select('*, post_media(*)')
  .eq('user_id', userId)
  .order('scheduled_at', { ascending: true })

// INSERT
const { data, error } = await supabase
  .from('scheduled_posts')
  .insert({ caption, scheduled_at, user_id })
  .select()
  .single()

// UPDATE
const { error } = await supabase
  .from('scheduled_posts')
  .update({ status: 'published' })
  .eq('id', postId)

// DELETE
const { error } = await supabase
  .from('scheduled_posts')
  .delete()
  .eq('id', postId)
```

## Ошибки

Всегда проверяй `error`:

```typescript
const { data, error } = await supabase.from('posts').select()

if (error) {
  console.error('Supabase error:', error)
  throw error
}
```
