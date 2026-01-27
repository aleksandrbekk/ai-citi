-- Исправление RLS политик для payments
-- Задача 1.3 из ROADMAP: убрать USING (true)

-- Удаляем старые политики
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Anyone can view payments" ON payments;

-- Убеждаемся что RLS включён
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои платежи
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT
  USING (
    telegram_id::text = current_setting('request.jwt.claims', true)::json->>'telegram_id'
  );

-- Service role может всё (для Edge Functions и админки)
CREATE POLICY "Service role full access" ON payments
  FOR ALL
  USING (auth.role() = 'service_role');

-- Anon не может ничего
-- (по умолчанию запрещено, так как нет политики для anon)

COMMENT ON TABLE payments IS 'История платежей. RLS: только свои платежи + service_role.';
