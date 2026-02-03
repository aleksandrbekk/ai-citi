-- 043_style_shop.sql
-- Магазин стилей каруселей

-- 1. Добавляем поля магазина в carousel_styles
ALTER TABLE carousel_styles
ADD COLUMN IF NOT EXISTS is_in_shop BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price_neurons INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;

-- 2. Создаём таблицу купленных стилей
CREATE TABLE IF NOT EXISTS user_purchased_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  style_id TEXT NOT NULL,
  price_paid INTEGER DEFAULT 0,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),

  -- Уникальность: один пользователь - один стиль
  UNIQUE(telegram_id, style_id)
);

-- 3. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_purchased_styles_user ON user_purchased_styles(telegram_id);
CREATE INDEX IF NOT EXISTS idx_purchased_styles_style ON user_purchased_styles(style_id);

-- 4. RLS для user_purchased_styles
ALTER TABLE user_purchased_styles ENABLE ROW LEVEL SECURITY;

-- Пользователи могут читать свои покупки
CREATE POLICY "Users can view own purchases" ON user_purchased_styles
  FOR SELECT USING (true);

-- Только service_role может добавлять покупки
CREATE POLICY "Service role can insert purchases" ON user_purchased_styles
  FOR INSERT WITH CHECK (true);

-- 5. Функция покупки стиля (атомарная транзакция)
CREATE OR REPLACE FUNCTION purchase_style(
  p_telegram_id BIGINT,
  p_style_id TEXT,
  p_price INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
  v_already_owned BOOLEAN;
  v_result JSONB;
BEGIN
  -- Проверяем, не куплен ли уже
  SELECT EXISTS(
    SELECT 1 FROM user_purchased_styles
    WHERE telegram_id = p_telegram_id AND style_id = p_style_id
  ) INTO v_already_owned;

  IF v_already_owned THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
  END IF;

  -- Получаем текущий баланс
  SELECT coin_balance INTO v_balance
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Проверяем достаточно ли монет
  IF v_balance < p_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'balance', v_balance,
      'price', p_price
    );
  END IF;

  -- Списываем монеты
  UPDATE users
  SET coin_balance = coin_balance - p_price,
      updated_at = NOW()
  WHERE telegram_id = p_telegram_id;

  -- Записываем покупку
  INSERT INTO user_purchased_styles (telegram_id, style_id, price_paid)
  VALUES (p_telegram_id, p_style_id, p_price);

  -- Возвращаем успех
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_balance - p_price,
    'style_id', p_style_id
  );
END;
$$;

-- 6. Функция получения доступных стилей пользователя
CREATE OR REPLACE FUNCTION get_user_available_styles(p_telegram_id BIGINT)
RETURNS TABLE (
  style_id TEXT,
  is_owned BOOLEAN,
  is_free BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cs.style_id,
    (ups.id IS NOT NULL OR cs.is_free = true) as is_owned,
    cs.is_free
  FROM carousel_styles cs
  LEFT JOIN user_purchased_styles ups
    ON cs.style_id = ups.style_id
    AND ups.telegram_id = p_telegram_id
  WHERE cs.is_active = true
  ORDER BY cs.sort_order;
$$;

COMMENT ON TABLE user_purchased_styles IS 'Купленные пользователями стили каруселей';
COMMENT ON FUNCTION purchase_style IS 'Атомарная покупка стиля за нейроны';
