-- ===========================================
-- Миграция: 066_utm_stats_functions.sql
-- Описание: RPC-функции для трекинга UTM статистики
-- (clicks, unique_clicks, registrations)
-- ===========================================

-- Таблица для отслеживания уникальных кликов
CREATE TABLE IF NOT EXISTS utm_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT NOT NULL,
  telegram_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(short_code, telegram_id)
);

ALTER TABLE utm_clicks ENABLE ROW LEVEL SECURITY;

-- Инкремент кликов (вызывается из telegram-bot-webhook при /start ref_XX_src_TAG)
CREATE OR REPLACE FUNCTION increment_utm_clicks(p_short_code TEXT, p_telegram_id BIGINT)
RETURNS VOID AS $$
DECLARE
  v_is_new BOOLEAN := false;
BEGIN
  -- Всегда инкрементим общий счётчик кликов
  UPDATE utm_campaigns
  SET clicks = clicks + 1
  WHERE short_code = p_short_code;

  -- Проверяем уникальность
  INSERT INTO utm_clicks (short_code, telegram_id)
  VALUES (p_short_code, p_telegram_id)
  ON CONFLICT (short_code, telegram_id) DO NOTHING
  RETURNING true INTO v_is_new;

  -- Если клик уникальный — инкрементим unique_clicks
  IF v_is_new THEN
    UPDATE utm_campaigns
    SET unique_clicks = unique_clicks + 1
    WHERE short_code = p_short_code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Инкремент регистраций (вызывается из auth-telegram при создании нового юзера)
CREATE OR REPLACE FUNCTION increment_utm_registrations(p_short_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE utm_campaigns
  SET registrations = registrations + 1
  WHERE short_code = p_short_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
