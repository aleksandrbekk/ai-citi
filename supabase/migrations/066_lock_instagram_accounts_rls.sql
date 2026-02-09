-- Закрываем прямой доступ к instagram_accounts через anon key
-- Все операции идут через Edge Functions (service_role_key)
-- Это защищает access_token от утечки

-- Удаляем старую открытую политику (если была)
DROP POLICY IF EXISTS "Users can manage own instagram accounts" ON instagram_accounts;

-- Создаём строгую политику: запрещаем всё через anon key
-- Edge Functions используют service_role_key, который обходит RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'No direct access to instagram accounts' AND tablename = 'instagram_accounts'
  ) THEN
    CREATE POLICY "No direct access to instagram accounts" ON instagram_accounts FOR ALL USING (false);
  END IF;
END $$;

-- Убеждаемся что RLS включён
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
