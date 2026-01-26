-- =============================================
-- Chat Tariff Limits Migration
-- Лимиты запросов к AI-чату по тарифам
-- =============================================

-- 1. Таблица лимитов по тарифам
CREATE TABLE IF NOT EXISTS chat_tariff_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tariff_slug TEXT UNIQUE NOT NULL,
  daily_limit INT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Вставляем тарифы с лимитами
INSERT INTO chat_tariff_limits (tariff_slug, daily_limit, display_name) VALUES
  ('basic', 10, 'BASIC'),
  ('pro', 50, 'PRO'),
  ('vip', 100, 'VIP'),
  ('elite', 300, 'ELITE'),
  ('platinum', 300, 'PLATINUM'),
  ('standard', 50, 'STANDARD')
ON CONFLICT (tariff_slug) DO UPDATE SET
  daily_limit = EXCLUDED.daily_limit,
  display_name = EXCLUDED.display_name;

-- 3. RLS
ALTER TABLE chat_tariff_limits ENABLE ROW LEVEL SECURITY;

-- Все могут читать лимиты
DROP POLICY IF EXISTS "Anyone can read chat_tariff_limits" ON chat_tariff_limits;
CREATE POLICY "Anyone can read chat_tariff_limits" ON chat_tariff_limits
  FOR SELECT USING (true);
