-- ===========================================
-- Миграция: 032_admin_carousel_refunds_and_by_user.sql
-- Описание: Admin функции для возвратов и статистики каруселей по пользователям
-- ===========================================

-- Возвраты монет за ошибки генерации (type=bonus, metadata.source=refund)
CREATE OR REPLACE FUNCTION admin_get_carousel_refunds()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  telegram_id BIGINT,
  username VARCHAR(100),
  amount INTEGER,
  balance_after INTEGER,
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
    ct.description,
    ct.metadata,
    ct.created_at
  FROM coin_transactions ct
  JOIN users u ON u.id = ct.user_id
  WHERE ct.type = 'bonus'
    AND (ct.metadata->>'source') = 'refund'
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Сводка: генерации, возвраты, за неделю (для карточек)
CREATE OR REPLACE FUNCTION admin_get_carousel_stats_summary()
RETURNS TABLE (
  total_generations BIGINT,
  total_refunds BIGINT,
  total_coins_spent BIGINT,
  total_coins_refunded BIGINT,
  week_generations BIGINT,
  week_refunds BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'generation'),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund'),
    (SELECT COALESCE(SUM(ABS(amount)), 0)::BIGINT FROM coin_transactions WHERE type = 'generation'),
    (SELECT COALESCE(SUM(amount), 0)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund'),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'generation' AND created_at >= (NOW() - INTERVAL '7 days')),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund' AND created_at >= (NOW() - INTERVAL '7 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- По пользователям: сколько генераций, сколько возвратов, потрачено/возвращено монет
CREATE OR REPLACE FUNCTION admin_get_carousel_stats_by_user()
RETURNS TABLE (
  user_id UUID,
  telegram_id BIGINT,
  username VARCHAR(100),
  generations_count BIGINT,
  refunds_count BIGINT,
  coins_spent BIGINT,
  coins_refunded BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS user_id,
    u.telegram_id,
    u.username,
    COALESCE(gen.cnt, 0)::BIGINT AS generations_count,
    COALESCE(ref.cnt, 0)::BIGINT AS refunds_count,
    COALESCE(gen.spent, 0)::BIGINT AS coins_spent,
    COALESCE(ref.refunded, 0)::BIGINT AS coins_refunded
  FROM users u
  LEFT JOIN (
    SELECT ct.user_id, COUNT(*) AS cnt, SUM(ABS(ct.amount)) AS spent
    FROM coin_transactions ct
    WHERE ct.type = 'generation'
    GROUP BY ct.user_id
  ) gen ON gen.user_id = u.id
  LEFT JOIN (
    SELECT ct.user_id, COUNT(*) AS cnt, SUM(ct.amount) AS refunded
    FROM coin_transactions ct
    WHERE ct.type = 'bonus' AND (ct.metadata->>'source') = 'refund'
    GROUP BY ct.user_id
  ) ref ON ref.user_id = u.id
  WHERE (gen.cnt IS NOT NULL AND gen.cnt > 0) OR (ref.cnt IS NOT NULL AND ref.cnt > 0)
  ORDER BY COALESCE(gen.cnt, 0) + COALESCE(ref.cnt, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION admin_get_carousel_refunds() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_stats_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_stats_by_user() TO anon, authenticated;
