# Decisions

> Принятые архитектурные решения. Обновляй после важных изменений.

## Архитектура

### Почему Vite, а не Next.js
- Telegram Mini App не требует SSR
- Vite быстрее для SPA
- Проще деплой на Vercel

### Почему Supabase
- PostgreSQL из коробки
- RLS для безопасности
- Edge Functions на Deno
- Realtime подписки
- Бесплатный tier достаточен

### Почему n8n для автопубликации
- Visual workflow builder
- Self-hosted (контроль)
- Интеграция с Instagram Graph API
- Scheduled triggers

## UI/UX

### Тёмная тема по умолчанию
- Telegram Mini App часто в тёмном режиме
- Glassmorphism хорошо смотрится на тёмном

### Оранжевый как primary (#FF5A1F)
- Контраст с тёмным фоном
- Ассоциация с энергией, сетевым маркетингом

## Безопасность

### RLS вместо проверок в коде
- Защита на уровне БД
- Невозможно обойти с фронта
- Service Role Key только на сервере

### Telegram WebApp.initData для авторизации
- Проверка подписи на бэкенде
- Нет паролей, только Telegram ID

## Данные

### scheduled_posts — главная таблица
- caption: текст поста
- scheduled_at: время публикации
- status: draft/scheduled/published/failed
- user_id: владелец

### post_media — медиафайлы
- Связь с scheduled_posts через post_id
- order для порядка в карусели
- url из Supabase Storage

---

*Последнее обновление: автоматически*
