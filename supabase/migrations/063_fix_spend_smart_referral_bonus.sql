-- ===========================================
-- Миграция: 063_fix_spend_smart_referral_bonus.sql
-- Описание: Добавляет вызов pay_referral_spend_bonus
-- в spend_coins_smart (фронтенд использует именно её,
-- а не spend_coins, где бонус уже был)
-- ===========================================

CREATE OR REPLACE FUNCTION spend_coins_smart(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_from_gift INTEGER := 0;
  v_from_coins INTEGER := 0;
  v_remaining INTEGER;
  v_referral_result JSONB;
BEGIN
  -- Получаем текущие балансы
  SELECT coins, COALESCE(gift_coins, 0) as gift_coins
  INTO v_profile
  FROM profiles
  WHERE telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Проверяем достаточно ли монет
  IF (v_profile.coins + v_profile.gift_coins) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  -- Списываем сначала gift_coins
  IF v_profile.gift_coins >= p_amount THEN
    v_from_gift := p_amount;
  ELSE
    v_from_gift := v_profile.gift_coins;
    v_from_coins := p_amount - v_from_gift;
  END IF;

  -- Обновляем балансы
  UPDATE profiles
  SET
    gift_coins = COALESCE(gift_coins, 0) - v_from_gift,
    coins = coins - v_from_coins
  WHERE telegram_id = p_telegram_id;

  -- Записываем транзакцию
  INSERT INTO coin_transactions (telegram_id, amount, type, description)
  VALUES (p_telegram_id, -p_amount, 'spend', p_description);

  -- Начисляем реферальный бонус 10% наставнику
  SELECT pay_referral_spend_bonus(p_telegram_id, p_amount) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'from_gift', v_from_gift,
    'from_coins', v_from_coins,
    'new_balance', v_profile.coins - v_from_coins,
    'new_gift_balance', v_profile.gift_coins - v_from_gift,
    'referral_bonus', COALESCE(v_referral_result, '{}'::jsonb)
  );
END;
$$;
