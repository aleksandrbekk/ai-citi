-- ===========================================
-- Миграция: 057_fix_rls_security.sql
-- Описание: Исправление RLS политик безопасности
-- КРИТИЧНО: Убираем USING (true) которые позволяют читать ВСЕ данные
-- ===========================================

-- ============================================
-- 1. ИСПРАВЛЕНИЕ users ПОЛИТИК
-- ============================================
-- Удаляем слишком открытую политику
DROP POLICY IF EXISTS "Anyone can read users by telegram_id" ON users;

-- Создаём безопасную политику - пользователь видит только себя
-- Для анонимных запросов используем header x-telegram-id
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (
    telegram_id::text = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'telegram_id',
      current_setting('request.headers', true)::json->>'x-telegram-id'
    )
  );

-- ============================================
-- 2. ИСПРАВЛЕНИЕ user_subscriptions ПОЛИТИК
-- ============================================
-- Удаляем открытую политику
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;

-- Создаём безопасную политику
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT
  USING (
    telegram_id::text = COALESCE(
      current_setting('request.jwt.claims', true)::json->>'telegram_id',
      current_setting('request.headers', true)::json->>'x-telegram-id'
    )
  );

-- ============================================
-- 3. ДОБАВЛЕНИЕ SET search_path К SECURITY DEFINER ФУНКЦИЯМ
-- ============================================
-- Это защищает от schema poisoning attacks

-- add_coins
CREATE OR REPLACE FUNCTION add_coins(
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

  -- Начисляем монеты
  v_new_balance := v_current_coins + p_amount;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Записываем транзакцию
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

-- spend_coins
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

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- 4. КОММЕНТАРИИ
-- ============================================
COMMENT ON POLICY "Users can read own data" ON users IS 'Безопасная политика: пользователь видит только свои данные';
COMMENT ON POLICY "Users can view own subscriptions" ON user_subscriptions IS 'Безопасная политика: пользователь видит только свои подписки';
