-- =============================================
-- Chat Analytics & Model Settings Migration
-- =============================================

-- 1. Таблица для логирования использования чата
CREATE TABLE IF NOT EXISTS chat_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Токены
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  
  -- Изображения
  images_count INT DEFAULT 0,
  
  -- Модель
  model TEXT NOT NULL,
  
  -- Стоимость (расчётная в THB)
  cost_thb DECIMAL(10,4) DEFAULT 0,
  
  -- Дополнительная информация
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Индексы для быстрых запросов
CREATE INDEX IF NOT EXISTS idx_chat_usage_user ON chat_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_usage_date ON chat_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_usage_model ON chat_usage(model);

-- RLS политики
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;

-- Админы могут видеть всё
CREATE POLICY "Admins can view all chat_usage" ON chat_usage
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Service role может вставлять
CREATE POLICY "Service role can insert chat_usage" ON chat_usage
  FOR INSERT WITH CHECK (true);

-- 2. Таблица настроек чата (одна строка)
CREATE TABLE IF NOT EXISTS chat_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Только одна строка
  active_model TEXT DEFAULT 'gemini-2.5-pro-preview-06-05',
  fallback_model TEXT DEFAULT 'gemini-2.5-flash',
  max_retries INT DEFAULT 2,
  
  -- Лимиты
  daily_token_limit_per_user INT DEFAULT NULL, -- NULL = без лимита
  daily_message_limit_per_user INT DEFAULT NULL,
  
  -- Уведомления
  alert_telegram_chat_id TEXT DEFAULT NULL,
  alert_on_model_failure BOOLEAN DEFAULT false,
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- RLS для chat_settings
ALTER TABLE chat_settings ENABLE ROW LEVEL SECURITY;

-- Все могут читать настройки
CREATE POLICY "Anyone can read chat_settings" ON chat_settings
  FOR SELECT USING (true);

-- Только админы могут обновлять
CREATE POLICY "Admins can update chat_settings" ON chat_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- Вставляем дефолтные настройки
INSERT INTO chat_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. View для агрегированной статистики по юзерам
CREATE OR REPLACE VIEW chat_usage_stats AS
SELECT 
  user_id,
  COUNT(*) as total_messages,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  SUM(images_count) as total_images,
  SUM(cost_thb) as total_cost_thb,
  MAX(created_at) as last_message_at,
  COUNT(*) FILTER (WHERE created_at > now() - interval '1 day') as messages_today,
  SUM(input_tokens + output_tokens) FILTER (WHERE created_at > now() - interval '1 day') as tokens_today
FROM chat_usage
GROUP BY user_id;

-- 4. Функция для расчёта стоимости
CREATE OR REPLACE FUNCTION calculate_chat_cost(
  p_input_tokens INT,
  p_output_tokens INT,
  p_images_count INT DEFAULT 0
) RETURNS DECIMAL(10,4) AS $$
BEGIN
  -- Цены Gemini 2.5 Pro в THB за миллион токенов
  -- Input: $1.25/M = ฿43/M = ฿0.000043/token
  -- Output: $10/M = ฿345/M = ฿0.000345/token
  -- Image: ฿0.054/image
  RETURN 
    (p_input_tokens * 0.000043) + 
    (p_output_tokens * 0.000345) + 
    (p_images_count * 0.054);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
