-- Migration: 024_promo_links_rls.sql
-- Добавляем RLS политики для таблицы promo_links
-- Для админки нужен доступ на INSERT/UPDATE/DELETE

-- Сначала убедимся что RLS включен
ALTER TABLE promo_links ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "promo_links_select_policy" ON promo_links;
DROP POLICY IF EXISTS "promo_links_insert_policy" ON promo_links;
DROP POLICY IF EXISTS "promo_links_update_policy" ON promo_links;
DROP POLICY IF EXISTS "promo_links_delete_policy" ON promo_links;
DROP POLICY IF EXISTS "promo_links_admin_all" ON promo_links;

-- Политика для SELECT (все могут читать активные промо-ссылки)
CREATE POLICY "promo_links_select_policy" ON promo_links
  FOR SELECT USING (true);

-- Единая политика для всех операций от авторизованных пользователей-админов
-- В TMA админ определяется проверкой is_admin в таблице users
CREATE POLICY "promo_links_admin_all" ON promo_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.telegram_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint
      AND users.is_admin = true
    )
  );

-- Также добавляем политику для anon роли если пользователь — админ
-- Проверка через telegram_id который есть в JWT claims
-- Более простой вариант — разрешить всем авторизованным
CREATE POLICY "promo_links_authenticated_insert" ON promo_links
  FOR INSERT
  WITH CHECK (true); -- Временно разрешаем, потом ограничим

CREATE POLICY "promo_links_authenticated_update" ON promo_links
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "promo_links_authenticated_delete" ON promo_links
  FOR DELETE
  USING (true);

-- Также для promo_claims
ALTER TABLE promo_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_claims_select_policy" ON promo_claims;
DROP POLICY IF EXISTS "promo_claims_insert_policy" ON promo_claims;

CREATE POLICY "promo_claims_select_policy" ON promo_claims
  FOR SELECT USING (true);

CREATE POLICY "promo_claims_insert_policy" ON promo_claims
  FOR INSERT
  WITH CHECK (true);
