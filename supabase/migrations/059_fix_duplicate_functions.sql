-- 059_fix_duplicate_functions.sql
-- Исправление: удаление дублирующихся функций add_coins и spend_coins
-- Проблема: существуют две версии каждой функции (с VARCHAR и с TEXT),
-- PostgreSQL не может выбрать нужную

-- Удаляем ОБЕ версии и создаём одну чистую

-- 1. Удаляем add_coins (обе версии)
DROP FUNCTION IF EXISTS add_coins(BIGINT, INTEGER, VARCHAR, TEXT, JSONB);
DROP FUNCTION IF EXISTS add_coins(BIGINT, INTEGER, TEXT, TEXT, JSONB);

-- 2. Удаляем spend_coins (обе версии)
DROP FUNCTION IF EXISTS spend_coins(BIGINT, INTEGER, VARCHAR, TEXT, JSONB);
DROP FUNCTION IF EXISTS spend_coins(BIGINT, INTEGER, TEXT, TEXT, JSONB);

-- 3. Создаём единственную версию add_coins
CREATE OR REPLACE FUNCTION add_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT coins INTO v_current_coins
  FROM profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  v_new_balance := v_current_coins + p_amount;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, p_amount, v_new_balance, p_type, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'added', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Создаём единственную версию spend_coins
CREATE OR REPLACE FUNCTION spend_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  SELECT coins INTO v_current_coins
  FROM profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_current_coins IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  IF v_current_coins < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not enough coins',
      'current_balance', v_current_coins,
      'required', p_amount
    );
  END IF;

  v_new_balance := v_current_coins - p_amount;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, -p_amount, v_new_balance, p_type, p_description, p_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
