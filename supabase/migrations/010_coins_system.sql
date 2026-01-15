-- ===========================================
-- Миграция: 010_coins_system.sql
-- Описание: Система монет для генерации каруселей
-- Автор: АНЯ
-- ===========================================

-- Обновляем дефолтное значение монет для новых пользователей
ALTER TABLE profiles ALTER COLUMN coins SET DEFAULT 1;

-- Даём 1 монету всем существующим пользователям у которых 0 монет
UPDATE profiles SET coins = 1 WHERE coins = 0;

-- Создаём таблицу истории транзакций монет
CREATE TABLE IF NOT EXISTS coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- положительное = начисление, отрицательное = списание
  balance_after INTEGER NOT NULL, -- баланс после транзакции
  type VARCHAR(50) NOT NULL, -- 'generation', 'purchase', 'subscription', 'referral', 'bonus'
  description TEXT,
  metadata JSONB DEFAULT '{}', -- дополнительные данные (carousel_id и т.д.)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_id ON coin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_type ON coin_transactions(type);
CREATE INDEX IF NOT EXISTS idx_coin_transactions_created_at ON coin_transactions(created_at DESC);

-- RLS
ALTER TABLE coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON coin_transactions
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint));

-- Функция для списания монет
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
  FOR UPDATE; -- Блокируем строку для атомарности

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для начисления монет
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция для получения баланса
CREATE OR REPLACE FUNCTION get_coin_balance(p_telegram_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_coins INTEGER;
BEGIN
  SELECT p.coins INTO v_coins
  FROM profiles p
  JOIN users u ON p.user_id = u.id
  WHERE u.telegram_id = p_telegram_id;

  RETURN COALESCE(v_coins, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
