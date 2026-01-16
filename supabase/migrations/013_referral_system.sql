-- ===========================================
-- Миграция: 013_referral_system.sql
-- Описание: Одноуровневая реферальная система
-- Бонусы:
--   - Регистрация партнёра: +2 монеты рефереру
--   - Покупка монет партнёром: +20% рефереру
--   - Трата монет партнёром: +20% рефереру
-- ===========================================

-- ===========================================
-- 1. ТАБЛИЦА РЕФЕРАЛЬНЫХ СВЯЗЕЙ
-- ===========================================
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referrer_telegram_id BIGINT NOT NULL,
  referred_telegram_id BIGINT NOT NULL,
  bonus_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_user_id ON referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_telegram_id ON referrals(referrer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_telegram_id ON referrals(referred_telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);

-- RLS
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on referrals" ON referrals
  FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- 2. ТАБЛИЦА СТАТИСТИКИ РЕФЕРАЛОВ
-- ===========================================
CREATE TABLE IF NOT EXISTS referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  telegram_id BIGINT NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_coins_earned INTEGER DEFAULT 0,
  total_partner_spent INTEGER DEFAULT 0,
  total_partner_purchased INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_referral_stats_telegram_id ON referral_stats(telegram_id);
CREATE INDEX IF NOT EXISTS idx_referral_stats_total_referrals ON referral_stats(total_referrals DESC);

-- RLS
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on referral_stats" ON referral_stats
  FOR ALL USING (true) WITH CHECK (true);

-- ===========================================
-- 3. ФУНКЦИЯ: Регистрация реферала
-- ===========================================
CREATE OR REPLACE FUNCTION register_referral(
  p_referrer_telegram_id BIGINT,
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referred_user_id UUID;
  v_already_exists BOOLEAN;
BEGIN
  -- Проверяем, что реферер и реферал разные
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Получаем user_id реферера
  SELECT id INTO v_referrer_user_id FROM users WHERE telegram_id = p_referrer_telegram_id;
  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer not found');
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
  VALUES (v_referrer_user_id, v_referred_user_id, p_referrer_telegram_id, p_referred_telegram_id, FALSE);

  -- Обновляем или создаём статистику реферера
  INSERT INTO referral_stats (user_id, telegram_id, total_referrals)
  VALUES (v_referrer_user_id, p_referrer_telegram_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_stats.total_referrals + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'referrer_user_id', v_referrer_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. ФУНКЦИЯ: Выплата бонуса за регистрацию (2 монеты)
-- ===========================================
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

  -- Начисляем 2 монеты рефереру
  SELECT add_coins(
    v_referral.referrer_telegram_id,
    2,
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
  SET total_coins_earned = total_coins_earned + 2, updated_at = NOW()
  WHERE user_id = v_referral.referrer_user_id;

  RETURN jsonb_build_object('success', true, 'coins_paid', 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. ФУНКЦИЯ: Начисление реферального бонуса при покупке монет (20%)
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
-- 6. ФУНКЦИЯ: Начисление реферального бонуса при трате монет (20%)
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
-- 7. ФУНКЦИЯ: Получение статистики рефералов пользователя
-- ===========================================
CREATE OR REPLACE FUNCTION get_referral_stats(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_stats RECORD;
  v_referrals JSONB;
BEGIN
  -- Получаем статистику
  SELECT * INTO v_stats
  FROM referral_stats
  WHERE telegram_id = p_telegram_id;

  -- Получаем список рефералов
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'telegram_id', r.referred_telegram_id,
      'username', u.username,
      'first_name', u.first_name,
      'created_at', r.created_at
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO v_referrals
  FROM referrals r
  JOIN users u ON r.referred_user_id = u.id
  WHERE r.referrer_telegram_id = p_telegram_id;

  RETURN jsonb_build_object(
    'total_referrals', COALESCE(v_stats.total_referrals, 0),
    'total_coins_earned', COALESCE(v_stats.total_coins_earned, 0),
    'total_partner_spent', COALESCE(v_stats.total_partner_spent, 0),
    'total_partner_purchased', COALESCE(v_stats.total_partner_purchased, 0),
    'referrals', v_referrals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 8. МОДИФИКАЦИЯ spend_coins ДЛЯ АВТОМАТИЧЕСКОГО НАЧИСЛЕНИЯ БОНУСА РЕФЕРЕРУ
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

-- ===========================================
-- 9. АДМИНСКАЯ ФУНКЦИЯ: Полная статистика рефералов
-- ===========================================
CREATE OR REPLACE FUNCTION admin_get_all_referral_stats()
RETURNS TABLE (
  telegram_id BIGINT,
  username TEXT,
  first_name TEXT,
  total_referrals INTEGER,
  total_coins_earned INTEGER,
  total_partner_spent INTEGER,
  total_partner_purchased INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.telegram_id,
    u.username,
    u.first_name,
    COALESCE(rs.total_referrals, 0)::INTEGER,
    COALESCE(rs.total_coins_earned, 0)::INTEGER,
    COALESCE(rs.total_partner_spent, 0)::INTEGER,
    COALESCE(rs.total_partner_purchased, 0)::INTEGER
  FROM users u
  LEFT JOIN referral_stats rs ON u.id = rs.user_id
  WHERE rs.total_referrals > 0 OR rs.total_coins_earned > 0
  ORDER BY COALESCE(rs.total_coins_earned, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 10. ФУНКЦИЯ: Проверить есть ли у пользователя реферер
-- ===========================================
CREATE OR REPLACE FUNCTION get_referrer_telegram_id(p_telegram_id BIGINT)
RETURNS BIGINT AS $$
DECLARE
  v_referrer_telegram_id BIGINT;
BEGIN
  SELECT referrer_telegram_id INTO v_referrer_telegram_id
  FROM referrals
  WHERE referred_telegram_id = p_telegram_id;

  RETURN v_referrer_telegram_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
