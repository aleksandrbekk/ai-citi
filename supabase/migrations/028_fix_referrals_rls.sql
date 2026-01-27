-- Исправление RLS политик для referrals и referral_stats
-- Задача 1.3 из ROADMAP: убрать USING (true)

-- ==========================================
-- REFERRALS
-- ==========================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view referrals" ON referrals;
DROP POLICY IF EXISTS "Admins can manage referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;

-- Убеждаемся что RLS включён
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои рефералы (где он referrer или referee)
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT
  USING (
    referrer_telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    OR referee_telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Service role может всё (для Edge Functions)
CREATE POLICY "Service role full access referrals" ON referrals
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE referrals IS 'Реферальные связи. RLS: видишь только где ты referrer или referee.';

-- ==========================================
-- REFERRAL_STATS
-- ==========================================

-- Удаляем старые политики
DROP POLICY IF EXISTS "Anyone can view referral_stats" ON referral_stats;
DROP POLICY IF EXISTS "Admins can manage referral_stats" ON referral_stats;
DROP POLICY IF EXISTS "Users can view own referral_stats" ON referral_stats;

-- Убеждаемся что RLS включён
ALTER TABLE referral_stats ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свою статистику
CREATE POLICY "Users can view own referral_stats" ON referral_stats
  FOR SELECT
  USING (
    telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Service role может всё (для Edge Functions)
CREATE POLICY "Service role full access referral_stats" ON referral_stats
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE referral_stats IS 'Статистика рефералов. RLS: только своя статистика.';

-- ==========================================
-- PAYMENT_EMAILS (если есть)
-- ==========================================

-- Проверяем существование таблицы и добавляем политики
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_emails') THEN
    -- Удаляем старые политики
    DROP POLICY IF EXISTS "Anyone can view payment_emails" ON payment_emails;
    DROP POLICY IF EXISTS "Admins can manage payment_emails" ON payment_emails;

    -- Включаем RLS
    ALTER TABLE payment_emails ENABLE ROW LEVEL SECURITY;

    -- Только service_role может работать с payment_emails
    CREATE POLICY "Service role only" ON payment_emails
      FOR ALL
      USING (auth.role() = 'service_role');

    COMMENT ON TABLE payment_emails IS 'Email для платежей. RLS: только service_role.';
  END IF;
END $$;
