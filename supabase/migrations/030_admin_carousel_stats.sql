-- ===========================================
-- Миграция: 030_admin_carousel_stats.sql
-- Описание: Admin функции для статистики каруселей
-- ===========================================

-- Функция для получения всех покупок монет (только для админов)
CREATE OR REPLACE FUNCTION admin_get_coin_purchases()
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
    ct.amount,
    ct.balance_after,
    ct.type,
    ct.description,
    ct.metadata,
    ct.created_at
  FROM coin_transactions ct
  WHERE ct.type = 'purchase'
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения всех генераций каруселей (только для админов)
CREATE OR REPLACE FUNCTION admin_get_carousel_generations()
RETURNS TABLE (
  id UUID,
  user_id UUID,
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
    ct.amount,
    ct.balance_after,
    ct.type,
    ct.description,
    ct.metadata,
    ct.created_at
  FROM coin_transactions ct
  WHERE ct.type = 'generation'
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Грант на выполнение для anon и authenticated
GRANT EXECUTE ON FUNCTION admin_get_coin_purchases() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_generations() TO anon, authenticated;
