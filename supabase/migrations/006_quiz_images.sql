-- ===========================================
-- Миграция: 006_quiz_images.sql
-- Описание: Таблицы для картинок/рядов квиза (оценка каруселей)
-- Автор: АНЯ
-- ===========================================

-- ===========================================
-- ТАБЛИЦА: quiz_images
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  row_index INTEGER NOT NULL DEFAULT 0,
  image_index INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_images_quiz_id ON quiz_images(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_images_row_image ON quiz_images(quiz_id, row_index, image_index);

-- RLS
ALTER TABLE quiz_images ENABLE ROW LEVEL SECURITY;

-- Дропаем/создаём политики идемпотентно
DROP POLICY IF EXISTS "Users can manage images of own quizzes" ON quiz_images;
CREATE POLICY "Users can manage images of own quizzes" ON quiz_images
  FOR ALL USING (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE (user_id = auth.uid()) OR (user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    )
  );

DROP POLICY IF EXISTS "Public quiz images are viewable" ON quiz_images;
-- Важно: картинки должны быть видимы по публичной ссылке (в т.ч. для предпросмотра),
-- поэтому привязываемся к is_public, без требования is_published.
CREATE POLICY "Public quiz images are viewable" ON quiz_images
  FOR SELECT USING (
    quiz_id IN (SELECT id FROM quizzes WHERE is_public = true)
  );

-- ===========================================
-- ТАБЛИЦА: quiz_image_rows
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_image_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL DEFAULT 0,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_image_rows_quiz_id ON quiz_image_rows(quiz_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_image_rows_quiz_row ON quiz_image_rows(quiz_id, row_index);

-- RLS
ALTER TABLE quiz_image_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage image rows of own quizzes" ON quiz_image_rows;
CREATE POLICY "Users can manage image rows of own quizzes" ON quiz_image_rows
  FOR ALL USING (
    quiz_id IN (
      SELECT id FROM quizzes
      WHERE (user_id = auth.uid()) OR (user_id = '00000000-0000-0000-0000-000000000001'::uuid)
    )
  );

DROP POLICY IF EXISTS "Public quiz rows are viewable" ON quiz_image_rows;
CREATE POLICY "Public quiz rows are viewable" ON quiz_image_rows
  FOR SELECT USING (
    quiz_id IN (SELECT id FROM quizzes WHERE is_public = true)
  );

-- Триггер updated_at
DROP TRIGGER IF EXISTS update_quiz_image_rows_updated_at ON quiz_image_rows;
CREATE TRIGGER update_quiz_image_rows_updated_at
  BEFORE UPDATE ON quiz_image_rows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

