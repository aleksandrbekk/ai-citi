-- ===========================================
-- Миграция: 036_reduce_referral_bonus.sql
-- Описание: Изменение бонуса за реферала с 6 на 1 монету
-- ===========================================

-- Обновляем триггер-функцию для автоматической регистрации рефералов
CREATE OR REPLACE FUNCTION process_referral_on_user_create()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_already_referred BOOLEAN;
  v_result JSONB;
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

      INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
      VALUES (v_referrer_user_id, NEW.id, v_referrer_telegram_id, NEW.telegram_id, TRUE)
      ON CONFLICT DO NOTHING;

      -- Обновляем статистику (1 монета вместо 6)
      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 1)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        total_coins_earned = referral_stats.total_coins_earned + 1,
        updated_at = NOW();

      -- Используем add_coins для создания транзакции (1 монета)
      SELECT add_coins(
        v_referrer_telegram_id,
        1,
        'referral',
        'Бонус за регистрацию партнёра (TG: ' || NEW.telegram_id || ')',
        jsonb_build_object('referred_telegram_id', NEW.telegram_id, 'bonus_type', 'registration')
      ) INTO v_result;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем функцию выплаты бонуса за регистрацию
CREATE OR REPLACE FUNCTION pay_referral_registration_bonus(
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_result JSONB;
BEGIN
  SELECT r.*, u.id as referrer_user_id
  INTO v_referral
  FROM referrals r
  JOIN users u ON r.referrer_user_id = u.id
  WHERE r.referred_telegram_id = p_referred_telegram_id
    AND r.bonus_paid = FALSE;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No unpaid referral found');
  END IF;

  -- Начисляем 1 монету рефереру (было 6)
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    1,
    'referral',
    'Бонус за регистрацию партнёра (TG: ' || p_referred_telegram_id || ')',
    jsonb_build_object('referred_telegram_id', p_referred_telegram_id, 'bonus_type', 'registration')
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  UPDATE referrals SET bonus_paid = TRUE WHERE id = v_referral.id;

  UPDATE referral_stats
  SET total_coins_earned = total_coins_earned + 1, updated_at = NOW()
  WHERE user_id = v_referral.referrer_user_id;

  RETURN jsonb_build_object('success', true, 'coins_paid', 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
