-- 068_coach_message_limits.sql
-- Система лимитов сообщений для AI-Coach
-- 20 бесплатных сообщений, потом 30 нейронов за 20 сообщений

CREATE TABLE IF NOT EXISTS coach_message_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  messages_remaining INT NOT NULL DEFAULT 20,
  messages_total_purchased INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс
CREATE INDEX IF NOT EXISTS idx_coach_limits_telegram ON coach_message_limits(telegram_id);

-- RLS
ALTER TABLE coach_message_limits ENABLE ROW LEVEL SECURITY;

-- Получить лимит (автосоздаёт запись если нет)
CREATE OR REPLACE FUNCTION get_coach_limit(p_telegram_id BIGINT)
RETURNS TABLE(messages_remaining INT, messages_total_purchased INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO coach_message_limits (telegram_id, messages_remaining)
  VALUES (p_telegram_id, 20)
  ON CONFLICT (telegram_id) DO NOTHING;

  RETURN QUERY
  SELECT cml.messages_remaining, cml.messages_total_purchased
  FROM coach_message_limits cml
  WHERE cml.telegram_id = p_telegram_id;
END;
$$;

-- Списать 1 сообщение
CREATE OR REPLACE FUNCTION spend_coach_message(p_telegram_id BIGINT)
RETURNS TABLE(success BOOLEAN, messages_remaining INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INT;
BEGIN
  SELECT cml.messages_remaining INTO v_remaining
  FROM coach_message_limits cml
  WHERE cml.telegram_id = p_telegram_id
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining <= 0 THEN
    RETURN QUERY SELECT false, COALESCE(v_remaining, 0);
    RETURN;
  END IF;

  UPDATE coach_message_limits
  SET messages_remaining = messages_remaining - 1, updated_at = NOW()
  WHERE telegram_id = p_telegram_id;

  RETURN QUERY SELECT true, v_remaining - 1;
END;
$$;

-- Купить сообщения (после списания монет)
CREATE OR REPLACE FUNCTION buy_coach_messages(p_telegram_id BIGINT, p_count INT DEFAULT 20)
RETURNS TABLE(success BOOLEAN, messages_remaining INT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Автосоздание если нет записи
  INSERT INTO coach_message_limits (telegram_id, messages_remaining)
  VALUES (p_telegram_id, 0)
  ON CONFLICT (telegram_id) DO NOTHING;

  UPDATE coach_message_limits
  SET messages_remaining = coach_message_limits.messages_remaining + p_count,
      messages_total_purchased = coach_message_limits.messages_total_purchased + p_count,
      updated_at = NOW()
  WHERE coach_message_limits.telegram_id = p_telegram_id;

  RETURN QUERY SELECT true, cml.messages_remaining
  FROM coach_message_limits cml
  WHERE cml.telegram_id = p_telegram_id;
END;
$$;

-- Заполнить всех существующих юзеров 20 сообщениями
INSERT INTO coach_message_limits (telegram_id, messages_remaining)
SELECT telegram_id, 20 FROM users
ON CONFLICT (telegram_id) DO NOTHING;
