-- ===========================================
-- Миграция: 005_quizzes.sql
-- Описание: Таблицы для конструктора квизов
-- Автор: АНЯ
-- ===========================================

-- ===========================================
-- ТАБЛИЦА: quizzes
-- ===========================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{
    "show_correct_answers": true,
    "randomize_questions": false,
    "randomize_options": false,
    "time_limit": null,
    "passing_score": null,
    "show_progress": true,
    "allow_retake": true
  }',
  total_views INTEGER DEFAULT 0,
  total_completions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_published ON quizzes(is_published);
CREATE INDEX IF NOT EXISTS idx_quizzes_is_public ON quizzes(is_public);

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quizzes" ON quizzes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Public quizzes are viewable by everyone" ON quizzes
  FOR SELECT USING (is_public = true AND is_published = true);

-- Триггер updated_at
CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- ТАБЛИЦА: quiz_questions
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  question_type VARCHAR(50) DEFAULT 'single_choice' CHECK (question_type IN ('single_choice', 'multiple_choice', 'text', 'rating')),
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, order_index);

-- RLS
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage questions of own quizzes" ON quiz_questions
  FOR ALL USING (
    quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
  );

CREATE POLICY "Public quiz questions are viewable" ON quiz_questions
  FOR SELECT USING (
    quiz_id IN (SELECT id FROM quizzes WHERE is_public = true AND is_published = true)
  );

-- Триггер updated_at
CREATE TRIGGER update_quiz_questions_updated_at
  BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- ТАБЛИЦА: quiz_options
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_image_url TEXT,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_order ON quiz_options(question_id, order_index);

-- RLS
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage options of own quizzes" ON quiz_options
  FOR ALL USING (
    question_id IN (
      SELECT id FROM quiz_questions 
      WHERE quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Public quiz options are viewable" ON quiz_options
  FOR SELECT USING (
    question_id IN (
      SELECT id FROM quiz_questions 
      WHERE quiz_id IN (SELECT id FROM quizzes WHERE is_public = true AND is_published = true)
    )
  );

-- ===========================================
-- ТАБЛИЦА: quiz_responses
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- Для анонимных пользователей
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  score INTEGER DEFAULT 0,
  max_score INTEGER,
  percentage DECIMAL(5,2),
  answers JSONB DEFAULT '[]', -- [{question_id, option_ids, text_answer, is_correct}]
  metadata JSONB DEFAULT '{}', -- {ip, user_agent, referrer}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_responses_quiz_id ON quiz_responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user_id ON quiz_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session_id ON quiz_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_completed_at ON quiz_responses(completed_at);

-- RLS
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses" ON quiz_responses
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Anyone can create responses" ON quiz_responses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own responses" ON quiz_responses
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- ===========================================
-- ТАБЛИЦА: quiz_analytics
-- ===========================================
CREATE TABLE IF NOT EXISTS quiz_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'start', 'complete', 'abandon')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_quiz_id ON quiz_analytics(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_event_type ON quiz_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_created_at ON quiz_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_analytics_quiz_event ON quiz_analytics(quiz_id, event_type);

-- RLS
ALTER TABLE quiz_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics of own quizzes" ON quiz_analytics
  FOR SELECT USING (
    quiz_id IN (SELECT id FROM quizzes WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can create analytics events" ON quiz_analytics
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- ФУНКЦИЯ: Обновление статистики квиза
-- ===========================================
CREATE OR REPLACE FUNCTION update_quiz_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at) THEN
    UPDATE quizzes 
    SET total_completions = total_completions + 1
    WHERE id = NEW.quiz_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_quiz_response_completed
  AFTER UPDATE ON quiz_responses
  FOR EACH ROW
  WHEN (NEW.completed_at IS NOT NULL AND (OLD.completed_at IS NULL OR OLD.completed_at IS DISTINCT FROM NEW.completed_at))
  EXECUTE FUNCTION update_quiz_stats();

-- ===========================================
-- ФУНКЦИЯ: Обновление просмотров квиза
-- ===========================================
CREATE OR REPLACE FUNCTION increment_quiz_views()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'view' THEN
    UPDATE quizzes 
    SET total_views = total_views + 1
    WHERE id = NEW.quiz_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_quiz_view
  AFTER INSERT ON quiz_analytics
  FOR EACH ROW
  WHEN (NEW.event_type = 'view')
  EXECUTE FUNCTION increment_quiz_views();
