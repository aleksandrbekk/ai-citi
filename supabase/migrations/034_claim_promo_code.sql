-- =============================================
-- CLAIM PROMO CODE FUNCTION
-- Функция для активации промо-ссылок из promo_links
-- =============================================

-- Функция активации промо-ссылки (из таблицы promo_links)
CREATE OR REPLACE FUNCTION claim_promo_code(
  p_code TEXT,
  p_user_id TEXT  -- telegram_id как строка
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_telegram_id BIGINT;
  v_user_uuid UUID;
  v_already_claimed BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  -- Конвертируем telegram_id в BIGINT
  v_telegram_id := p_user_id::BIGINT;

  -- Ищем промо-ссылку по коду
  SELECT * INTO v_promo
  FROM promo_links
  WHERE code = UPPER(p_code) AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод не найден или неактивен');
  END IF;

  -- Проверяем срок действия
  IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Промокод истёк');
  END IF;

  -- Проверяем лимит использований
  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'Лимит использований исчерпан');
  END IF;

  -- Проверяем, не использовал ли уже этот пользователь
  SELECT EXISTS (
    SELECT 1 FROM promo_claims
    WHERE promo_link_id = v_promo.id
    AND user_id = p_user_id
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Вы уже активировали этот промокод');
  END IF;

  -- Получаем UUID пользователя
  SELECT id INTO v_user_uuid
  FROM users
  WHERE telegram_id = v_telegram_id;

  IF v_user_uuid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Пользователь не найден');
  END IF;

  -- Начисляем монеты через add_coins
  PERFORM add_coins(
    v_telegram_id,
    v_promo.coins_amount,
    'promo',
    'Промо-бонус: ' || v_promo.code,
    jsonb_build_object('promo_link_id', v_promo.id, 'code', v_promo.code)
  );

  -- Записываем claim
  INSERT INTO promo_claims (promo_link_id, user_id, coins_awarded)
  VALUES (v_promo.id, p_user_id, v_promo.coins_amount);

  -- Увеличиваем счётчик использований
  UPDATE promo_links
  SET uses_count = uses_count + 1
  WHERE id = v_promo.id;

  -- Получаем новый баланс
  SELECT coins INTO v_new_balance
  FROM profiles
  WHERE user_id = v_user_uuid;

  RETURN jsonb_build_object(
    'success', true,
    'coins', v_promo.coins_amount,
    'message', '+' || v_promo.coins_amount || ' монет!',
    'new_balance', COALESCE(v_new_balance, 0)
  );
END;
$$;

-- Комментарий
COMMENT ON FUNCTION claim_promo_code IS 'Активация промо-ссылки из таблицы promo_links. Возвращает JSON с результатом.';
