-- Добавляем колонку email для пользователей (для школы)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
