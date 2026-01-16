-- ===========================================
-- Миграция: 012_utm_system.sql
-- Описание: Система UTM-ссылок и аналитики
-- Автор: АНЯ
-- ===========================================

-- Таблица UTM кампаний/ссылок
CREATE TABLE IF NOT EXISTS utm_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- Название кампании (для админа)
  utm_source VARCHAR(100), -- google, facebook, telegram, instagram
  utm_medium VARCHAR(100), -- cpc, banner, email, social
  utm_campaign VARCHAR(255), -- Название рекламной кампании
  utm_content VARCHAR(255), -- Контент (для A/B тестов)
  utm_term VARCHAR(255), -- Ключевые слова
  short_code VARCHAR(50) UNIQUE, -- Короткий код для ссылки
  target_url TEXT DEFAULT '/', -- Куда вести (по умолчанию главная)
  is_active BOOLEAN DEFAULT true,
  clicks INTEGER DEFAULT 0,
  unique_clicks INTEGER DEFAULT 0,
  registrations INTEGER DEFAULT 0, -- Конверсии в регистрацию
  purchases INTEGER DEFAULT 0, -- Конверсии в покупку
  created_by BIGINT, -- telegram_id админа
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица визитов по UTM
CREATE TABLE IF NOT EXISTS utm_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  telegram_id BIGINT, -- Если пользователь авторизован
  visitor_hash VARCHAR(64), -- Хеш для анонимных (fingerprint)
  user_agent TEXT,
  referrer TEXT,
  ip_address VARCHAR(45),
  country VARCHAR(10),
  device_type VARCHAR(20), -- mobile, desktop, tablet
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица конверсий
CREATE TABLE IF NOT EXISTS utm_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES utm_campaigns(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES utm_visits(id) ON DELETE SET NULL,
  telegram_id BIGINT NOT NULL,
  conversion_type VARCHAR(50) NOT NULL, -- registration, purchase, subscription
  conversion_value DECIMAL(10,2) DEFAULT 0, -- Сумма (для покупок)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_short_code ON utm_campaigns(short_code);
CREATE INDEX IF NOT EXISTS idx_utm_campaigns_is_active ON utm_campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_utm_visits_campaign_id ON utm_visits(campaign_id);
CREATE INDEX IF NOT EXISTS idx_utm_visits_telegram_id ON utm_visits(telegram_id);
CREATE INDEX IF NOT EXISTS idx_utm_visits_created_at ON utm_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_utm_conversions_campaign_id ON utm_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_utm_conversions_telegram_id ON utm_conversions(telegram_id);

-- RLS
ALTER TABLE utm_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE utm_conversions ENABLE ROW LEVEL SECURITY;

-- Политики: только чтение для всех (для трекинга), полный доступ для service role
CREATE POLICY "Public can read active campaigns" ON utm_campaigns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role full access to campaigns" ON utm_campaigns
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can insert visits" ON utm_visits
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access to visits" ON utm_visits
  FOR ALL USING (true);

CREATE POLICY "Anyone can insert conversions" ON utm_conversions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role full access to conversions" ON utm_conversions
  FOR ALL USING (true);

-- Функция записи визита
CREATE OR REPLACE FUNCTION track_utm_visit(
  p_campaign_id UUID,
  p_telegram_id BIGINT DEFAULT NULL,
  p_visitor_hash VARCHAR(64) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL,
  p_device_type VARCHAR(20) DEFAULT 'unknown'
)
RETURNS UUID AS $$
DECLARE
  v_visit_id UUID;
  v_is_unique BOOLEAN := false;
BEGIN
  -- Проверяем уникальность визита
  IF p_telegram_id IS NOT NULL THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM utm_visits
      WHERE campaign_id = p_campaign_id AND telegram_id = p_telegram_id
    ) INTO v_is_unique;
  ELSIF p_visitor_hash IS NOT NULL THEN
    SELECT NOT EXISTS(
      SELECT 1 FROM utm_visits
      WHERE campaign_id = p_campaign_id AND visitor_hash = p_visitor_hash
    ) INTO v_is_unique;
  END IF;

  -- Записываем визит
  INSERT INTO utm_visits (campaign_id, telegram_id, visitor_hash, user_agent, referrer, device_type)
  VALUES (p_campaign_id, p_telegram_id, p_visitor_hash, p_user_agent, p_referrer, p_device_type)
  RETURNING id INTO v_visit_id;

  -- Обновляем счётчики кампании
  UPDATE utm_campaigns
  SET
    clicks = clicks + 1,
    unique_clicks = unique_clicks + (CASE WHEN v_is_unique THEN 1 ELSE 0 END),
    updated_at = NOW()
  WHERE id = p_campaign_id;

  RETURN v_visit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция записи конверсии
CREATE OR REPLACE FUNCTION track_utm_conversion(
  p_telegram_id BIGINT,
  p_conversion_type VARCHAR(50),
  p_conversion_value DECIMAL(10,2) DEFAULT 0,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_campaign_id UUID;
  v_visit_id UUID;
BEGIN
  -- Находим последний визит этого пользователя
  SELECT campaign_id, id INTO v_campaign_id, v_visit_id
  FROM utm_visits
  WHERE telegram_id = p_telegram_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_campaign_id IS NULL THEN
    RETURN false; -- Нет UTM визита
  END IF;

  -- Записываем конверсию
  INSERT INTO utm_conversions (campaign_id, visit_id, telegram_id, conversion_type, conversion_value, metadata)
  VALUES (v_campaign_id, v_visit_id, p_telegram_id, p_conversion_type, p_conversion_value, p_metadata);

  -- Обновляем счётчики кампании
  IF p_conversion_type = 'registration' THEN
    UPDATE utm_campaigns SET registrations = registrations + 1, updated_at = NOW() WHERE id = v_campaign_id;
  ELSIF p_conversion_type IN ('purchase', 'subscription') THEN
    UPDATE utm_campaigns SET purchases = purchases + 1, updated_at = NOW() WHERE id = v_campaign_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Функция получения статистики кампании
CREATE OR REPLACE FUNCTION get_utm_campaign_stats(p_campaign_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'campaign', row_to_json(c.*),
    'visits_by_day', (
      SELECT jsonb_agg(jsonb_build_object('date', date, 'visits', count))
      FROM (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM utm_visits
        WHERE campaign_id = p_campaign_id
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      ) daily
    ),
    'conversions_by_type', (
      SELECT jsonb_object_agg(conversion_type, count)
      FROM (
        SELECT conversion_type, COUNT(*) as count
        FROM utm_conversions
        WHERE campaign_id = p_campaign_id
        GROUP BY conversion_type
      ) types
    ),
    'devices', (
      SELECT jsonb_object_agg(device_type, count)
      FROM (
        SELECT device_type, COUNT(*) as count
        FROM utm_visits
        WHERE campaign_id = p_campaign_id
        GROUP BY device_type
      ) devices
    )
  ) INTO v_stats
  FROM utm_campaigns c
  WHERE c.id = p_campaign_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
