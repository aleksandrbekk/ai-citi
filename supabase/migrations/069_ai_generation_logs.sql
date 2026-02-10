-- AI Generation Logs — логи всех генераций каруселей
-- Для мониторинга, отладки и аналитики

CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id BIGINT NOT NULL,                       -- telegram_id пользователя
  topic TEXT,                                     -- Тема карусели
  style_id TEXT,                                  -- ID стиля
  
  -- === Провайдеры ===
  text_provider TEXT,                             -- Какой провайдер использовался для текста
  text_model TEXT,                                -- Какая модель
  image_provider TEXT,                            -- Какой провайдер для картинок
  image_model TEXT,                               -- Какая модель
  
  -- === Статус ===
  status TEXT NOT NULL DEFAULT 'pending',         -- pending | generating_text | generating_images | uploading | sending | success | error
  error_message TEXT,                             -- Текст ошибки если есть
  error_stage TEXT,                               -- На каком этапе упало: text | image | upload | telegram
  
  -- === Тайминги (мс) ===
  text_gen_ms INT,                                -- Время генерации текста
  image_gen_ms INT,                               -- Время генерации всех картинок
  upload_ms INT,                                  -- Время загрузки на CDN
  telegram_ms INT,                                -- Время отправки в Telegram
  total_ms INT,                                   -- Общее время от старта до финиша
  
  -- === Результат ===
  slides_count INT,                               -- Сколько слайдов сгенерировано
  image_urls TEXT[],                              -- Массив URL картинок на CDN
  
  -- === Мета ===
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть свои логи
CREATE POLICY "users_read_own_logs" ON ai_generation_logs
  FOR SELECT USING (user_id = (current_setting('request.jwt.claims', true)::json->>'telegram_id')::bigint);

-- Индекс для быстрых запросов по пользователю
CREATE INDEX idx_ai_gen_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX idx_ai_gen_logs_created_at ON ai_generation_logs(created_at DESC);
CREATE INDEX idx_ai_gen_logs_status ON ai_generation_logs(status);

COMMENT ON TABLE ai_generation_logs IS 'Логи генераций каруселей через AI Engine. Для мониторинга и аналитики.';
