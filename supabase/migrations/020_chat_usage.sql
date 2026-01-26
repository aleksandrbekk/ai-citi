-- Таблица для логирования использования чата
-- Создана: 2026-01-26

CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  images_count INTEGER NOT NULL DEFAULT 0,
  model TEXT NOT NULL,
  cost_thb NUMERIC(10, 6) NOT NULL DEFAULT 0,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_chat_usage_user_id ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_created_at ON chat_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_usage_success ON chat_usage(success);

-- RLS
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят только свою статистику
CREATE POLICY "Users can view own chat usage" ON chat_usage
  FOR SELECT USING (user_id = auth.uid());

-- Service role может всё
CREATE POLICY "Service role full access" ON chat_usage
  FOR ALL USING (auth.role() = 'service_role');

-- Комментарии
COMMENT ON TABLE chat_usage IS 'Логирование использования AI-чата для аналитики и биллинга';
COMMENT ON COLUMN chat_usage.cost_thb IS 'Стоимость запроса в тайских батах';
