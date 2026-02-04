-- 052_fix_partner_stats_separate_generations.sql
-- ИСПРАВЛЕНИЕ: Разделение статистики генераций и покупок стилей
-- Проблема: Покупка стиля за 290 нейронов показывалась как ~10 генераций

-- ===========================================
-- 1. ОБНОВЛЯЕМ get_partner_earnings — добавляем раздельный учёт
-- ===========================================
CREATE OR REPLACE FUNCTION get_partner_earnings(
  p_referrer_telegram_id BIGINT,
  p_partner_telegram_id BIGINT
)
RETURNS JSONB AS $$
DECLARE
  v_referrer_user_id UUID;
  v_registration INTEGER := 0;
  v_purchases INTEGER := 0;
  v_spending INTEGER := 0;
  v_generation_count INTEGER := 0;
  v_style_purchases INTEGER := 0;
BEGIN
  SELECT id INTO v_referrer_user_id
  FROM users WHERE telegram_id = p_referrer_telegram_id;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'registration', 0,
      'purchases', 0,
      'spending', 0,
      'generation_count', 0,
      'style_purchases', 0
    );
  END IF;

  -- Бонус за регистрацию (отключён, но оставляем для истории)
  SELECT COALESCE(SUM(amount), 0) INTO v_registration
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND (metadata->>'referred_telegram_id')::bigint = p_partner_telegram_id
    AND (metadata->>'bonus_type' = 'registration' OR description LIKE '%регистрац%');

  -- Бонус за покупки партнёра (отключён)
  SELECT COALESCE(SUM(amount), 0) INTO v_purchases
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND ((metadata->>'partner_telegram_id')::bigint = p_partner_telegram_id
         OR (metadata->>'buyer_telegram_id')::bigint = p_partner_telegram_id)
    AND (metadata->>'bonus_type' = 'purchase' OR description LIKE '%покупк%');

  -- Бонус за траты партнёра (ВСЕ траты)
  SELECT COALESCE(SUM(amount), 0) INTO v_spending
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND (metadata->>'spender_telegram_id')::bigint = p_partner_telegram_id
    AND (metadata->>'bonus_type' = 'spend' OR description LIKE '%трат%');

  -- НОВОЕ: Подсчитываем количество ГЕНЕРАЦИЙ партнёра
  -- Смотрим в транзакции ПАРТНЁРА (не реферера) типа generation/carousel
  SELECT COUNT(*) INTO v_generation_count
  FROM coin_transactions ct
  JOIN users u ON ct.user_id = u.id
  WHERE u.telegram_id = p_partner_telegram_id
    AND ct.type IN ('generation', 'carousel')
    AND ct.amount < 0;  -- Только списания (траты)

  -- НОВОЕ: Подсчитываем количество ПОКУПОК СТИЛЕЙ партнёра
  SELECT COUNT(*) INTO v_style_purchases
  FROM coin_transactions ct
  JOIN users u ON ct.user_id = u.id
  WHERE u.telegram_id = p_partner_telegram_id
    AND ct.type = 'style_purchase'
    AND ct.amount < 0;

  RETURN jsonb_build_object(
    'registration', v_registration,
    'purchases', v_purchases,
    'spending', v_spending,
    'generation_count', v_generation_count,
    'style_purchases', v_style_purchases
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 2. КОММЕНТАРИЙ
-- ===========================================
COMMENT ON FUNCTION get_partner_earnings IS
'Получает статистику заработка с партнёра: бонусы + счётчики генераций и покупок стилей';
