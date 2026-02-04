-- ===========================================
-- Миграция: 056_fix_admin_coin_transactions.sql
-- Описание: Исправление функции получения транзакций (JOIN с users)
-- ===========================================

CREATE OR REPLACE FUNCTION admin_get_user_coin_transactions(
  p_telegram_id BIGINT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  balance_after INTEGER,
  type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.amount,
    ct.balance_after,
    ct.type::TEXT,
    ct.description,
    ct.created_at
  FROM coin_transactions ct
  JOIN users u ON ct.user_id = u.id
  WHERE u.telegram_id = p_telegram_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
