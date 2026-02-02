-- ===========================================
-- Миграция: 038_transfer_coins_to_partner.sql
-- Описание: Функция перевода нейронов партнёру
-- Ограничения:
--   - Можно отправлять ТОЛЬКО своим партнёрам (рефералам)
--   - Минимум 1 нейрон
--   - Нельзя отправить больше, чем есть на балансе
-- ===========================================

CREATE OR REPLACE FUNCTION transfer_coins_to_partner(
  p_sender_telegram_id BIGINT,
  p_receiver_telegram_id BIGINT,
  p_amount INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_sender_user_id UUID;
  v_receiver_user_id UUID;
  v_sender_balance INTEGER;
  v_sender_new_balance INTEGER;
  v_receiver_balance INTEGER;
  v_receiver_new_balance INTEGER;
  v_is_partner BOOLEAN;
BEGIN
  -- Проверка 1: Сумма должна быть положительной
  IF p_amount < 1 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Минимальная сумма перевода — 1 нейрон'
    );
  END IF;

  -- Проверка 2: Нельзя отправить самому себе
  IF p_sender_telegram_id = p_receiver_telegram_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Нельзя отправить нейроны самому себе'
    );
  END IF;

  -- Получаем user_id отправителя
  SELECT id INTO v_sender_user_id
  FROM users
  WHERE telegram_id = p_sender_telegram_id;

  IF v_sender_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Отправитель не найден'
    );
  END IF;

  -- Получаем user_id получателя
  SELECT id INTO v_receiver_user_id
  FROM users
  WHERE telegram_id = p_receiver_telegram_id;

  IF v_receiver_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Получатель не найден'
    );
  END IF;

  -- Проверка 3: Получатель должен быть партнёром отправителя (referrer = отправитель, referred = получатель)
  SELECT EXISTS(
    SELECT 1 FROM referrals
    WHERE referrer_telegram_id = p_sender_telegram_id
      AND referred_telegram_id = p_receiver_telegram_id
  ) INTO v_is_partner;

  IF NOT v_is_partner THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Можно отправлять нейроны только своим партнёрам'
    );
  END IF;

  -- Получаем баланс отправителя (блокируем строку)
  SELECT coins INTO v_sender_balance
  FROM profiles
  WHERE user_id = v_sender_user_id
  FOR UPDATE;

  IF v_sender_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Профиль отправителя не найден'
    );
  END IF;

  -- Проверка 4: Достаточно ли монет
  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Недостаточно нейронов',
      'current_balance', v_sender_balance,
      'required', p_amount
    );
  END IF;

  -- Получаем баланс получателя (блокируем строку)
  SELECT coins INTO v_receiver_balance
  FROM profiles
  WHERE user_id = v_receiver_user_id
  FOR UPDATE;

  IF v_receiver_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Профиль получателя не найден'
    );
  END IF;

  -- Выполняем перевод
  v_sender_new_balance := v_sender_balance - p_amount;
  v_receiver_new_balance := v_receiver_balance + p_amount;

  -- Списываем у отправителя
  UPDATE profiles
  SET coins = v_sender_new_balance, updated_at = NOW()
  WHERE user_id = v_sender_user_id;

  -- Начисляем получателю
  UPDATE profiles
  SET coins = v_receiver_new_balance, updated_at = NOW()
  WHERE user_id = v_receiver_user_id;

  -- Записываем транзакцию списания (отправитель)
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (
    v_sender_user_id,
    -p_amount,
    v_sender_new_balance,
    'transfer',
    'Перевод партнёру (TG: ' || p_receiver_telegram_id || ')',
    jsonb_build_object(
      'receiver_telegram_id', p_receiver_telegram_id,
      'transfer_type', 'outgoing'
    )
  );

  -- Записываем транзакцию начисления (получатель)
  INSERT INTO coin_transactions (user_id, amount, balance_after, type, description, metadata)
  VALUES (
    v_receiver_user_id,
    p_amount,
    v_receiver_new_balance,
    'gift',
    'Подарок от партнёра (TG: ' || p_sender_telegram_id || ')',
    jsonb_build_object(
      'sender_telegram_id', p_sender_telegram_id,
      'transfer_type', 'incoming'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', p_amount,
    'sender_new_balance', v_sender_new_balance,
    'receiver_telegram_id', p_receiver_telegram_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
