-- Таблица платежей для premium клиентов
-- Создано: 2026-01-12

-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'RUB',
  source VARCHAR(50) DEFAULT 'manual',
  payment_method VARCHAR(50) DEFAULT 'card',
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_currency ON payments(currency);

-- Добавляем новые поля в premium_clients если их нет
ALTER TABLE premium_clients
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'card',
ADD COLUMN IF NOT EXISTS has_channel_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_chat_access BOOLEAN DEFAULT false;

-- RLS политики для payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Админы могут всё
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL USING (true);

COMMENT ON TABLE payments IS 'История платежей от premium клиентов';
COMMENT ON COLUMN payments.telegram_id IS 'Telegram ID клиента';
COMMENT ON COLUMN payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN payments.currency IS 'Валюта: RUB, USD, USDT, EUR';
COMMENT ON COLUMN payments.source IS 'Источник: lava.top, manual, и т.д.';
COMMENT ON COLUMN payments.payment_method IS 'Метод оплаты: card, crypto, и т.д.';
