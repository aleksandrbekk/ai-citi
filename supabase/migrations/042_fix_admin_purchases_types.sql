-- ===========================================
-- Миграция: 042_fix_admin_purchases_types.sql
-- Описание: Исправить типы в admin_get_coin_purchases (TEXT -> VARCHAR)
-- ===========================================

DROP FUNCTION IF EXISTS admin_get_coin_purchases();

CREATE OR REPLACE FUNCTION admin_get_coin_purchases()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  telegram_id BIGINT,
  username VARCHAR(100),
  amount INTEGER,
  balance_after INTEGER,
  type VARCHAR(50),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.user_id,
    u.telegram_id,
    u.username,
    ct.amount,
    ct.balance_after,
    ct.type,
    ct.description,
    ct.metadata,
    ct.created_at
  FROM coin_transactions ct
  LEFT JOIN users u ON u.id = ct.user_id
  WHERE ct.type = 'purchase'
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_coin_purchases() TO anon, authenticated;
