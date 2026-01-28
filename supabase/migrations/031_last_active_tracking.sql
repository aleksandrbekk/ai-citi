-- ===========================================
-- Миграция: 031_last_active_tracking.sql
-- Описание: Добавление отслеживания последней активности
-- ===========================================

-- Добавляем колонку last_active_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

-- Инициализируем значения из updated_at
UPDATE users SET last_active_at = updated_at WHERE last_active_at IS NULL;

-- Функция для обновления времени последней активности
CREATE OR REPLACE FUNCTION update_last_active(p_telegram_id BIGINT)
RETURNS void AS $$
BEGIN
  UPDATE users SET last_active_at = NOW() WHERE telegram_id = p_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Грант на выполнение
GRANT EXECUTE ON FUNCTION update_last_active(BIGINT) TO anon, authenticated;
