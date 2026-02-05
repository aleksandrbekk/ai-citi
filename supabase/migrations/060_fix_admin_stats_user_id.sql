-- 060_fix_admin_stats_user_id.sql
-- Исправление: admin_get_user_full_stats и admin_get_user_coin_transactions
-- искали по telegram_id в coin_transactions, но add_coins/spend_coins вставляют с user_id
-- Результат: статистика показывала нули

-- ===========================================
-- 1. Исправленная полная статистика
-- ===========================================
CREATE OR REPLACE FUNCTION admin_get_user_full_stats(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_subscription JSONB;
  v_styles JSONB;
  v_coin_stats JSONB;
  v_payment_stats JSONB;
BEGIN
  -- Получаем user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;

  -- Подписка
  SELECT jsonb_build_object(
    'id', us.id,
    'plan', us.plan,
    'status', us.status,
    'started_at', us.started_at,
    'expires_at', us.expires_at,
    'next_charge_at', us.next_charge_at,
    'amount_rub', us.amount_rub,
    'neurons_per_month', us.neurons_per_month,
    'lava_contract_id', us.lava_contract_id,
    'days_remaining', CASE
      WHEN us.expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM us.expires_at - NOW())::INTEGER)
    END
  ) INTO v_subscription
  FROM user_subscriptions us
  WHERE us.telegram_id = p_telegram_id
    AND us.status = 'active'
  ORDER BY us.created_at DESC
  LIMIT 1;

  -- Купленные стили
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'style_id', ups.style_id,
      'price_paid', ups.price_paid,
      'purchased_at', ups.purchased_at
    ) ORDER BY ups.purchased_at DESC
  ), '[]'::jsonb) INTO v_styles
  FROM user_purchased_styles ups
  WHERE ups.telegram_id = p_telegram_id;

  -- Статистика монет — ИСПРАВЛЕНО: ищем по user_id вместо telegram_id
  SELECT jsonb_build_object(
    'balance', COALESCE((
      SELECT p.coins FROM profiles p WHERE p.user_id = v_user_id
    ), 0),
    'total_spent', COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.amount < 0)), 0),
    'total_earned', COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0), 0),
    'spent_on_generations', COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.amount < 0 AND ct.type = 'generation')), 0),
    'spent_on_styles', COALESCE(ABS(SUM(ct.amount) FILTER (WHERE ct.amount < 0 AND ct.type = 'style_purchase')), 0),
    'earned_from_referrals', COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0 AND ct.type = 'referral'), 0),
    'earned_from_purchases', COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0 AND ct.type = 'purchase'), 0),
    'earned_from_bonuses', COALESCE(SUM(ct.amount) FILTER (WHERE ct.amount > 0 AND ct.type = 'bonus'), 0),
    'transactions_count', COUNT(*)
  ) INTO v_coin_stats
  FROM coin_transactions ct
  WHERE ct.user_id = v_user_id;

  -- Статистика платежей
  SELECT jsonb_build_object(
    'total_paid_rub', COALESCE(SUM(amount) FILTER (WHERE currency = 'RUB'), 0),
    'total_paid_usd', COALESCE(SUM(amount) FILTER (WHERE currency = 'USD'), 0),
    'payments_count', COUNT(*),
    'last_payment_at', MAX(paid_at)
  ) INTO v_payment_stats
  FROM payments
  WHERE telegram_id = p_telegram_id;

  -- Собираем результат
  v_result := jsonb_build_object(
    'subscription', v_subscription,
    'purchased_styles', v_styles,
    'coin_stats', v_coin_stats,
    'payment_stats', v_payment_stats
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================
-- 2. Исправленные транзакции монет
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
DECLARE
  v_user_id UUID;
BEGIN
  -- Получаем user_id
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  RETURN QUERY
  SELECT
    ct.id,
    ct.amount,
    ct.balance_after,
    ct.type::TEXT,
    ct.description,
    ct.created_at
  FROM coin_transactions ct
  WHERE ct.user_id = v_user_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
