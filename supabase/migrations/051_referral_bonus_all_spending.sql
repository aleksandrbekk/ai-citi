-- 051_referral_bonus_all_spending.sql
-- ВАЖНО: Наставник получает 10% со ВСЕХ трат партнёра
-- Включая: генерации, покупку стилей, любые другие траты

-- ===========================================
-- 1. ОБНОВЛЯЕМ spend_coins — бонус со ВСЕХ типов трат
-- ===========================================
CREATE OR REPLACE FUNCTION spend_coins(
  p_telegram_id BIGINT,
  p_amount INTEGER,
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INTEGER;
  v_new_balance INTEGER;
  v_referral_result JSONB;
BEGIN
  -- Находим пользователя
  SELECT u.id INTO v_user_id FROM users u WHERE u.telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Получаем текущий баланс
  SELECT coins INTO v_current_coins FROM profiles WHERE user_id = v_user_id FOR UPDATE;
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
  UPDATE profiles SET coins = v_new_balance, updated_at = NOW() WHERE user_id = v_user_id;

  -- Записываем транзакцию
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (v_user_id, -p_amount, v_new_balance, p_type, p_description, p_metadata);

  -- ВАЖНО: Начисляем реферальный бонус 10% рефереру ДЛЯ ВСЕХ ТИПОВ ТРАТ!
  -- Наставник получает 10% со ВСЕГО что тратит его партнёр
  SELECT pay_referral_spend_bonus(p_telegram_id, p_amount) INTO v_referral_result;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance,
    'referral_bonus', COALESCE(v_referral_result, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. ОБНОВЛЯЕМ purchase_style — используем spend_coins!
-- ===========================================
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
  v_already_owned BOOLEAN;
  v_style_name TEXT;
  v_creator_telegram_id BIGINT;
  v_creator_user_id UUID;
  v_creator_balance INTEGER;
  v_commission INTEGER;
  v_spend_result JSONB;
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

  -- Получаем информацию о стиле и создателе
  SELECT name, created_by INTO v_style_name, v_creator_telegram_id
  FROM carousel_styles
  WHERE style_id = p_style_id;

  -- ВАЖНО: Используем spend_coins для списания!
  -- Это автоматически:
  -- 1. Списывает монеты из profiles.coins
  -- 2. Записывает транзакцию
  -- 3. Начисляет 10% наставнику покупателя
  SELECT spend_coins(
    p_telegram_id,
    p_price,
    'style_purchase',
    'Покупка стиля: ' || COALESCE(v_style_name, p_style_id),
    jsonb_build_object('style_id', p_style_id, 'style_name', v_style_name)
  ) INTO v_spend_result;

  -- Проверяем результат
  IF NOT (v_spend_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', v_spend_result->>'error',
      'balance', (v_spend_result->>'current_balance')::integer,
      'price', p_price
    );
  END IF;

  -- Записываем покупку
  INSERT INTO user_purchased_styles (telegram_id, style_id, price_paid)
  VALUES (p_telegram_id, p_style_id, p_price);

  -- Начисляем комиссию создателю стиля (50%), если создатель указан и это не сам покупатель
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

        -- Записываем транзакцию начисления создателю
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
    'new_balance', (v_spend_result->>'new_balance')::integer,
    'style_id', p_style_id,
    'style_name', v_style_name,
    'referral_bonus', v_spend_result->'referral_bonus'
  );
END;
$$;

-- ===========================================
-- 3. КОММЕНТАРИИ
-- ===========================================
COMMENT ON FUNCTION spend_coins IS 'Списывает монеты и начисляет 10% реферальный бонус наставнику со ВСЕХ типов трат';
COMMENT ON FUNCTION purchase_style IS 'Покупка стиля: использует spend_coins (10% наставнику) + 50% создателю стиля';
