-- Система подписок с автосписанием через Lava.top
-- Миграция: 040_subscriptions_system.sql

-- Таблица подписок пользователей
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  telegram_id BIGINT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'business')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),

  -- Даты
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  next_charge_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Lava.top данные
  lava_contract_id TEXT UNIQUE,

  -- Оплата
  amount_rub INTEGER NOT NULL,
  neurons_per_month INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_user_subs_telegram ON user_subscriptions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_user_subs_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subs_expires ON user_subscriptions(expires_at);

-- Уникальный индекс: только одна активная подписка на пользователя
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subs_active ON user_subscriptions(telegram_id) WHERE status = 'active';

-- RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Политика: service role имеет полный доступ
DROP POLICY IF EXISTS "Service role full access subscriptions" ON user_subscriptions;
CREATE POLICY "Service role full access subscriptions" ON user_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Политика: пользователи могут читать свои подписки
DROP POLICY IF EXISTS "Users can view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
  FOR SELECT
  USING (true);

-- Триггер для автообновления updated_at
CREATE OR REPLACE FUNCTION update_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subs_updated_at ON user_subscriptions;
CREATE TRIGGER update_subs_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_updated_at();

-- Функция: получить активную подписку пользователя
CREATE OR REPLACE FUNCTION get_active_subscription(p_telegram_id BIGINT)
RETURNS TABLE (
  id UUID,
  plan TEXT,
  status TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  next_charge_at TIMESTAMPTZ,
  amount_rub INTEGER,
  neurons_per_month INTEGER,
  lava_contract_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id,
    us.plan,
    us.status,
    us.started_at,
    us.expires_at,
    us.next_charge_at,
    us.amount_rub,
    us.neurons_per_month,
    us.lava_contract_id
  FROM user_subscriptions us
  WHERE us.telegram_id = p_telegram_id
    AND us.status = 'active'
    AND us.expires_at > NOW()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: продлить подписку (при успешном recurring платеже)
CREATE OR REPLACE FUNCTION extend_subscription(
  p_telegram_id BIGINT,
  p_contract_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sub user_subscriptions;
  v_new_expires TIMESTAMPTZ;
BEGIN
  -- Ищем активную подписку
  SELECT * INTO v_sub FROM user_subscriptions
  WHERE telegram_id = p_telegram_id
    AND status = 'active';

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
  END IF;

  -- Вычисляем новую дату истечения (продлеваем от текущей даты истечения или от сейчас, что больше)
  v_new_expires := GREATEST(v_sub.expires_at, NOW()) + INTERVAL '30 days';

  -- Обновляем подписку
  UPDATE user_subscriptions SET
    expires_at = v_new_expires,
    next_charge_at = v_new_expires,
    updated_at = NOW()
  WHERE id = v_sub.id;

  -- Начисляем ежемесячные нейроны
  PERFORM add_coins(
    p_telegram_id,
    v_sub.neurons_per_month,
    'subscription',
    'Ежемесячное начисление по подписке ' || UPPER(v_sub.plan),
    jsonb_build_object('subscription_id', v_sub.id, 'contract_id', p_contract_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_expires', v_new_expires,
    'neurons_added', v_sub.neurons_per_month,
    'plan', v_sub.plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: отменить подписку
CREATE OR REPLACE FUNCTION cancel_subscription(
  p_telegram_id BIGINT,
  p_contract_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_sub user_subscriptions;
BEGIN
  -- Ищем подписку
  IF p_contract_id IS NOT NULL THEN
    SELECT * INTO v_sub FROM user_subscriptions
    WHERE lava_contract_id = p_contract_id;
  ELSE
    SELECT * INTO v_sub FROM user_subscriptions
    WHERE telegram_id = p_telegram_id AND status = 'active';
  END IF;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- Обновляем статус
  UPDATE user_subscriptions SET
    status = 'cancelled',
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = v_sub.id;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_plan', v_sub.plan,
    'expires_at', v_sub.expires_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: создать подписку (вызывается из webhook при первой оплате)
CREATE OR REPLACE FUNCTION create_subscription(
  p_telegram_id BIGINT,
  p_plan TEXT,
  p_contract_id TEXT,
  p_amount_rub INTEGER,
  p_neurons_per_month INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_sub_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Получаем user_id
  SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;

  -- Дата истечения через 30 дней
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Деактивируем предыдущие подписки (если есть)
  UPDATE user_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE telegram_id = p_telegram_id AND status = 'active';

  -- Создаём новую подписку
  INSERT INTO user_subscriptions (
    user_id,
    telegram_id,
    plan,
    status,
    expires_at,
    next_charge_at,
    lava_contract_id,
    amount_rub,
    neurons_per_month
  ) VALUES (
    v_user_id,
    p_telegram_id,
    p_plan,
    'active',
    v_expires_at,
    v_expires_at,
    p_contract_id,
    p_amount_rub,
    p_neurons_per_month
  )
  RETURNING id INTO v_sub_id;

  -- Начисляем нейроны за первый месяц
  PERFORM add_coins(
    p_telegram_id,
    p_neurons_per_month,
    'subscription',
    'Подписка ' || UPPER(p_plan) || ' — первое начисление',
    jsonb_build_object('subscription_id', v_sub_id, 'contract_id', p_contract_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'plan', p_plan,
    'expires_at', v_expires_at,
    'neurons_added', p_neurons_per_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция: проверить есть ли активная подписка (boolean)
CREATE OR REPLACE FUNCTION has_active_subscription(p_telegram_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE telegram_id = p_telegram_id
      AND status = 'active'
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
