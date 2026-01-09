-- Таблица для галереи фото пользователей (до 3 фото)
CREATE TABLE IF NOT EXISTS user_photo_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  photo_url TEXT NOT NULL,
  slot_index INT NOT NULL CHECK (slot_index >= 1 AND slot_index <= 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telegram_id, slot_index)
);

-- Индекс для быстрого поиска по telegram_id
CREATE INDEX IF NOT EXISTS idx_user_photo_gallery_telegram_id ON user_photo_gallery(telegram_id);

-- RLS политики
ALTER TABLE user_photo_gallery ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи могут видеть и управлять своими фото
CREATE POLICY "Users can manage own photos" ON user_photo_gallery
  FOR ALL USING (true);
