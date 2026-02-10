-- 071_coach_chat_sessions.sql
-- Синхронизация чата AI-Coach через Supabase (вместо localStorage)

CREATE TABLE IF NOT EXISTS coach_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  title TEXT DEFAULT 'Новая сессия',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_sessions_telegram ON coach_chat_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_coach_sessions_active ON coach_chat_sessions(telegram_id, is_active) WHERE is_active = true;

ALTER TABLE coach_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Получить все сессии юзера
CREATE OR REPLACE FUNCTION get_coach_sessions(p_telegram_id BIGINT)
RETURNS TABLE(
  session_id UUID,
  title TEXT,
  messages JSONB,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.title, s.messages, s.is_active, s.created_at, s.updated_at
  FROM coach_chat_sessions s
  WHERE s.telegram_id = p_telegram_id
  ORDER BY s.updated_at DESC
  LIMIT 20;
END;
$$;

-- Создать/обновить сессию
CREATE OR REPLACE FUNCTION upsert_coach_session(
  p_telegram_id BIGINT,
  p_session_id UUID,
  p_title TEXT,
  p_messages JSONB,
  p_is_active BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Если is_active = true, снимаем active с других сессий этого юзера
  IF p_is_active THEN
    UPDATE coach_chat_sessions
    SET is_active = false, updated_at = NOW()
    WHERE coach_chat_sessions.telegram_id = p_telegram_id AND coach_chat_sessions.is_active = true AND coach_chat_sessions.id != p_session_id;
  END IF;

  INSERT INTO coach_chat_sessions (id, telegram_id, title, messages, is_active, updated_at)
  VALUES (p_session_id, p_telegram_id, p_title, p_messages, p_is_active, NOW())
  ON CONFLICT (id) DO UPDATE
  SET title = EXCLUDED.title,
      messages = EXCLUDED.messages,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
  RETURNING coach_chat_sessions.id INTO v_id;

  RETURN v_id;
END;
$$;

-- Удалить сессию
CREATE OR REPLACE FUNCTION delete_coach_session(p_telegram_id BIGINT, p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM coach_chat_sessions
  WHERE coach_chat_sessions.id = p_session_id AND coach_chat_sessions.telegram_id = p_telegram_id;
  RETURN FOUND;
END;
$$;

-- Гранты
GRANT EXECUTE ON FUNCTION get_coach_sessions(BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_coach_session(BIGINT, UUID, TEXT, JSONB, BOOLEAN) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_coach_session(BIGINT, UUID) TO anon, authenticated;
