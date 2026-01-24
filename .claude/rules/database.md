# Database Rules

> Применяется к: `supabase/migrations/**/*.sql`

## Именование

- Таблицы: `snake_case`, множественное число → `scheduled_posts`
- Колонки: `snake_case` → `user_id`, `created_at`

## Обязательные колонки

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
```

## Миграции

Файлы: `supabase/migrations/NNN_description.sql`

```sql
-- 005_add_post_status.sql
-- Добавляет статус к постам

ALTER TABLE scheduled_posts
ADD COLUMN status TEXT DEFAULT 'draft'
CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));
```

## RLS — ОБЯЗАТЕЛЬНО

Каждая таблица должна иметь RLS:

```sql
-- Включить RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои записи
CREATE POLICY "Users can view own posts" ON scheduled_posts
  FOR SELECT USING (user_id = auth.uid());

-- Политика: пользователь может создавать свои записи
CREATE POLICY "Users can insert own posts" ON scheduled_posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Политика: пользователь может обновлять свои записи
CREATE POLICY "Users can update own posts" ON scheduled_posts
  FOR UPDATE USING (user_id = auth.uid());

-- Политика: пользователь может удалять свои записи
CREATE POLICY "Users can delete own posts" ON scheduled_posts
  FOR DELETE USING (user_id = auth.uid());
```

## Связи

```sql
-- Foreign Key
ALTER TABLE post_media
ADD CONSTRAINT fk_post
FOREIGN KEY (post_id) REFERENCES scheduled_posts(id)
ON DELETE CASCADE;
```

## Индексы

```sql
-- Для частых запросов
CREATE INDEX idx_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_posts_scheduled_at ON scheduled_posts(scheduled_at);
```

## Функции

```sql
-- Функция с SECURITY DEFINER для обхода RLS (админ-операции)
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM users ORDER BY created_at DESC;
$$;
```

## Триггеры

```sql
-- Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Применение миграций

```bash
supabase db push
```

## Типы данных

- UUID для id
- TIMESTAMPTZ для дат (с таймзоной)
- TEXT для строк (не VARCHAR)
- JSONB для JSON
- INTEGER для чисел
- BOOLEAN для флагов
