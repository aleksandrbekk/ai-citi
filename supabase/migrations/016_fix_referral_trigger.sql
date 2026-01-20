-- ===========================================
-- Миграция: 016_fix_referral_trigger.sql
-- Описание: Исправление бага с двойным начислением монет за реферала
-- Проблема: Триггер начислял бонусы даже если реферал уже существовал
-- ===========================================

-- Исправленная функция-триггер
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

      -- Обновляем статистику (только если реферал новый)
      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 2)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        total_coins_earned = referral_stats.total_coins_earned + 2;

      -- Начисляем бонус 2 монеты рефереру (только если реферал новый)
      UPDATE profiles SET coins = coins + 2 WHERE user_id = v_referrer_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
