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

### Светлая тема с glassmorphism
- Белый фон (`#FFFFFF`) или кремовый (`#FFF8F5`)
- Glassmorphism карточки: `bg-white/80 backdrop-blur-xl`
- Адаптируется к теме Telegram через CSS variables

### Оранжевый как primary (#FF5A1F)
- Яркий, энергичный — ассоциация с сетевым маркетингом
- Хороший контраст на светлом фоне
- Tailwind: `orange-500`, `from-orange-400 to-orange-500`

### Бирюзовый как secondary (#06B6D4)
- AI-элементы, вторичные кнопки
- Tailwind: `cyan-500`, `from-cyan-400 to-cyan-500`

### Запрещённые цвета
- ❌ Фиолетовый, розовый — не используем
- ❌ Синий — только для info статусов

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
