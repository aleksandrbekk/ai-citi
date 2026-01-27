-- =============================================
-- GIFT COINS SYSTEM
-- Подарочные монеты для новых пользователей и промокодов
-- =============================================

-- 1. Добавляем поле gift_coins в profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gift_coins INTEGER DEFAULT 0;

-- 2. Таблица подарков
CREATE TABLE IF NOT EXISTS coin_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_telegram_id BIGINT,           -- Кто подарил (NULL = система)
  receiver_telegram_id BIGINT NOT NULL, -- Кому
  amount INTEGER NOT NULL,              -- Сколько
  reason TEXT,                          -- Причина (welcome_bonus, gift, promo)
  promo_code TEXT,                      -- Если по промокоду
  redeemed BOOLEAN DEFAULT FALSE,       -- Активирован ли
  created_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ
);

-- Индексы для coin_gifts
CREATE INDEX IF NOT EXISTS idx_coin_gifts_receiver ON coin_gifts(receiver_telegram_id);
CREATE INDEX IF NOT EXISTS idx_coin_gifts_promo ON coin_gifts(promo_code) WHERE promo_code IS NOT NULL;

-- 3. Таблица промокодов
CREATE TABLE IF NOT EXISTS promo_codes (
  code TEXT PRIMARY KEY,
  gift_coins INTEGER NOT NULL,          -- Сколько дарит
  max_uses INTEGER,                     -- Лимит использований (NULL = безлимит)
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by BIGINT,                    -- Кто создал (админ telegram_id)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Функция начисления подарочных монет
CREATE OR REPLACE FUNCTION add_gift_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_reason TEXT DEFAULT 'manual',
  p_sender_id BIGINT DEFAULT NULL,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Обновляем баланс gift_coins в profiles
  UPDATE profiles
  SET gift_coins = COALESCE(gift_coins, 0) + p_amount
  WHERE telegram_id = p_telegram_id;

  -- Если профиль не существует, создаём
  IF NOT FOUND THEN
    INSERT INTO profiles (telegram_id, gift_coins)
    VALUES (p_telegram_id, p_amount)
    ON CONFLICT (telegram_id) DO UPDATE
    SET gift_coins = COALESCE(profiles.gift_coins, 0) + p_amount;
  END IF;

  -- Записываем подарок
  INSERT INTO coin_gifts (
    sender_telegram_id,
    receiver_telegram_id,
    amount,
    reason,
    promo_code,
    redeemed,
    redeemed_at
  ) VALUES (
    p_sender_id,
    p_telegram_id,
    p_amount,
    p_reason,
    p_promo_code,
    TRUE,
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- 5. Функция списания монет (сначала gift_coins, потом coins)
CREATE OR REPLACE FUNCTION spend_coins_smart(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_from_gift INTEGER := 0;
  v_from_coins INTEGER := 0;
  v_remaining INTEGER;
BEGIN
  -- Получаем текущие балансы
  SELECT coins, COALESCE(gift_coins, 0) as gift_coins
  INTO v_profile
  FROM profiles
  WHERE telegram_id = p_telegram_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Проверяем достаточно ли монет
  IF (v_profile.coins + v_profile.gift_coins) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough coins');
  END IF;

  -- Списываем сначала gift_coins
  IF v_profile.gift_coins >= p_amount THEN
    v_from_gift := p_amount;
  ELSE
    v_from_gift := v_profile.gift_coins;
    v_from_coins := p_amount - v_from_gift;
  END IF;

  -- Обновляем балансы
  UPDATE profiles
  SET
    gift_coins = COALESCE(gift_coins, 0) - v_from_gift,
    coins = coins - v_from_coins
  WHERE telegram_id = p_telegram_id;

  -- Записываем транзакцию
  INSERT INTO coin_transactions (telegram_id, amount, type, description)
  VALUES (p_telegram_id, -p_amount, 'spend', p_description);

  RETURN jsonb_build_object(
    'success', true,
    'from_gift', v_from_gift,
    'from_coins', v_from_coins,
    'new_balance', v_profile.coins - v_from_coins,
    'new_gift_balance', v_profile.gift_coins - v_from_gift
  );
END;
$$;

-- 6. Функция активации промокода
CREATE OR REPLACE FUNCTION redeem_promo_code(
  p_telegram_id BIGINT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_already_used BOOLEAN;
BEGIN
  -- Проверяем промокод
  SELECT * INTO v_promo
  FROM promo_codes
  WHERE code = UPPER(p_code);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден');
  END IF;

  -- Проверяем срок действия
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод истёк');
  END IF;

  -- Проверяем лимит использований
  IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод больше не действует');
  END IF;

  -- Проверяем, не использовал ли уже этот пользователь
  SELECT EXISTS (
    SELECT 1 FROM coin_gifts
    WHERE receiver_telegram_id = p_telegram_id
    AND promo_code = UPPER(p_code)
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'Вы уже использовали этот промокод');
  END IF;

  -- Начисляем монеты
  PERFORM add_gift_coins(
    p_telegram_id,
    v_promo.gift_coins,
    'promo',
    NULL,
    UPPER(p_code)
  );

  -- Увеличиваем счётчик использований
  UPDATE promo_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(p_code);

  RETURN jsonb_build_object(
    'success', true,
    'coins_added', v_promo.gift_coins,
    'message', 'Промокод активирован! +' || v_promo.gift_coins || ' монет'
  );
END;
$$;

-- 7. RLS для coin_gifts
ALTER TABLE coin_gifts ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свои подарки
CREATE POLICY "Users can view own gifts"
  ON coin_gifts FOR SELECT
  USING (receiver_telegram_id = COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint,
    0
  ));

-- Service role может всё
CREATE POLICY "Service role full access to coin_gifts"
  ON coin_gifts
  USING (auth.role() = 'service_role');

-- 8. RLS для promo_codes
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Промокоды могут читать все (для проверки)
CREATE POLICY "Anyone can check promo codes"
  ON promo_codes FOR SELECT
  USING (true);

-- Создавать/редактировать только service role (админы)
CREATE POLICY "Service role full access to promo_codes"
  ON promo_codes
  USING (auth.role() = 'service_role');

-- 9. Welcome bonus для новых пользователей (10 gift_coins)
-- Триггер при создании профиля
CREATE OR REPLACE FUNCTION on_new_user_welcome_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Начисляем 10 подарочных монет новому пользователю
  PERFORM add_gift_coins(NEW.telegram_id, 10, 'welcome_bonus');
  RETURN NEW;
END;
$$;

-- Создаём триггер только если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_welcome_bonus'
  ) THEN
    CREATE TRIGGER trigger_welcome_bonus
      AFTER INSERT ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION on_new_user_welcome_bonus();
  END IF;
END;
$$;

-- 10. Создаём несколько начальных промокодов
INSERT INTO promo_codes (code, gift_coins, max_uses, created_by)
VALUES
  ('WELCOME2026', 10, 1000, 643763835),
  ('AICITI', 20, 500, 643763835),
  ('NEUROPOSTER', 30, 100, 643763835)
ON CONFLICT (code) DO NOTHING;
