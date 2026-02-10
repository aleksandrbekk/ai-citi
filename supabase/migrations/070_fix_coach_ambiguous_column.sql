-- 070_fix_coach_ambiguous_column.sql
-- Фикс: "column reference messages_remaining is ambiguous" в spend_coach_message
-- Проблема: RETURNS TABLE(messages_remaining INT) конфликтует с колонкой таблицы

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

  UPDATE coach_message_limits cml
  SET messages_remaining = cml.messages_remaining - 1, updated_at = NOW()
  WHERE cml.telegram_id = p_telegram_id;

  RETURN QUERY SELECT true, v_remaining - 1;
END;
$$;

GRANT EXECUTE ON FUNCTION spend_coach_message(BIGINT) TO anon, authenticated;
