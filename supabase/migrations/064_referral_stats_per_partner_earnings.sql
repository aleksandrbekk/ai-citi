-- ===========================================
-- Миграция: 064_referral_stats_per_partner_earnings.sql
-- Описание: Добавляем earnings (доход) по каждому партнёру
-- в get_referral_stats
-- ===========================================

CREATE OR REPLACE FUNCTION get_referral_stats(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_stats RECORD;
  v_referrals JSONB;
  v_user_id UUID;
BEGIN
  -- Получаем user_id реферера
  SELECT id INTO v_user_id FROM users WHERE telegram_id = p_telegram_id;

  -- Получаем статистику
  SELECT * INTO v_stats
  FROM referral_stats
  WHERE telegram_id = p_telegram_id;

  -- Получаем список рефералов С avatar_url И earnings
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'telegram_id', r.referred_telegram_id,
      'username', u.username,
      'first_name', u.first_name,
      'avatar_url', u.avatar_url,
      'created_at', r.created_at,
      'earnings', COALESCE((
        SELECT SUM(ct.amount)::INTEGER
        FROM coin_transactions ct
        WHERE ct.user_id = v_user_id
          AND ct.type = 'referral'
          AND (
            ct.metadata->>'spender_telegram_id' = r.referred_telegram_id::TEXT
            OR ct.metadata->>'referred_telegram_id' = r.referred_telegram_id::TEXT
            OR ct.metadata->>'buyer_telegram_id' = r.referred_telegram_id::TEXT
          )
      ), 0)
    ) ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO v_referrals
  FROM referrals r
  JOIN users u ON r.referred_user_id = u.id
  WHERE r.referrer_telegram_id = p_telegram_id;

  RETURN jsonb_build_object(
    'total_referrals', COALESCE(v_stats.total_referrals, 0),
    'total_coins_earned', COALESCE(v_stats.total_coins_earned, 0),
    'total_partner_spent', COALESCE(v_stats.total_partner_spent, 0),
    'total_partner_purchased', COALESCE(v_stats.total_partner_purchased, 0),
    'referrals', v_referrals
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
