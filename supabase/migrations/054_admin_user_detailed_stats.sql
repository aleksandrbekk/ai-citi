-- 054_admin_user_detailed_stats.sql
-- Функции для получения детальной статистики пользователя в админке

-- ===========================================
-- 1. Полная статистика пользователя
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

  -- Статистика монет
  SELECT jsonb_build_object(
    'balance', COALESCE((
      SELECT balance_after FROM coin_transactions
      WHERE telegram_id = p_telegram_id
      ORDER BY created_at DESC
      LIMIT 1
    ), 0),
    'total_spent', COALESCE(ABS(SUM(amount) FILTER (WHERE amount < 0)), 0),
    'total_earned', COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0),
    'spent_on_generations', COALESCE(ABS(SUM(amount) FILTER (WHERE amount < 0 AND type = 'generation')), 0),
    'spent_on_styles', COALESCE(ABS(SUM(amount) FILTER (WHERE amount < 0 AND type = 'style_purchase')), 0),
    'earned_from_referrals', COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type = 'referral'), 0),
    'earned_from_purchases', COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type = 'purchase'), 0),
    'earned_from_bonuses', COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND type = 'bonus'), 0),
    'transactions_count', COUNT(*)
  ) INTO v_coin_stats
  FROM coin_transactions
  WHERE telegram_id = p_telegram_id;

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. Последние транзакции монет пользователя
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
    ct.type,
    ct.description,
    ct.created_at
  FROM coin_transactions ct
  WHERE ct.telegram_id = p_telegram_id
  ORDER BY ct.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. Активация подписки вручную
-- ===========================================
CREATE OR REPLACE FUNCTION admin_activate_subscription(
  p_telegram_id BIGINT,
  p_plan TEXT,
  p_months INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_subscription_id UUID;
  v_neurons INTEGER;
  v_amount INTEGER;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Получаем user_id
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Определяем параметры подписки
  IF p_plan = 'pro' THEN
    v_neurons := 150;
    v_amount := 2900;
  ELSIF p_plan = 'elite' THEN
    v_neurons := 600;
    v_amount := 9900;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan');
  END IF;

  -- Дата истечения
  v_expires_at := NOW() + (p_months || ' months')::INTERVAL;

  -- Деактивируем старые подписки
  UPDATE user_subscriptions
  SET status = 'cancelled'
  WHERE telegram_id = p_telegram_id
    AND status = 'active';

  -- Создаём новую подписку
  INSERT INTO user_subscriptions (
    user_id, telegram_id, plan, status,
    started_at, expires_at, amount_rub, neurons_per_month
  ) VALUES (
    v_user_id, p_telegram_id, p_plan, 'active',
    NOW(), v_expires_at, v_amount, v_neurons
  )
  RETURNING id INTO v_subscription_id;

  -- Начисляем нейроны
  INSERT INTO coin_transactions (telegram_id, amount, type, description)
  VALUES (p_telegram_id, v_neurons, 'subscription', 'Начисление нейронов по подписке ' || UPPER(p_plan) || ' (админ)');

  -- Обновляем профиль
  UPDATE profiles
  SET subscription = p_plan
  WHERE telegram_id = p_telegram_id;

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'plan', p_plan,
    'expires_at', v_expires_at,
    'neurons_added', v_neurons
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. Деактивация подписки
-- ===========================================
CREATE OR REPLACE FUNCTION admin_deactivate_subscription(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  -- Деактивируем все активные подписки
  UPDATE user_subscriptions
  SET status = 'cancelled'
  WHERE telegram_id = p_telegram_id
    AND status = 'active';

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Обновляем профиль
  UPDATE profiles
  SET subscription = 'free'
  WHERE telegram_id = p_telegram_id;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_count', v_updated_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. Продление подписки
-- ===========================================
CREATE OR REPLACE FUNCTION admin_extend_subscription(
  p_telegram_id BIGINT,
  p_months INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Получаем активную подписку
  SELECT * INTO v_subscription
  FROM user_subscriptions
  WHERE telegram_id = p_telegram_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_subscription IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
  END IF;

  -- Вычисляем новую дату
  IF v_subscription.expires_at > NOW() THEN
    v_new_expires_at := v_subscription.expires_at + (p_months || ' months')::INTERVAL;
  ELSE
    v_new_expires_at := NOW() + (p_months || ' months')::INTERVAL;
  END IF;

  -- Обновляем подписку
  UPDATE user_subscriptions
  SET expires_at = v_new_expires_at
  WHERE id = v_subscription.id;

  RETURN jsonb_build_object(
    'success', true,
    'old_expires_at', v_subscription.expires_at,
    'new_expires_at', v_new_expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. Комментарии
-- ===========================================
COMMENT ON FUNCTION admin_get_user_full_stats IS 'Получить полную статистику пользователя для админки';
COMMENT ON FUNCTION admin_get_user_coin_transactions IS 'Получить последние транзакции монет пользователя';
COMMENT ON FUNCTION admin_activate_subscription IS 'Активировать подписку пользователю вручную';
COMMENT ON FUNCTION admin_deactivate_subscription IS 'Деактивировать подписку пользователя';
COMMENT ON FUNCTION admin_extend_subscription IS 'Продлить подписку пользователя';
