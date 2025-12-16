# ТЕХНИЧЕСКОЕ ЗАДАНИЕ: НЕЙРОПОСТЕР

## 📋 ОБЩАЯ ИНФОРМАЦИЯ

**Название проекта:** НЕЙРОПОСТЕР (Instagram Auto-Scheduler)
**Часть экосистемы:** AI CITI | НЕЙРОГОРОД
**Расположение в городе:** Здание "Инструменты" (Фаза 11 в Roadmap)

---

## 🎯 БИЗНЕС-ЦЕЛЬ

### Проблема
- Платные сервисы планирования постов (Later, Buffer, Planoly) стоят $15-50/месяц
- Нет интеграции с AI-генерацией контента
- Невозможно встроить в игровую экосистему

### Решение
Модуль НЕЙРОПОСТЕР:
1. Загружать карусели (до 10 фото)
2. Планировать публикации на конкретное время
3. Автоматически публиковать в Instagram
4. Получать XP за регулярный постинг

---

## 🏗️ АРХИТЕКТУРА

### Стек
- Frontend: React 18 + Vite + TypeScript
- Стили: TailwindCSS + shadcn/ui
- Backend: Supabase Edge Functions
- База: Supabase PostgreSQL
- Storage: Supabase Storage

### Структура в проекте
```
src/pages/tools/poster/
├── index.tsx        # Дашборд постов
├── create.tsx       # Создание поста
├── [id].tsx         # Редактирование
├── calendar.tsx     # Календарь
└── settings.tsx     # Настройки Instagram
```

---

## 📦 ФУНКЦИОНАЛ MVP

### 1. Загрузка медиа
- [ ] Drag & drop загрузка изображений
- [ ] Поддержка до 10 изображений в карусели
- [ ] Превью загруженных изображений
- [ ] Изменение порядка перетаскиванием
- [ ] Автоматический ресайз до 1080x1350 (4:5)

### 2. Создание поста
- [ ] Текст поста (caption) — до 2200 символов
- [ ] Дата и время публикации
- [ ] Сохранение как черновик
- [ ] Планирование публикации

### 3. Календарь / Список постов
- [ ] Просмотр запланированных постов
- [ ] Статусы: черновик / запланирован / опубликован / ошибка
- [ ] Редактирование и удаление поста

### 4. Автопубликация
- [ ] Cron-задача каждые 5 минут
- [ ] Публикация в Instagram Graph API
- [ ] Обработка ошибок (повтор через 10 мин)

---

## 🗄️ БАЗА ДАННЫХ

### Таблица: instagram_accounts
```sql
CREATE TABLE instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id VARCHAR(50) NOT NULL,
  username VARCHAR(100),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Таблица: scheduled_posts
```sql
CREATE TABLE scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES instagram_accounts(id),
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  instagram_post_id VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Таблица: post_media
```sql
CREATE TABLE post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 INSTAGRAM API

### Данные (уже есть)
- Meta App ID: 661809894766298
- Instagram Business Account: 17841400254783592
- Токен действует до ~14 февраля 2026

### Ограничения API
- Rate limits: 200 запросов/час
- Карусель: максимум 10 медиа
- Caption: максимум 2200 символов
- Только бизнес/creator аккаунты

---

## 🎨 UI/UX

### Дашборд
```
┌─────────────────────────────────────────┐
│  НЕЙРОПОСТЕР          [+ Новый пост]   │
├─────────────────────────────────────────┤
│  Сегодня: 16 декабря                   │
│  ┌─────┐ ┌─────┐ ┌─────┐              │
│  │09:00│ │14:00│ │19:00│              │
│  │[img]│ │[img]│ │ + │                │
│  └─────┘ └─────┘ └─────┘              │
│                                        │
│  Очередь постов                        │
│  🟢 17 дек, 09:00 │ Карусель │ [⚙️]   │
│  🟢 17 дек, 14:00 │ Карусель │ [⚙️]   │
│  🟡 17 дек, 19:00 │ Черновик │ [⚙️]   │
└─────────────────────────────────────────┘
```

### Цвета
```css
--primary: #FF5A1F;        /* Оранжевый */
--background: #0a0a0a;     /* Тёмный фон */
--success: #10B981;        /* Зелёный */
--warning: #F59E0B;        /* Жёлтый */
--error: #EF4444;          /* Красный */
```

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ MVP

1. ✅ Загрузка 1-10 фото с drag & drop
2. ✅ Написание текста поста
3. ✅ Выбор даты и времени
4. ✅ Автоматическая публикация
5. ✅ Просмотр статуса постов
6. ✅ Редактирование и удаление
