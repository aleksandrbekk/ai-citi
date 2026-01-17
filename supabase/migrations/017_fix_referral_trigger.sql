-- ===========================================
-- Миграция: 017_fix_referral_trigger.sql
-- Описание: Исправление триггера реферальной системы
-- Проблема: ON CONFLICT DO NOTHING прерывал выполнение до начисления монет
-- Решение: Проверяем существование связи ПЕРЕД INSERT
-- Автор: АНЯ
-- ===========================================

CREATE OR REPLACE FUNCTION process_referral_on_user_create()
RETURNS TRIGGER AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_referral_exists BOOLEAN;
BEGIN
  -- Если есть referred_by_code, регистрируем реферала
  IF NEW.referred_by_code IS NOT NULL AND NEW.referred_by_code != '' THEN
    -- Находим реферера по коду
    SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
    FROM users WHERE referral_code = NEW.referred_by_code;

    IF v_referrer_user_id IS NOT NULL AND v_referrer_telegram_id != NEW.telegram_id THEN
      -- Проверяем, не существует ли уже связь
      SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_user_id = NEW.id) INTO v_referral_exists;

      IF NOT v_referral_exists THEN
        -- Создаём связь реферала
        INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
        VALUES (v_referrer_user_id, NEW.id, v_referrer_telegram_id, NEW.telegram_id, TRUE);

        -- Обновляем статистику
        INSERT INTO referral_stats (user_id, telegram_id, total_referrals, total_coins_earned)
        VALUES (v_referrer_user_id, v_referrer_telegram_id, 1, 2)
        ON CONFLICT (user_id) DO UPDATE SET
          total_referrals = referral_stats.total_referrals + 1,
          total_coins_earned = referral_stats.total_coins_earned + 2,
          updated_at = NOW();

        -- Начисляем бонус 2 монеты рефереру
        UPDATE profiles SET coins = coins + 2, updated_at = NOW() WHERE user_id = v_referrer_user_id;

        -- Создаём транзакцию для истории
        INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
        SELECT
          v_referrer_user_id,
          2,
          p.coins,
          'referral',
          'Бонус за регистрацию партнёра (TG: ' || NEW.telegram_id || ')',
          jsonb_build_object('referred_telegram_id', NEW.telegram_id, 'bonus_type', 'registration')
        FROM profiles p WHERE p.user_id = v_referrer_user_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
