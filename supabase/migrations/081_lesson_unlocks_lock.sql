-- Добавляем возможность принудительно ЗАКРЫТЬ урок
ALTER TABLE lesson_unlocks ADD COLUMN is_locked BOOLEAN DEFAULT false;
