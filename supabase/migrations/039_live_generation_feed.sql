-- ===========================================
-- Миграция: 039_live_generation_feed.sql
-- Описание: Live-лента генераций для админки
-- ===========================================

-- Функция для получения последних генераций с информацией о пользователе
CREATE OR REPLACE FUNCTION admin_get_live_generations(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  telegram_id BIGINT,
  username VARCHAR(100),
  first_name VARCHAR(100),
  photo_url TEXT,
  amount INTEGER,
  style TEXT,
  created_at TIMESTAMPTZ,
  seconds_ago INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.user_id,
    u.telegram_id,
    u.username,
    u.first_name,
    u.photo_url,
    ct.amount,
    COALESCE((ct.metadata->>'style')::TEXT, 'unknown') as style,
    ct.created_at,
    EXTRACT(EPOCH FROM (NOW() - ct.created_at))::INTEGER as seconds_ago
  FROM coin_transactions ct
  JOIN users u ON u.id = ct.user_id
  WHERE ct.type = 'generation'
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Грант на выполнение
GRANT EXECUTE ON FUNCTION admin_get_live_generations(INTEGER) TO anon, authenticated;
