-- ===========================================
-- Миграция: 041_admin_purchases_with_user.sql
-- Описание: Добавить username и telegram_id в admin_get_coin_purchases
-- ===========================================

-- Удаляем старую функцию (сигнатура меняется)
DROP FUNCTION IF EXISTS admin_get_coin_purchases();

-- Создаём функцию с новыми полями
CREATE OR REPLACE FUNCTION admin_get_coin_purchases()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  telegram_id BIGINT,
  username TEXT,
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

-- Грант
GRANT EXECUTE ON FUNCTION admin_get_coin_purchases() TO anon, authenticated;
