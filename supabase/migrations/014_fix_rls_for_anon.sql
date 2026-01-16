-- ===========================================
-- Миграция: 014_fix_rls_for_anon.sql
-- Описание: Исправление RLS политик для работы с анонимным ключом
-- Проблема: Фронтенд использует Telegram авторизацию, а не Supabase Auth,
--           поэтому auth.uid() всегда NULL и RLS блокирует запросы
-- ===========================================

-- 1. Разрешающая политика для чтения users (нужно для получения referral_code)
DROP POLICY IF EXISTS "Anyone can read users by telegram_id" ON users;
CREATE POLICY "Anyone can read users by telegram_id" ON users
  FOR SELECT
  USING (true);

-- 2. Разрешающая политика для чтения profiles (нужно для получения баланса монет)
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT
  USING (true);

-- 3. RPC функция для получения referral_code с SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_user_referral_code(p_telegram_id BIGINT)
RETURNS TEXT AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT referral_code INTO v_code
  FROM users
  WHERE telegram_id = p_telegram_id;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
