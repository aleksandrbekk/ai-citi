-- Fix: process_referral_on_user_create должен создавать coin_transactions

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

      INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
      VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 6)
      ON CONFLICT (user_id) DO UPDATE SET
        total_referrals = referral_stats.total_referrals + 1,
        total_coins_earned = referral_stats.total_coins_earned + 6,
        updated_at = NOW();

      -- Используем add_coins для создания транзакции
      SELECT add_coins(
        v_referrer_telegram_id,
        6,
        'referral',
        'Бонус за регистрацию партнёра (TG: ' || NEW.telegram_id || ')',
        jsonb_build_object('referred_telegram_id', NEW.telegram_id, 'bonus_type', 'registration')
      ) INTO v_result;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
