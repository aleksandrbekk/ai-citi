-- ===========================================
-- Миграция: 017_update_referral_bonus.sql
-- Описание: Изменение бонуса за реферала с 2 на 6 монет
-- Также: стоимость генерации изменена на 30 монет (в коде)
-- ===========================================

-- 1. Обновляем функцию выплаты бонуса за регистрацию
CREATE OR REPLACE FUNCTION pay_referral_registration_bonus(
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referral RECORD;
  v_result JSONB;
BEGIN
  -- Находим реферальную связь
  SELECT r.*, u.id as referrer_user_id
  INTO v_referral
  FROM referrals r
  JOIN users u ON r.referrer_user_id = u.id
  WHERE r.referred_telegram_id = p_referred_telegram_id
    AND r.bonus_paid = FALSE;

  IF v_referral IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No unpaid referral found');
  END IF;

  -- Начисляем 6 монет рефереру (было 2)
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    6,
    'referral',
    'Бонус за регистрацию партнёра (TG: ' || p_referred_telegram_id || ')',
    jsonb_build_object('referred_telegram_id', p_referred_telegram_id, 'bonus_type', 'registration')
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- Отмечаем бонус как выплаченный
  UPDATE referrals SET bonus_paid = TRUE WHERE id = v_referral.id;

  -- Обновляем статистику
  UPDATE referral_stats
  SET total_coins_earned = total_coins_earned + 6, updated_at = NOW()
  WHERE user_id = v_referral.referrer_user_id;

  RETURN jsonb_build_object('success', true, 'coins_paid', 6);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Обновляем триггер-функцию для автоматической регистрации рефералов
CREATE OR REPLACE FUNCTION process_referral_on_user_create()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_already_referred BOOLEAN;
BEGIN
  -- Если есть referred_by_code, регистрируем реферала
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code != '' THEN
    -- Находим реферера по коду
    SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
    FROM users WHERE referral_code = NEW.referred_by_code;

    IF v_referrer_user_id IS NOT NULL AND v_referrer_telegram_id != NEW.telegram_id THEN
      -- Проверяем, не был ли этот пользователь уже зарегистрирован как реферал
      SELECT EXISTS(
        SELECT 1 FROM referrals WHERE referred_telegram_id = NEW.telegram_id
      ) INTO v_already_referred;

      -- Если уже реферал - выходим, ничего не начисляем
      IF v_already_referred THEN
        RETURN NEW;
      END IF;

      -- Создаём связь реферала
      INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
      VALUES (v_referrer_user_id, NEW.id, v_referrer_telegram_id, NEW.telegram_id, TRUE)
      ON CONFLICT DO NOTHING;

      -- Обновляем статистику (6 монет вместо 2)
      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 6)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        total_coins_earned = referral_stats.total_coins_earned + 6;

      -- Начисляем бонус 6 монет рефереру (было 2)
      UPDATE profiles SET coins = coins + 6 WHERE user_id = v_referrer_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
