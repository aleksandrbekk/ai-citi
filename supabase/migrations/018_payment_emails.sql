-- ===========================================
-- Миграция: 018_payment_emails.sql
-- Описание: Таблица для связи email с telegram_id для платежей
-- ===========================================

-- Таблица для хранения email пользователей для платежей
CREATE TABLE IF NOT EXISTS payment_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payment_emails_telegram_id ON payment_emails(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payment_emails_email ON payment_emails(email);

-- RLS
ALTER TABLE payment_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payment email" ON payment_emails
  FOR ALL USING (true) WITH CHECK (true);

-- Функция для получения telegram_id по email
CREATE OR REPLACE FUNCTION get_telegram_id_by_email(p_email VARCHAR)
RETURNS BIGINT AS $$
DECLARE
  v_telegram_id BIGINT;
BEGIN
  SELECT telegram_id INTO v_telegram_id
  FROM payment_emails
  WHERE LOWER(email) = LOWER(p_email);

  RETURN v_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для начисления монет после оплаты
CREATE OR REPLACE FUNCTION process_lava_payment(
  p_email VARCHAR,
  p_amount INTEGER DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
  v_telegram_id BIGINT;
  v_result JSONB;
BEGIN
  -- Находим telegram_id по email
  SELECT telegram_id INTO v_telegram_id
  FROM payment_emails
  WHERE LOWER(email) = LOWER(p_email);

  IF v_telegram_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email not found');
  END IF;

  -- Начисляем монеты
  SELECT add_coins(
    v_telegram_id,
    p_amount,
    'purchase',
    'Покупка ' || p_amount || ' монет через Lava.top',
    jsonb_build_object('email', p_email, 'source', 'lava.top')
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
