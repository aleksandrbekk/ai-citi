-- ===========================================
-- Миграция: 004_course_tables.sql
-- Описание: Таблицы для курса МЛМ ЛАГЕРЬ
-- ===========================================

-- ===========================================
-- ТАБЛИЦА: course_modules
-- ===========================================
CREATE TABLE IF NOT EXISTS course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  min_tariff VARCHAR(50) DEFAULT 'platinum',
  lessons_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ТАБЛИЦА: course_lessons
-- ===========================================
CREATE TABLE IF NOT EXISTS course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  video_id VARCHAR(100),
  video_url TEXT,
  video_duration INTEGER,
  has_homework BOOLEAN DEFAULT false,
  homework_title VARCHAR(255),
  homework_description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ТАБЛИЦА: lesson_materials
-- ===========================================
CREATE TABLE IF NOT EXISTS lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'link',
  title VARCHAR(255),
  url TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- ТАБЛИЦА: homework_submissions
-- ===========================================
CREATE TABLE IF NOT EXISTS homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
  answer_text TEXT,
  answer_files TEXT[],
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  curator_comment TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- ===========================================
-- ИНДЕКСЫ
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON course_lessons(module_id, order_index);
CREATE INDEX IF NOT EXISTS idx_materials_lesson ON lesson_materials(lesson_id);
CREATE INDEX IF NOT EXISTS idx_homework_user ON homework_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_lesson ON homework_submissions(lesson_id);

-- ===========================================
-- ROW LEVEL SECURITY
-- ===========================================
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions ENABLE ROW LEVEL SECURITY;

-- Модули и уроки видны всем авторизованным
CREATE POLICY "Modules viewable by authenticated" ON course_modules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Lessons viewable by authenticated" ON course_lessons
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Materials viewable by authenticated" ON lesson_materials
  FOR SELECT USING (auth.role() = 'authenticated');

-- ДЗ: пользователь видит и редактирует только свои
CREATE POLICY "Users view own homework" ON homework_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own homework" ON homework_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own homework" ON homework_submissions
  FOR UPDATE USING (auth.uid() = user_id);

-- ===========================================
-- ТРИГГЕРЫ
-- ===========================================

-- Триггер обновления updated_at для модулей
CREATE TRIGGER update_course_modules_updated_at
  BEFORE UPDATE ON course_modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер обновления updated_at для уроков
CREATE TRIGGER update_course_lessons_updated_at
  BEFORE UPDATE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер обновления updated_at для ДЗ
CREATE TRIGGER update_homework_submissions_updated_at
  BEFORE UPDATE ON homework_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер обновления lessons_count в модуле
CREATE OR REPLACE FUNCTION update_module_lessons_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE course_modules SET lessons_count = lessons_count + 1 WHERE id = NEW.module_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE course_modules SET lessons_count = lessons_count - 1 WHERE id = OLD.module_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_lesson_change
  AFTER INSERT OR DELETE ON course_lessons
  FOR EACH ROW EXECUTE FUNCTION update_module_lessons_count();




