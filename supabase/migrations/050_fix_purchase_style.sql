-- 050_fix_purchase_style.sql
-- Исправление функции покупки стиля:
-- 1. Использовать profiles.coins вместо users.coin_balance
-- 2. Записывать транзакцию в coin_transactions
-- 3. Начислять комиссию создателю стиля (если есть created_by)

CREATE OR REPLACE FUNCTION purchase_style(
  p_telegram_id BIGINT,
  p_style_id TEXT,
  p_price INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_balance INTEGER;
  v_new_balance INTEGER;
  v_already_owned BOOLEAN;
  v_creator_telegram_id BIGINT;
  v_creator_user_id UUID;
  v_creator_balance INTEGER;
  v_style_name TEXT;
  v_commission INTEGER;
BEGIN
  -- Получаем user_id покупателя
  SELECT id INTO v_user_id
  FROM users
  WHERE telegram_id = p_telegram_id;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- Проверяем, не куплен ли уже
  SELECT EXISTS(
    SELECT 1 FROM user_purchased_styles
    WHERE telegram_id = p_telegram_id AND style_id = p_style_id
  ) INTO v_already_owned;

  IF v_already_owned THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_owned');
  END IF;

  -- Получаем текущий баланс из profiles.coins (правильная таблица!)
  SELECT coins INTO v_balance
  FROM profiles
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
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

  -- Получаем информацию о стиле и создателе
  SELECT name, created_by INTO v_style_name, v_creator_telegram_id
  FROM carousel_styles
  WHERE style_id = p_style_id;

  -- Списываем монеты
  v_new_balance := v_balance - p_price;

  UPDATE profiles
  SET coins = v_new_balance, updated_at = NOW()
  WHERE user_id = v_user_id;

  -- Записываем транзакцию списания
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (
    v_user_id,
    -p_price,
    v_new_balance,
    'style_purchase',
    'Покупка стиля: ' || COALESCE(v_style_name, p_style_id),
    jsonb_build_object('style_id', p_style_id, 'style_name', v_style_name)
  );

  -- Записываем покупку
  INSERT INTO user_purchased_styles (telegram_id, style_id, price_paid)
  VALUES (p_telegram_id, p_style_id, p_price);

  -- Начисляем комиссию создателю (50% от цены), если создатель указан и это не сам покупатель
  IF v_creator_telegram_id IS NOT NULL AND v_creator_telegram_id != p_telegram_id THEN
    v_commission := p_price / 2; -- 50% комиссия

    -- Получаем user_id создателя
    SELECT id INTO v_creator_user_id
    FROM users
    WHERE telegram_id = v_creator_telegram_id;

    IF v_creator_user_id IS NOT NULL THEN
      -- Получаем баланс создателя
      SELECT coins INTO v_creator_balance
      FROM profiles
      WHERE user_id = v_creator_user_id
      FOR UPDATE;

      IF v_creator_balance IS NOT NULL THEN
        -- Начисляем комиссию
        UPDATE profiles
        SET coins = coins + v_commission, updated_at = NOW()
        WHERE user_id = v_creator_user_id;

        -- Записываем транзакцию начисления
        INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
        VALUES (
          v_creator_user_id,
          v_commission,
          v_creator_balance + v_commission,
          'style_commission',
          'Комиссия за продажу стиля: ' || COALESCE(v_style_name, p_style_id),
          jsonb_build_object(
            'style_id', p_style_id,
            'buyer_telegram_id', p_telegram_id,
            'sale_price', p_price,
            'commission_percent', 50
          )
        );
      END IF;
    END IF;
  END IF;

  -- Возвращаем успех
  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'style_id', p_style_id,
    'style_name', v_style_name
  );
END;
$$;

COMMENT ON FUNCTION purchase_style IS 'Покупка стиля: списание с profiles.coins, запись транзакции, комиссия создателю 50%';
