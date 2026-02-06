-- ===========================================
-- Миграция: 061_admin_assign_referral.sql
-- Описание: Админская функция для ручного назначения реферала
-- + недостающие функции для админки рефералов
-- ===========================================

-- ===========================================
-- 1. АДМИНСКАЯ ФУНКЦИЯ: Ручное назначение реферала
-- ===========================================
CREATE OR REPLACE FUNCTION admin_assign_referral(
  p_referrer_telegram_id BIGINT,
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referred_user_id UUID;
  v_referrer_code VARCHAR;
  v_already_exists BOOLEAN;
BEGIN
  -- Нельзя назначить самого себя
  IF p_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Нельзя назначить самого себя рефереру');
  END IF;

  -- Находим реферера
  SELECT id, referral_code INTO v_referrer_user_id, v_referrer_code
  FROM users WHERE telegram_id = p_referrer_telegram_id;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Реферер не найден');
  END IF;

  -- Находим реферала
  SELECT id INTO v_referred_user_id
  FROM users WHERE telegram_id = p_referred_telegram_id;

  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Пользователь не найден');
  END IF;

  -- Проверяем, нет ли уже реферера
  SELECT EXISTS(
    SELECT 1 FROM referrals WHERE referred_telegram_id = p_referred_telegram_id
  ) INTO v_already_exists;

  IF v_already_exists THEN
    -- Удаляем старую связь (админ переназначает)
    DELETE FROM referrals WHERE referred_telegram_id = p_referred_telegram_id;
  END IF;

  -- Создаём реферальную связь
  INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
  VALUES (v_referrer_user_id, v_referred_user_id, p_referrer_telegram_id, p_referred_telegram_id, TRUE)
  ON CONFLICT (referred_user_id) DO UPDATE SET
    referrer_user_id = v_referrer_user_id,
    referrer_telegram_id = p_referrer_telegram_id,
    bonus_paid = TRUE;

  -- Обновляем referred_by_code у пользователя
  UPDATE users SET referred_by_code = v_referrer_code
  WHERE telegram_id = p_referred_telegram_id;

  -- Обновляем статистику реферера
  INSERT INTO referral_stats (user_id, telegram_id, total_referrals)
  VALUES (v_referrer_user_id, p_referrer_telegram_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = (
      SELECT COUNT(*) FROM referrals WHERE referrer_telegram_id = p_referrer_telegram_id
    ),
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'message', 'Реферал назначен');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. АДМИНСКАЯ ФУНКЦИЯ: Удаление реферальной связи
-- ===========================================
CREATE OR REPLACE FUNCTION admin_remove_referral(
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_telegram_id BIGINT;
  v_referrer_user_id UUID;
BEGIN
  -- Находим текущего реферера
  SELECT referrer_telegram_id, referrer_user_id
  INTO v_referrer_telegram_id, v_referrer_user_id
  FROM referrals WHERE referred_telegram_id = p_referred_telegram_id;

  IF v_referrer_telegram_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Реферальная связь не найдена');
  END IF;

  -- Удаляем связь
  DELETE FROM referrals WHERE referred_telegram_id = p_referred_telegram_id;

  -- Обновляем referred_by_code
  UPDATE users SET referred_by_code = NULL
  WHERE telegram_id = p_referred_telegram_id;

  -- Пересчитываем статистику реферера
  UPDATE referral_stats SET
    total_referrals = (
      SELECT COUNT(*) FROM referrals WHERE referrer_telegram_id = v_referrer_telegram_id
    ),
    updated_at = NOW()
  WHERE telegram_id = v_referrer_telegram_id;

  RETURN jsonb_build_object('success', true, 'message', 'Реферальная связь удалена');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 3. ФУНКЦИЯ: Получить реферера пользователя (для админки)
-- ===========================================
CREATE OR REPLACE FUNCTION admin_get_user_referrer(
  p_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer RECORD;
BEGIN
  SELECT
    r.referrer_telegram_id,
    u.username AS referrer_username,
    u.first_name AS referrer_first_name,
    r.created_at
  INTO v_referrer
  FROM referrals r
  JOIN users u ON r.referrer_user_id = u.id
  WHERE r.referred_telegram_id = p_telegram_id;

  IF v_referrer IS NULL THEN
    RETURN jsonb_build_object('has_referrer', false);
  END IF;

  RETURN jsonb_build_object(
    'has_referrer', true,
    'referrer_telegram_id', v_referrer.referrer_telegram_id,
    'referrer_username', v_referrer.referrer_username,
    'referrer_first_name', v_referrer.referrer_first_name,
    'assigned_at', v_referrer.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. НЕДОСТАЮЩАЯ ФУНКЦИЯ: admin_get_all_referrals
-- (вызывается в ReferralsTab.tsx но не существовала)
-- ===========================================
CREATE OR REPLACE FUNCTION admin_get_all_referrals()
RETURNS TABLE (
  id UUID,
  referrer_telegram_id BIGINT,
  referrer_username TEXT,
  referrer_first_name TEXT,
  referred_telegram_id BIGINT,
  referred_username TEXT,
  referred_first_name TEXT,
  bonus_paid BOOLEAN,
  created_at TIMESTAMPTZ,
  partner_earnings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.referrer_telegram_id,
    u_referrer.username::TEXT AS referrer_username,
    u_referrer.first_name::TEXT AS referrer_first_name,
    r.referred_telegram_id,
    u_referred.username::TEXT AS referred_username,
    u_referred.first_name::TEXT AS referred_first_name,
    r.bonus_paid,
    r.created_at,
    COALESCE((
      SELECT SUM(ct.amount)::INTEGER
      FROM coin_transactions ct
      JOIN users u ON ct.user_id = u.id
      WHERE u.telegram_id = r.referrer_telegram_id
        AND ct.type = 'referral'
        AND (
          ct.metadata->>'spender_telegram_id' = r.referred_telegram_id::TEXT
          OR ct.metadata->>'referred_telegram_id' = r.referred_telegram_id::TEXT
          OR ct.metadata->>'buyer_telegram_id' = r.referred_telegram_id::TEXT
        )
    ), 0)::INTEGER AS partner_earnings
  FROM referrals r
  JOIN users u_referrer ON r.referrer_user_id = u_referrer.id
  JOIN users u_referred ON r.referred_user_id = u_referred.id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. НЕДОСТАЮЩАЯ ФУНКЦИЯ: admin_get_partner_transactions
-- (вызывается в ReferralsTab.tsx но не существовала)
-- ===========================================
CREATE OR REPLACE FUNCTION admin_get_partner_transactions(
  p_referrer_telegram_id BIGINT,
  p_partner_telegram_id BIGINT
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ct.id,
    ct.amount::INTEGER,
    ct.type::TEXT,
    ct.description::TEXT,
    ct.created_at
  FROM coin_transactions ct
  JOIN users u ON ct.user_id = u.id
  WHERE u.telegram_id = p_referrer_telegram_id
    AND ct.type = 'referral'
    AND (
      ct.metadata->>'referred_telegram_id' = p_partner_telegram_id::TEXT
      OR ct.metadata->>'spender_telegram_id' = p_partner_telegram_id::TEXT
      OR ct.metadata->>'buyer_telegram_id' = p_partner_telegram_id::TEXT
    )
  ORDER BY ct.created_at DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. НЕДОСТАЮЩАЯ ФУНКЦИЯ: register_referral_by_code
-- (вызывается в auth-telegram но не существовала)
-- ===========================================
CREATE OR REPLACE FUNCTION register_referral_by_code(
  p_referrer_code VARCHAR,
  p_referred_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_user_id UUID;
  v_referrer_telegram_id BIGINT;
  v_referred_user_id UUID;
  v_already_exists BOOLEAN;
BEGIN
  -- Находим реферера по коду
  SELECT id, telegram_id INTO v_referrer_user_id, v_referrer_telegram_id
  FROM users WHERE referral_code = p_referrer_code;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referrer not found by code');
  END IF;

  -- Находим реферала
  SELECT id INTO v_referred_user_id
  FROM users WHERE telegram_id = p_referred_telegram_id;

  IF v_referred_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referred user not found');
  END IF;

  -- Нельзя реферить самого себя
  IF v_referrer_telegram_id = p_referred_telegram_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Проверяем дубликат
  SELECT EXISTS(
    SELECT 1 FROM referrals WHERE referred_telegram_id = p_referred_telegram_id
  ) INTO v_already_exists;

  IF v_already_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already referred');
  END IF;

  -- Создаём связь
  INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_telegram_id, referred_telegram_id, bonus_paid)
  VALUES (v_referrer_user_id, v_referred_user_id, v_referrer_telegram_id, p_referred_telegram_id, FALSE)
  ON CONFLICT DO NOTHING;

  -- Обновляем статистику реферера
  INSERT INTO referral_stats (user_id, telegram_id, total_referrals)
  VALUES (v_referrer_user_id, v_referrer_telegram_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_stats.total_referrals + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'referrer_telegram_id', v_referrer_telegram_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
