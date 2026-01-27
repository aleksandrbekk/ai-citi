-- Исправление RLS политик для profiles
-- Задача 1.3 из ROADMAP: убрать USING (true)

-- Удаляем старые проблемные политики
DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Убеждаемся что RLS включён
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свой профиль
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (
    telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    OR user_id = auth.uid()
  );

-- Политика: пользователь может обновлять только свой профиль
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (
    telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
    OR user_id = auth.uid()
  );

-- Service role может всё (для Edge Functions)
CREATE POLICY "Service role full access" ON profiles
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE profiles IS 'Профили пользователей. RLS: только свой профиль + service_role.';
