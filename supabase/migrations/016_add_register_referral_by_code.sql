-- ===========================================
-- Миграция: 016_add_register_referral_by_code.sql
-- Описание: Добавление функции для регистрации реферала по коду
-- Автор: АНЯ
-- ===========================================

-- Функция для регистрации реферала по коду (вместо telegram_id)
CREATE OR REPLACE FUNCTION register_referral_by_code(
  p_referrer_code VARCHAR(10),
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_referred_user_id UUID;
  v_already_exists BOOLEAN;
BEGIN
  -- Получаем user_id и telegram_id реферера по коду
  SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
  FROM users
  WHERE referral_code = p_referrer_code;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer not found by code');
  END IF;

  -- Проверяем, что реферер и реферал разные
  IF v_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Получаем user_id реферала
  SELECT id INTO v_referred_user_id FROM users WHERE telegram_id = p_referred_telegram_id;
  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referred user not found');
  END IF;

  -- Проверяем, не был ли уже зарегистрирован этот реферал
  SELECT EXISTS(SELECT 1 FROM referrals WHERE referred_telegram_id = p_referred_telegram_id) INTO v_already_exists;
  IF v_already_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already referred');
  END IF;

  -- Создаём связь
  INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
  VALUES (v_referrer_user_id, v_referred_user_id, v_referrer_telegram_id, p_referred_telegram_id, FALSE);

  -- Обновляем или создаём статистику реферера
  INSERT INTO referral_stats (user_id, telegram_id, total_referrals)
  VALUES (v_referrer_user_id, v_referrer_telegram_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_stats.total_referrals + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'referrer_user_id', v_referrer_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
