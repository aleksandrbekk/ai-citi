-- Исправление RLS политик для user_photo_gallery
-- Задача 1.3 из ROADMAP: убрать USING (true)

-- Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own photos" ON user_photo_gallery;
DROP POLICY IF EXISTS "Users can insert own photos" ON user_photo_gallery;
DROP POLICY IF EXISTS "Users can update own photos" ON user_photo_gallery;
DROP POLICY IF EXISTS "Users can delete own photos" ON user_photo_gallery;
DROP POLICY IF EXISTS "Anyone can view photos" ON user_photo_gallery;
DROP POLICY IF EXISTS "Admins can manage photos" ON user_photo_gallery;

-- Убеждаемся что RLS включён
ALTER TABLE user_photo_gallery ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои фото
CREATE POLICY "Users can view own photos" ON user_photo_gallery
  FOR SELECT
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Политика: пользователь может загружать только свои фото
CREATE POLICY "Users can insert own photos" ON user_photo_gallery
  FOR INSERT
  WITH CHECK (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Политика: пользователь может обновлять только свои фото
CREATE POLICY "Users can update own photos" ON user_photo_gallery
  FOR UPDATE
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Политика: пользователь может удалять только свои фото
CREATE POLICY "Users can delete own photos" ON user_photo_gallery
  FOR DELETE
  USING (telegram_id = current_setting('request.jwt.claims', true)::json->>'telegram_id');

-- Service role может всё (для Edge Functions)
CREATE POLICY "Service role full access" ON user_photo_gallery
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON TABLE user_photo_gallery IS 'Галерея фото пользователей. RLS: только свои фото.';
