-- ===========================================
-- Миграция: 037_referral_10_percent_spend_only.sql
-- Описание: Изменение реферальной системы
-- БЫЛО: +2 за регистрацию, 20% от покупок, 20% от трат
-- СТАЛО: ТОЛЬКО 10% от трат партнёра
-- ===========================================

-- ===========================================
-- 1. ОБНОВЛЯЕМ ФУНКЦИЮ ТРАТЫ (10% вместо 20%)
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

  -- Рассчитываем 10% бонус (минимум 1)
  v_bonus := GREATEST(1, FLOOR(p_coins_spent * 0.10));

  -- Начисляем бонус рефереру
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    v_bonus,
    'referral',
    'Бонус 10% от траты партнёра (' || p_coins_spent || ' нейронов)',
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
-- 2. ОТКЛЮЧАЕМ БОНУС ЗА ПОКУПКУ (возвращаем пустой результат)
-- ===========================================
CREATE OR REPLACE FUNCTION pay_referral_purchase_bonus(
  p_buyer_telegram_id BIGINT,
  p_coins_purchased INTEGER
)
RETURNS JSONB AS $$
BEGIN
  -- Бонус за покупку отключён
  -- Оставляем только бонус за траты (10%)
  RETURN jsonb_build_object('success', true, 'has_referrer', false, 'bonus_disabled', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. ОТКЛЮЧАЕМ БОНУС ЗА РЕГИСТРАЦИЮ
-- ===========================================
CREATE OR REPLACE FUNCTION pay_referral_registration_bonus(
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
BEGIN
  -- Бонус за регистрацию отключён
  -- Оставляем только бонус за траты (10%)
  -- Но всё ещё отмечаем реферала как обработанного
  UPDATE referrals SET bonus_paid = TRUE
  WHERE referred_telegram_id = p_referred_telegram_id AND bonus_paid = FALSE;

  RETURN jsonb_build_object('success', true, 'coins_paid', 0, 'bonus_disabled', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. ОБНОВЛЯЕМ ТРИГГЕР РЕГИСТРАЦИИ (без начисления бонуса)
-- ===========================================
CREATE OR REPLACE FUNCTION process_referral_on_user_create()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_already_referred BOOLEAN;
BEGIN
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code != '' THEN
    SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
    FROM users WHERE referral_code = NEW.referred_by_code;

    IF v_referrer_user_id IS NOT NULL AND v_referrer_telegram_id != NEW.telegram_id THEN
      SELECT EXISTS(
        SELECT 1 FROM referrals WHERE referred_telegram_id = NEW.telegram_id
      ) INTO v_already_referred;

      IF v_already_referred THEN
        RETURN NEW;
      END IF;

      -- Создаём связь (бонус сразу отмечаем как выплаченный, т.к. его нет)
      INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
      VALUES (v_referrer_user_id, NEW.id, v_referrer_telegram_id, NEW.telegram_id, TRUE)
      ON CONFLICT DO NOTHING;

      -- Обновляем статистику (только счётчик партнёров, без монет)
      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 0)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        updated_at = NOW();

      -- НЕ начисляем бонус за регистрацию (отключён)
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. КОММЕНТАРИЙ О ИЗМЕНЕНИЯХ
-- ===========================================
COMMENT ON FUNCTION pay_referral_spend_bonus IS 'Начисляет 10% от траты партнёра рефереру (единственный активный бонус)';
COMMENT ON FUNCTION pay_referral_purchase_bonus IS 'ОТКЛЮЧЕНО: Бонус за покупку больше не начисляется';
COMMENT ON FUNCTION pay_referral_registration_bonus IS 'ОТКЛЮЧЕНО: Бонус за регистрацию больше не начисляется';
