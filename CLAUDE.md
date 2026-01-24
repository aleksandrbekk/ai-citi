# CLAUDE.md

> AI CITI | НЕЙРОГОРОД — Telegram Mini App для сетевиков.
> MVP НЕЙРОПОСТЕР готов. Заказчики НЕ программисты.

## Импорты

Читай эти файлы когда работаешь с соответствующими частями:

- `.claude/rules/core.md` — главные правила (ЧИТАЙ ВСЕГДА)
- `.claude/rules/frontend.md` — React, TypeScript, стили
- `.claude/rules/backend.md` — Supabase, Edge Functions, n8n
- `.claude/rules/database.md` — PostgreSQL, миграции, RLS
- `.claude/memory/decisions.md` — принятые решения
- `.claude/memory/patterns.md` — паттерны проекта

## Быстрый старт

```bash
cat .env.local              # Ключи
npm run build               # Проверка перед коммитом
git add . && git commit -m "feat: ..." && git push  # ВСЕГДА
```

## Стек

```
React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui
Supabase (PostgreSQL + Edge Functions) + n8n
Vercel
```

## Структура

```
src/pages/          — страницы
src/components/     — компоненты (ui/ = shadcn)
src/hooks/          — хуки
src/store/          — Zustand
src/lib/            — утилиты
supabase/migrations/— SQL
supabase/functions/ — Edge Functions
```

## Админы

```
ADMIN_IDS = [643763835, 190202791]
```
