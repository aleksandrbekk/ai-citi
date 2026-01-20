# 🔐 ДОСТУПЫ К СЕРВИСАМ

> ⚠️ ЭТОТ ФАЙЛ НЕ КОММИТИТЬ В GIT!
> Скопируй этот файл как `CREDENTIALS.md`, заполни данные и храни локально.

---

## SUPABASE

**Проект:** [создать на supabase.com]

```
URL: https://xxx.supabase.co
ANON KEY: xxx
SERVICE ROLE KEY: xxx (секретный!)
```

---

## GITHUB

**Репозиторий:** https://github.com/aleksandrbekk/ai-citi

```
Username: xxx
Email: xxx
```

---

## INSTAGRAM / META

**Meta App:** https://developers.facebook.com/apps/xxx

```
App ID: xxx
App Secret: xxx (секретный!)
Instagram Business Account ID: xxx
Access Token: xxx (секретный!)
Token Expires: xxx
```

---

## TELEGRAM

**Бот:** @xxx_bot

```
Bot Token: xxx (секретный!)
Bot Username: xxx
```

---

## VERCEL

**Проект:** https://vercel.com/xxx/ai-citi

```
Team: xxx
```

---

## КАК ИСПОЛЬЗОВАТЬ

1. Скопируй `VITE_*` переменные в `.env.local`
2. Секретные ключи добавь в Supabase:
   ```bash
   supabase secrets set TELEGRAM_BOT_TOKEN=xxx
   supabase secrets set META_APP_SECRET=xxx
   supabase secrets set INSTAGRAM_ACCESS_TOKEN=xxx
   ```
