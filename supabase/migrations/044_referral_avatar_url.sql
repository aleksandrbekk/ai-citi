-- ===========================================
-- Миграция: 044_referral_avatar_url.sql
-- Описание: Добавляем avatar_url в функцию get_referral_stats
-- ===========================================

-- Обновляем функцию get_referral_stats чтобы включать avatar_url
CREATE OR REPLACE FUNCTION get_referral_stats(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_stats RECORD;
  v_referrals JSONB;
BEGIN
  -- Получаем статистику
  SELECT * INTO v_stats
  FROM referral_stats
  WHERE telegram_id = p_telegram_id;

  -- Получаем список рефералов С avatar_url
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'telegram_id', r.referred_telegram_id,
      'username', u.username,
      'first_name', u.first_name,
      'avatar_url', u.avatar_url,
      'created_at', r.created_at
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
