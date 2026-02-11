-- 075_carousel_engine_fixes.sql
-- Ротация API ключей + фиксы carousel-engine

-- ============================================================
-- 1. ai_engine_config — ротация ключей + fallback
-- ============================================================

-- Ротация ключей (JSONB массивы: [{key, label, enabled}])
ALTER TABLE ai_engine_config
  ADD COLUMN IF NOT EXISTS text_api_keys JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_api_keys JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS text_fallback_keys JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS image_fallback_keys JSONB DEFAULT '[]'::jsonb;

-- Модель для текстового fallback (фикс бага: раньше использовалась модель основного провайдера)
ALTER TABLE ai_engine_config
  ADD COLUMN IF NOT EXISTS text_fallback_model TEXT;

-- Image fallback (раньше не было fallback для картинок)
ALTER TABLE ai_engine_config
  ADD COLUMN IF NOT EXISTS image_fallback_provider TEXT,
  ADD COLUMN IF NOT EXISTS image_fallback_model TEXT,
  ADD COLUMN IF NOT EXISTS image_fallback_key TEXT;

-- ============================================================
-- 2. ai_generation_logs — трекинг ключей и рефандов
-- ============================================================

ALTER TABLE ai_generation_logs
  ADD COLUMN IF NOT EXISTS text_key_index INT,
  ADD COLUMN IF NOT EXISTS image_key_index INT,
  ADD COLUMN IF NOT EXISTS coins_refunded BOOLEAN DEFAULT false;

-- ============================================================
-- 3. cleanup_hung_generations — очистка зависших генераций
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_hung_generations(p_timeout_minutes INT DEFAULT 5)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE ai_generation_logs
  SET status = 'error',
      error_message = 'Timeout: generation stuck for over ' || p_timeout_minutes || ' minutes'
  WHERE status IN ('pending', 'generating_text', 'generating_images', 'uploading', 'sending')
    AND created_at < NOW() - (p_timeout_minutes || ' minutes')::interval;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Разрешаем вызов из Edge Functions (service_role)
GRANT EXECUTE ON FUNCTION cleanup_hung_generations TO service_role;

COMMENT ON FUNCTION cleanup_hung_generations IS 'Помечает зависшие генерации (>N минут) как error. Вызывается при каждом новом запуске пайплайна.';
