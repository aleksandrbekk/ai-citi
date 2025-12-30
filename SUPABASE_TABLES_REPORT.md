# 📊 ОТЧЕТ: Структура базы данных Supabase

**Дата проверки:** $(date)  
**URL:** https://debcwvxlvozjlqkhnauy.supabase.co

---

## ✅ СУЩЕСТВУЮЩИЕ ТАБЛИЦЫ (16)

### 👥 Пользователи и доступ

#### `users` (3 записи)
- `id` (UUID, PRIMARY KEY)
- `telegram_id` (BIGINT, UNIQUE)
- `username` (VARCHAR)
- `first_name` (VARCHAR)
- `last_name` (VARCHAR)
- `avatar_url` (TEXT)
- `language_code` (VARCHAR)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `profiles` (3 записи)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `level` (INTEGER)
- `xp` (INTEGER)
- `xp_to_next_level` (INTEGER)
- `coins` (INTEGER)
- `premium_coins` (INTEGER)
- `subscription` (TEXT)
- `subscription_expires_at` (TIMESTAMPTZ)
- `stats` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `allowed_users` (2 записи)
- `id` (UUID, PRIMARY KEY)
- `telegram_id` (BIGINT)
- `comment` (TEXT)
- `created_at` (TIMESTAMPTZ)

#### `curators` (1 запись)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `name` (VARCHAR)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

#### `user_tariffs` (3 записи)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `tariff_slug` (VARCHAR)
- `expires_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN)

---

### 📚 Курсы и обучение

#### `course_modules` (11 записей)
- `id` (UUID, PRIMARY KEY)
- `title` (VARCHAR)
- `description` (TEXT)
- `cover_url` (TEXT)
- `order_index` (INTEGER)
- `min_tariff` (VARCHAR)
- `lessons_count` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

#### `course_lessons` (113 записей)
- `id` (UUID, PRIMARY KEY)
- `module_id` (UUID, FK → course_modules)
- `title` (VARCHAR)
- `description` (TEXT)
- `order_index` (INTEGER)
- `video_id` (VARCHAR)
- `video_url` (TEXT)
- `video_duration` (INTEGER)
- `has_homework` (BOOLEAN)
- `homework_title` (VARCHAR)
- `homework_description` (TEXT)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `content_blocks` (JSONB) ⚠️ **Дополнительное поле**

#### `lesson_materials` (132 записи)
- `id` (UUID, PRIMARY KEY)
- `lesson_id` (UUID, FK → course_lessons)
- `type` (VARCHAR)
- `title` (VARCHAR)
- `url` (TEXT)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### `lesson_videos` (36 записей)
- `id` (UUID, PRIMARY KEY)
- `lesson_id` (UUID, FK → course_lessons)
- `title` (VARCHAR)
- `video_url` (TEXT)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### `lesson_quizzes` (17 записей)
- `id` (UUID, PRIMARY KEY)
- `lesson_id` (UUID, FK → course_lessons)
- `question` (TEXT)
- `question_type` (VARCHAR)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### `quiz_options` (54 записи)
- `id` (UUID, PRIMARY KEY)
- `quiz_id` (UUID, FK → lesson_quizzes)
- `option_text` (TEXT)
- `image_url` (TEXT)
- `is_correct` (BOOLEAN)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### `homework_submissions` (3 записи)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `lesson_id` (UUID, FK → course_lessons)
- `answer_text` (TEXT)
- `answer_files` (TEXT[])
- `status` (VARCHAR)
- `curator_id` (UUID, FK → curators) ⚠️ **Дополнительное поле**
- `curator_comment` (TEXT)
- `reviewed_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `quiz_answers` (JSONB) ⚠️ **Дополнительное поле**

---

### 📱 Нейропостер (Instagram)

#### `instagram_accounts` (0 записей)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `instagram_user_id` (VARCHAR)
- `username` (VARCHAR)
- `access_token` (TEXT)
- `token_expires_at` (TIMESTAMPTZ)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `scheduled_posts` (11 записей)
- `id` (UUID, PRIMARY KEY)
- `user_id` (UUID, FK → users)
- `instagram_account_id` (UUID, FK → instagram_accounts)
- `caption` (TEXT)
- `scheduled_at` (TIMESTAMPTZ)
- `status` (VARCHAR)
- `published_at` (TIMESTAMPTZ)
- `instagram_post_id` (VARCHAR)
- `instagram_permalink` (VARCHAR)
- `error_message` (TEXT)
- `retry_count` (INTEGER)
- `source` (VARCHAR)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `media_deleted` (BOOLEAN) ⚠️ **Дополнительное поле**

#### `post_media` (77 записей)
- `id` (UUID, PRIMARY KEY)
- `post_id` (UUID, FK → scheduled_posts)
- `order_index` (INTEGER)
- `storage_path` (VARCHAR)
- `public_url` (VARCHAR)
- `width` (INTEGER)
- `height` (INTEGER)
- `file_size` (INTEGER)
- `created_at` (TIMESTAMPTZ)

#### `publish_logs` (0 записей)
- `id` (UUID, PRIMARY KEY)
- `post_id` (UUID, FK → scheduled_posts)
- `action` (VARCHAR)
- `message` (TEXT)
- `details` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## ⚠️ ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ (не в миграциях)

1. **`course_lessons.content_blocks`** (JSONB) - блоки контента урока
2. **`homework_submissions.curator_id`** (UUID) - ID куратора, проверившего ДЗ
3. **`homework_submissions.quiz_answers`** (JSONB) - ответы на квизы
4. **`scheduled_posts.media_deleted`** (BOOLEAN) - флаг удаления медиа

---

## 📈 СТАТИСТИКА

- **Всего таблиц:** 16
- **Все таблицы существуют:** ✅
- **Всего записей:** ~400+
- **Самые большие таблицы:**
  - `course_lessons`: 113 записей
  - `lesson_materials`: 132 записи
  - `post_media`: 77 записей
  - `quiz_options`: 54 записи

---

## 🔍 ЗАМЕЧАНИЯ

1. Таблицы `lesson_quizzes`, `quiz_options`, `lesson_videos` используются в коде, но нет миграций для них
2. Поля `content_blocks`, `curator_id`, `quiz_answers`, `media_deleted` добавлены вручную или через другие миграции
3. Рекомендуется создать миграции для всех таблиц и дополнительных полей

