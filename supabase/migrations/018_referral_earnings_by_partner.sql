-- ===========================================
-- Миграция: 018_referral_earnings_by_partner.sql
-- Описание: Функция для получения детального заработка с каждого партнёра
-- Автор: АНЯ
-- ===========================================

CREATE OR REPLACE FUNCTION get_referral_earnings_by_partner(p_telegram_id BIGINT)
RETURNS TABLE (
  referred_telegram_id BIGINT,
  referred_username VARCHAR(100),
  referred_first_name VARCHAR(100),
  registration_bonus INTEGER,
  purchase_bonus INTEGER,
  spend_bonus INTEGER,
  total_earned INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.referred_telegram_id,
    u.username,
    u.first_name,
    COALESCE(SUM(CASE WHEN ct.metadata->>'bonus_type' = 'registration' THEN ct.amount ELSE 0 END), 0)::INTEGER as registration_bonus,
    COALESCE(SUM(CASE WHEN ct.metadata->>'bonus_type' = 'purchase' THEN ct.amount ELSE 0 END), 0)::INTEGER as purchase_bonus,
    COALESCE(SUM(CASE WHEN ct.metadata->>'bonus_type' = 'spend' THEN ct.amount ELSE 0 END), 0)::INTEGER as spend_bonus,
    COALESCE(SUM(ct.amount), 0)::INTEGER as total_earned,
    r.created_at
  FROM referrals r
  LEFT JOIN users u ON r.referred_user_id = u.id
  LEFT JOIN users referrer ON r.referrer_user_id = referrer.id
  LEFT JOIN coin_transactions ct ON
    ct.user_id = r.referrer_user_id
    AND ct.type = 'referral'
    AND (ct.metadata->>'referred_telegram_id')::BIGINT = r.referred_telegram_id
  WHERE r.referrer_telegram_id = p_telegram_id
  GROUP BY r.referred_telegram_id, u.username, u.first_name, r.created_at
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
