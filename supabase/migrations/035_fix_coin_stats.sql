-- ===========================================
-- Миграция: 035_fix_coin_stats.sql
-- Описание: Исправление функций для статистики монет
-- ===========================================

-- spend_coins function
CREATE OR REPLACE FUNCTION spend_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT u.id INTO v_user_id FROM users u WHERE u.telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'User not found'); END IF;
  SELECT coins INTO v_current_coins FROM profiles WHERE user_id = v_user_id FOR UPDATE;
  IF v_current_coins IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Profile not found'); END IF;
  IF v_current_coins < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins', 'current_balance', v_current_coins, 'required', p_amount);
  END IF;
  v_new_balance := v_current_coins - p_amount;
  UPDATE profiles SET coins = v_new_balance, updated_at = NOW() WHERE user_id = v_user_id;
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, -p_amount, v_new_balance, p_type, p_description, p_metadata);
  RETURN jsonb_build_object('success', true, 'previous_balance', v_current_coins, 'spent', p_amount, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_get_carousel_refunds
CREATE OR REPLACE FUNCTION admin_get_carousel_refunds()
RETURNS TABLE (id UUID, user_id UUID, telegram_id BIGINT, username VARCHAR(100), amount INTEGER, balance_after INTEGER, description TEXT, metadata JSONB, created_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY SELECT ct.id, ct.user_id, u.telegram_id, u.username, ct.amount, ct.balance_after, ct.description, ct.metadata, ct.created_at
  FROM coin_transactions ct JOIN users u ON u.id = ct.user_id
  WHERE ct.type = 'bonus' AND (ct.metadata->>'source') = 'refund'
  ORDER BY ct.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_get_carousel_stats_summary
CREATE OR REPLACE FUNCTION admin_get_carousel_stats_summary()
RETURNS TABLE (total_generations BIGINT, total_refunds BIGINT, total_coins_spent BIGINT, total_coins_refunded BIGINT, week_generations BIGINT, week_refunds BIGINT) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'generation'),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund'),
    (SELECT COALESCE(SUM(ABS(amount)), 0)::BIGINT FROM coin_transactions WHERE type = 'generation'),
    (SELECT COALESCE(SUM(amount), 0)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund'),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'generation' AND created_at >= (NOW() - INTERVAL '7 days')),
    (SELECT COUNT(*)::BIGINT FROM coin_transactions WHERE type = 'bonus' AND (metadata->>'source') = 'refund' AND created_at >= (NOW() - INTERVAL '7 days'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_get_carousel_stats_by_user
CREATE OR REPLACE FUNCTION admin_get_carousel_stats_by_user()
RETURNS TABLE (user_id UUID, telegram_id BIGINT, username VARCHAR(100), generations_count BIGINT, refunds_count BIGINT, coins_spent BIGINT, coins_refunded BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.telegram_id, u.username,
    COALESCE(gen.cnt, 0)::BIGINT, COALESCE(ref.cnt, 0)::BIGINT, COALESCE(gen.spent, 0)::BIGINT, COALESCE(ref.refunded, 0)::BIGINT
  FROM users u
  LEFT JOIN (SELECT ct.user_id, COUNT(*) AS cnt, SUM(ABS(ct.amount)) AS spent FROM coin_transactions ct WHERE ct.type = 'generation' GROUP BY ct.user_id) gen ON gen.user_id = u.id
  LEFT JOIN (SELECT ct.user_id, COUNT(*) AS cnt, SUM(ct.amount) AS refunded FROM coin_transactions ct WHERE ct.type = 'bonus' AND (ct.metadata->>'source') = 'refund' GROUP BY ct.user_id) ref ON ref.user_id = u.id
  WHERE (gen.cnt IS NOT NULL AND gen.cnt > 0) OR (ref.cnt IS NOT NULL AND ref.cnt > 0)
  ORDER BY COALESCE(gen.cnt, 0) + COALESCE(ref.cnt, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION spend_coins(BIGINT, INTEGER, VARCHAR, TEXT, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_refunds() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_stats_summary() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_carousel_stats_by_user() TO anon, authenticated;
