-- ===========================================
-- Миграция: 055_processed_lava_payments.sql
-- Описание: Таблица для защиты от дублирования webhook платежей
-- ===========================================

-- Создаём таблицу для отслеживания обработанных платежей Lava.top
CREATE TABLE IF NOT EXISTS processed_lava_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT UNIQUE NOT NULL,
  telegram_id BIGINT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_processed_lava_contract ON processed_lava_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_processed_lava_telegram ON processed_lava_payments(telegram_id);

-- RLS
ALTER TABLE processed_lava_payments ENABLE ROW LEVEL SECURITY;

-- Только сервисный ключ может работать с этой таблицей
CREATE POLICY "Service role full access" ON processed_lava_payments
  FOR ALL USING (true) WITH CHECK (true);

-- Комментарий
COMMENT ON TABLE processed_lava_payments IS 'Таблица для предотвращения повторной обработки webhook платежей от Lava.top';
