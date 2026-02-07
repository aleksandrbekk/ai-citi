-- ===========================================
-- Миграция: 065_fix_spend_coins_referral_bonus.sql
-- Описание: Добавляет вызов pay_referral_spend_bonus
-- в spend_coins (фронтенд использует именно её
-- для генерации каруселей через spendCoinsForGeneration)
-- Аналогично миграции 063 для spend_coins_smart
-- ===========================================

CREATE OR REPLACE FUNCTION spend_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
  v_referral_result JSONB;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT coins INTO v_current_coins
  FROM profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current_coins < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough coins',
      'current_balance', v_current_coins,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_current_coins - p_amount;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, -p_amount, v_new_balance, p_type, p_description, p_metadata);

  -- Начисляем реферальный бонус 10% наставнику
  SELECT pay_referral_spend_bonus(p_telegram_id, p_amount) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance,
    'referral_bonus', COALESCE(v_referral_result, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
