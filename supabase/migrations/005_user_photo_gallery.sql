-- Таблица для галереи фото пользователя (до 3 фото)
CREATE TABLE IF NOT EXISTS user_photo_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  photo_url TEXT NOT NULL,
  slot_index INTEGER NOT NULL CHECK (slot_index BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(telegram_id, slot_index)
);

CREATE INDEX IF NOT EXISTS idx_user_photo_gallery_telegram_id 
ON user_photo_gallery(telegram_id);

ALTER TABLE user_photo_gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read photos" ON user_photo_gallery FOR SELECT USING (true);
CREATE POLICY "Anyone can insert photos" ON user_photo_gallery FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own photos" ON user_photo_gallery FOR DELETE USING (true);
CREATE POLICY "Anyone can update own photos" ON user_photo_gallery FOR UPDATE USING (true);
