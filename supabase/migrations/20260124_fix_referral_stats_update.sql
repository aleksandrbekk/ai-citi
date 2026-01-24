-- Fix: Обновляем spend_coins чтобы она вызывала pay_referral_spend_bonus
-- и добавляем корректное обновление статистики

-- ===========================================
-- 1. Функция начисления бонуса при покупке
-- ===========================================
CREATE OR REPLACE FUNCTION pay_referral_purchase_bonus(
  p_buyer_telegram_id BIGINT,
  p_coins_purchased INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_bonus INTEGER;
  v_result JSONB;
BEGIN
  -- Находим реферера этого пользователя
  SELECT r.referrer_telegram_id, r.referrer_user_id
  INTO v_referral
  FROM referrals r
  WHERE r.referred_telegram_id = p_buyer_telegram_id;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', true, 'has_referrer', false);
  END IF;

  -- Рассчитываем 20% бонус (минимум 1)
  v_bonus := GREATEST(1, FLOOR(p_coins_purchased * 0.20));

  -- Начисляем бонус рефереру
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    v_bonus,
    'referral',
    'Бонус 20% от покупки партнёра (' || p_coins_purchased || ' монет)',
    jsonb_build_object('buyer_telegram_id', p_buyer_telegram_id, 'coins_purchased', p_coins_purchased, 'bonus_type', 'purchase')
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- Обновляем статистику
  UPDATE referral_stats
  SET
    total_coins_earned = total_coins_earned + v_bonus,
    total_partner_purchased = total_partner_purchased + p_coins_purchased,
    updated_at = NOW()
  WHERE user_id = v_referral.referrer_user_id;

  RETURN jsonb_build_object('success', true, 'has_referrer', true, 'bonus_paid', v_bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. Функция начисления бонуса при трате
-- ===========================================
CREATE OR REPLACE FUNCTION pay_referral_spend_bonus(
  p_spender_telegram_id BIGINT,
  p_coins_spent INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_bonus INTEGER;
  v_result JSONB;
BEGIN
  -- Находим реферера этого пользователя
  SELECT r.referrer_telegram_id, r.referrer_user_id
  INTO v_referral
  FROM referrals r
  WHERE r.referred_telegram_id = p_spender_telegram_id;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', true, 'has_referrer', false);
  END IF;

  -- Рассчитываем 20% бонус (минимум 1)
  v_bonus := GREATEST(1, FLOOR(p_coins_spent * 0.20));

  -- Начисляем бонус рефереру
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    v_bonus,
    'referral',
    'Бонус 20% от траты партнёра (' || p_coins_spent || ' монет)',
    jsonb_build_object('spender_telegram_id', p_spender_telegram_id, 'coins_spent', p_coins_spent, 'bonus_type', 'spend')
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- Обновляем статистику
  UPDATE referral_stats
  SET
    total_coins_earned = total_coins_earned + v_bonus,
    total_partner_spent = total_partner_spent + p_coins_spent,
    updated_at = NOW()
  WHERE user_id = v_referral.referrer_user_id;

  RETURN jsonb_build_object('success', true, 'has_referrer', true, 'bonus_paid', v_bonus);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. Обновлённая функция spend_coins с вызовом реферального бонуса
-- ===========================================
CREATE OR REPLACE FUNCTION spend_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type VARCHAR(50),
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
  -- Получаем user_id по telegram_id
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Получаем текущий баланс
  SELECT coins INTO v_current_coins
  FROM profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Проверяем достаточно ли монет
  IF v_current_coins < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough coins',
      'current_balance', v_current_coins,
      'required', p_amount
    );
  END IF;

  -- Списываем монеты
  v_new_balance := v_current_coins - p_amount;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Записываем транзакцию
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, -p_amount, v_new_balance, p_type, p_description, p_metadata);

  -- Начисляем бонус рефереру (20% от траты)
  SELECT pay_referral_spend_bonus(p_telegram_id, p_amount) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance,
    'referral_bonus', v_referral_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
