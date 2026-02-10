-- AI Engine Config — конфигурация провайдеров AI
-- Управляется через админку, без изменения кода

CREATE TABLE IF NOT EXISTS ai_engine_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- === Генерация текста ===
  text_provider TEXT NOT NULL DEFAULT 'gemini',          -- gemini | openrouter
  text_api_key TEXT NOT NULL DEFAULT '',                  -- API ключ основного провайдера
  text_model TEXT NOT NULL DEFAULT 'gemini-2.0-flash',   -- Модель для текста
  text_fallback_provider TEXT,                           -- Резервный провайдер
  text_fallback_key TEXT,                                -- Резервный ключ
  
  -- === Генерация изображений ===
  image_provider TEXT NOT NULL DEFAULT 'imagen',          -- imagen | ideogram
  image_api_key TEXT NOT NULL DEFAULT '',                 -- API ключ (может совпадать с text_api_key)
  image_model TEXT NOT NULL DEFAULT 'imagen-4',           -- Модель для картинок
  
  -- === Доставка ===
  telegram_bot_token TEXT NOT NULL DEFAULT '',            -- Токен бота для отправки результатов
  cloudinary_cloud TEXT NOT NULL DEFAULT 'ds8ylsl2x',    -- Cloudinary cloud name
  cloudinary_preset TEXT NOT NULL DEFAULT 'carousel_unsigned', -- Upload preset
  
  -- === Настройки ===
  max_retries INT NOT NULL DEFAULT 2,                    -- Макс. повторов при ошибке
  use_search_grounding BOOLEAN NOT NULL DEFAULT true,    -- Google Search grounding (только Gemini)
  use_internal_engine BOOLEAN NOT NULL DEFAULT false,    -- Feature flag: true = свой движок, false = n8n
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- === Мета ===
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by BIGINT                                      -- telegram_id админа
);

-- RLS: только service_role может читать/писать (содержит ключи!)
ALTER TABLE ai_engine_config ENABLE ROW LEVEL SECURITY;

-- Никакой RLS policy для anon/authenticated — доступ ТОЛЬКО через service_role
-- Edge Functions используют service_role key

-- Комментарии для документации
COMMENT ON TABLE ai_engine_config IS 'Конфигурация AI Engine — провайдеры, ключи, модели. Управляется через админку.';
COMMENT ON COLUMN ai_engine_config.text_provider IS 'Провайдер текста: gemini | openrouter';
COMMENT ON COLUMN ai_engine_config.use_internal_engine IS 'Feature flag: true = свой движок carousel-engine, false = n8n webhook';
