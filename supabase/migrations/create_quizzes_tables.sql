-- =============================================
-- Миграция: Создание таблиц для квизов
-- Дата: 2026-01-12
-- =============================================

-- 1. Основная таблица квизов
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Новый квиз',
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  total_views INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Таблица рядов изображений (для группировки картинок)
CREATE TABLE IF NOT EXISTS quiz_image_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Таблица изображений квиза
CREATE TABLE IF NOT EXISTS quiz_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  row_id UUID REFERENCES quiz_image_rows(id) ON DELETE CASCADE,
  row_index INTEGER DEFAULT 0,
  image_index INTEGER DEFAULT 0,
  image_url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Таблица ответов/сессий пользователей
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_id BIGINT,
  session_id UUID NOT NULL,
  answers JSONB DEFAULT '{}',
  ratings JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- 5. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quiz_images_quiz_id ON quiz_images(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_images_row_id ON quiz_images(row_id);
CREATE INDEX IF NOT EXISTS idx_quiz_image_rows_quiz_id ON quiz_image_rows(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_id ON quiz_responses(session_id);

-- 6. Триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_quizzes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quizzes_updated_at ON quizzes;
CREATE TRIGGER trigger_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_quizzes_updated_at();

-- 7. RLS политики (Row Level Security)

-- Включаем RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_image_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

-- Политики для quizzes
-- Все могут читать опубликованные и публичные квизы
CREATE POLICY "Public quizzes are viewable by everyone" ON quizzes
  FOR SELECT USING (is_published = true AND is_public = true);

-- Любой может вставлять квизы (для анонимных пользователей из админки)
CREATE POLICY "Anyone can insert quizzes" ON quizzes
  FOR INSERT WITH CHECK (true);

-- Любой может обновлять квизы (упрощённая политика для MVP)
CREATE POLICY "Anyone can update quizzes" ON quizzes
  FOR UPDATE USING (true);

-- Любой может удалять квизы
CREATE POLICY "Anyone can delete quizzes" ON quizzes
  FOR DELETE USING (true);

-- Политики для quiz_images
CREATE POLICY "Quiz images are viewable by everyone" ON quiz_images
  FOR SELECT USING (true);

CREATE POLICY "Anyone can manage quiz images" ON quiz_images
  FOR ALL USING (true);

-- Политики для quiz_image_rows
CREATE POLICY "Quiz image rows are viewable by everyone" ON quiz_image_rows
  FOR SELECT USING (true);

CREATE POLICY "Anyone can manage quiz image rows" ON quiz_image_rows
  FOR ALL USING (true);

-- Политики для quiz_responses
CREATE POLICY "Anyone can view quiz responses" ON quiz_responses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert quiz responses" ON quiz_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update quiz responses" ON quiz_responses
  FOR UPDATE USING (true);

-- 8. RPC функция для создания квиза (обход RLS если нужно)
CREATE OR REPLACE FUNCTION create_quiz_as_admin(
  p_title TEXT DEFAULT 'Новый квиз',
  p_description TEXT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL,
  p_is_published BOOLEAN DEFAULT false,
  p_is_public BOOLEAN DEFAULT true,
  p_settings JSONB DEFAULT '{}'
)
RETURNS quizzes AS $$
DECLARE
  new_quiz quizzes;
BEGIN
  INSERT INTO quizzes (title, description, cover_image_url, is_published, is_public, settings)
  VALUES (p_title, p_description, p_cover_image_url, p_is_published, p_is_public, p_settings)
  RETURNING * INTO new_quiz;
  
  RETURN new_quiz;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Даём права на выполнение функции
GRANT EXECUTE ON FUNCTION create_quiz_as_admin TO anon, authenticated;

-- =============================================
-- Готово! Таблицы для квизов созданы.
-- =============================================
