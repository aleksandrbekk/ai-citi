-- 076_cloudinary_auto_cleanup.sql
-- Автоочистка Cloudinary: удаление картинок через 24ч после генерации

ALTER TABLE ai_generation_logs
  ADD COLUMN IF NOT EXISTS cloudinary_cleaned BOOLEAN DEFAULT false;

-- Индекс для быстрого поиска неочищенных логов
CREATE INDEX IF NOT EXISTS idx_ai_gen_logs_cloudinary_cleanup
  ON ai_generation_logs(cloudinary_cleaned, created_at)
  WHERE cloudinary_cleaned = false AND image_urls IS NOT NULL;

COMMENT ON COLUMN ai_generation_logs.cloudinary_cleaned IS 'true = картинки удалены с Cloudinary (автоочистка через 24ч)';
