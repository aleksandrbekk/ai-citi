-- ===========================================
-- Миграция: 045_fix_referral_bonus_on_spend.sql
-- Описание: ИСПРАВЛЕНИЕ БАГА - spend_coins не вызывала начисление реферального бонуса
-- Проблема: В миграции 035 функция была перезаписана без вызова pay_referral_spend_bonus
-- ===========================================

-- Исправленная функция spend_coins с вызовом реферального бонуса
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

  -- ВАЖНО: Начисляем реферальный бонус 10% рефереру
  -- Это было утеряно в миграции 035!
  IF p_type IN ('generation', 'carousel', 'service') THEN
    SELECT pay_referral_spend_bonus(p_telegram_id, p_amount) INTO v_referral_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previous_balance', v_current_coins,
    'spent', p_amount,
    'new_balance', v_new_balance,
    'referral_bonus', COALESCE(v_referral_result, '{}'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Обновляем grant
GRANT EXECUTE ON FUNCTION spend_coins(BIGINT, INTEGER, VARCHAR, TEXT, JSONB) TO anon, authenticated;

-- ===========================================
-- Добавляем функцию для получения статистики трат пользователя
-- ===========================================
CREATE OR REPLACE FUNCTION get_user_spend_stats(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_total_spent INTEGER;
  v_total_earned INTEGER;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('total_spent', 0, 'total_earned', 0);
  END IF;

  -- Считаем сколько потрачено (отрицательные транзакции)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total_spent
  FROM coin_transactions
  WHERE user_id = v_user_id AND amount < 0;

  -- Считаем сколько заработано от рефералов
  SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
  FROM coin_transactions
  WHERE user_id = v_user_id AND type = 'referral' AND amount > 0;

  RETURN jsonb_build_object(
    'total_spent', v_total_spent,
    'total_earned', v_total_earned
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_spend_stats(BIGINT) TO anon, authenticated;

-- Комментарий
COMMENT ON FUNCTION spend_coins IS 'Списывает монеты и начисляет 10% реферальный бонус рефереру';
COMMENT ON FUNCTION get_user_spend_stats IS 'Получает статистику трат и заработка пользователя';
