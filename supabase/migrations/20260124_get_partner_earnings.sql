-- Функция получения заработка с конкретного партнёра
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
BEGIN
  SELECT id INTO v_referrer_user_id
  FROM users WHERE telegram_id = p_referrer_telegram_id;

  IF v_referrer_user_id IS NULL THEN
    RETURN jsonb_build_object('registration', 0, 'purchases', 0, 'spending', 0);
  END IF;

  -- Бонус за регистрацию
  SELECT COALESCE(SUM(amount), 0) INTO v_registration
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND (metadata->>'referred_telegram_id')::bigint = p_partner_telegram_id
    AND (metadata->>'bonus_type' = 'registration' OR description LIKE '%регистрац%');

  -- Бонус за покупки партнёра
  SELECT COALESCE(SUM(amount), 0) INTO v_purchases
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND ((metadata->>'partner_telegram_id')::bigint = p_partner_telegram_id
         OR (metadata->>'buyer_telegram_id')::bigint = p_partner_telegram_id)
    AND (metadata->>'bonus_type' = 'purchase' OR description LIKE '%покупк%');

  -- Бонус за траты партнёра
  SELECT COALESCE(SUM(amount), 0) INTO v_spending
  FROM coin_transactions
  WHERE user_id = v_referrer_user_id
    AND type IN ('referral', 'referral_bonus')
    AND (metadata->>'spender_telegram_id')::bigint = p_partner_telegram_id
    AND (metadata->>'bonus_type' = 'spend' OR description LIKE '%трат%');

  RETURN jsonb_build_object(
    'registration', v_registration,
    'purchases', v_purchases,
    'spending', v_spending
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
