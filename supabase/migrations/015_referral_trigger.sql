-- Добавляем колонку для хранения referrer_code при создании
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(10);

-- Функция-триггер для автоматической регистрации реферала
CREATE OR REPLACE FUNCTION process_referral_on_user_create()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
BEGIN
  -- Если есть referred_by_code, регистрируем реферала
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code != '' THEN
    -- Находим реферера по коду
    SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
    FROM users WHERE referral_code = NEW.referred_by_code;

    IF v_referrer_user_id IS NOT NULL AND v_referrer_telegram_id != NEW.telegram_id THEN
      -- Создаём связь реферала
      INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
      VALUES (v_referrer_user_id, NEW.id, v_referrer_telegram_id, NEW.telegram_id, TRUE)
      ON CONFLICT DO NOTHING;

      -- Обновляем статистику
      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 2)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        total_coins_earned = referral_stats.total_coins_earned + 2;

      -- Начисляем бонус 2 монеты рефереру
      UPDATE profiles SET coins = coins + 2 WHERE user_id = v_referrer_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаём триггер
DROP TRIGGER IF EXISTS on_user_created_referral ON users;
CREATE TRIGGER on_user_created_referral
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_on_user_create();
