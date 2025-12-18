-- ===========================================
-- SQL для исправления RLS политик
-- Выполнить в Supabase SQL Editor:
-- https://supabase.com/dashboard/project/debcwvxlvozjlqkhnauy/sql/new
-- ===========================================

-- Проверяем текущие политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('users', 'profiles');

-- Удаляем старые политики которые могут блокировать service_role
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data" ON users;
DROP POLICY IF EXISTS "Profiles are viewable by owner" ON profiles;
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
DROP POLICY IF EXISTS "Service role has full access to profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can insert users" ON users;
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- ===========================================
-- ТАБЛИЦА: users
-- ===========================================

-- Политика для service_role (Edge Functions) - полный доступ
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL 
  USING (
    -- service_role обходит RLS, но если нужно явно проверить:
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    -- Для обычных пользователей через auth.uid()
    id = auth.uid()
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    id = auth.uid()
  );

-- Политика для SELECT (просмотр своих данных)
CREATE POLICY "Users can view own data" ON users
  FOR SELECT 
  USING (id = auth.uid());

-- Политика для INSERT (создание через Edge Function)
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Политика для UPDATE (обновление своих данных или через service_role)
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE
  USING (
    id = auth.uid()
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    id = auth.uid()
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ===========================================
-- ТАБЛИЦА: profiles
-- ===========================================

-- Политика для service_role - полный доступ
CREATE POLICY "Service role has full access to profiles" ON profiles
  FOR ALL
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    user_id = auth.uid()
  )
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR
    user_id = auth.uid()
  );

-- Политика для SELECT (просмотр своего профиля)
CREATE POLICY "Profiles are viewable by owner" ON profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- Политика для INSERT (создание профиля через триггер или Edge Function)
CREATE POLICY "Service role can insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Политика для UPDATE (обновление своего профиля или через service_role)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  )
  WITH CHECK (
    user_id = auth.uid()
    OR
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ===========================================
-- ПРОВЕРКА
-- ===========================================

-- Проверяем структуру таблиц
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Проверяем триггер создания профиля
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users';

-- Проверяем новые политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename IN ('users', 'profiles')
ORDER BY tablename, policyname;




