---
description: Deploy Supabase Edge Function
argument-hint: [function-name like "gemini-chat"]
---

# Deploy Supabase Edge Function

## Function to Deploy

$ARGUMENTS

## 🚨 КРИТИЧЕСКИ ВАЖНО: Проверь --no-verify-jwt!

Следующие функции ОБЯЗАТЕЛЬНО деплоить с `--no-verify-jwt`:
- `lava-webhook` — платежи Lava
- `prodamus-webhook` — платежи Prodamus
- `telegram-bot-webhook` — вебхук Telegram бота
- `auth-telegram` — авторизация мини-аппа

**БЕЗ этого флага они получат 401 и СЛОМАЮТСЯ!**

## Step 1: Check Function Exists

```bash
ls -la supabase/functions/$ARGUMENTS/
```

## Step 2: Deploy

Если функция в списке выше (lava-webhook, prodamus-webhook, telegram-bot-webhook, auth-telegram):

```bash
supabase functions deploy $ARGUMENTS --no-verify-jwt --project-ref debcwvxlvozjlqkhnauy
```

Если функция НЕ в списке (gemini-chat, send-broadcast и т.д.):

```bash
supabase functions deploy $ARGUMENTS --project-ref debcwvxlvozjlqkhnauy
```

## Step 3: Check Logs

```bash
supabase functions logs $ARGUMENTS --project-ref debcwvxlvozjlqkhnauy
```

## Project Info

- **Project ID:** debcwvxlvozjlqkhnauy
- **Functions URL:** https://debcwvxlvozjlqkhnauy.supabase.co/functions/v1/

## Функции требующие --no-verify-jwt (ПОЛНЫЙ СПИСОК):

| Функция | Причина |
|---------|---------|
| `lava-webhook` | Внешний вебхук от Lava (платежи) |
| `prodamus-webhook` | Внешний вебхук от Prodamus (платежи) |
| `telegram-bot-webhook` | Вебхук от Telegram (бот) |
| `auth-telegram` | Вызов из мини-аппа без JWT |
