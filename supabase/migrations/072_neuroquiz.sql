-- ===========================================
-- Миграция: 072_neuroquiz.sql
-- Описание: НЕЙРОКВИЗ — единый конструктор квизов
-- ===========================================

-- ===========================================
-- ALTER TABLE quizzes — новые колонки
-- ===========================================

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'Начать';

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS contact_config JSONB DEFAULT '{
  "enabled": false,
  "title": "Оставьте контакты",
  "description": "И мы свяжемся с вами",
  "fields": {
    "name": {"enabled": true, "required": true, "label": "Имя"},
    "phone": {"enabled": true, "required": true, "label": "Телефон"},
    "email": {"enabled": false, "required": false, "label": "Email"}
  }
}';

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS result_config JSONB DEFAULT '{
  "enabled": false,
  "title": "Результат",
  "description": "",
  "image_url": null
}';

ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS thank_you_config JSONB DEFAULT '{
  "title": "Спасибо!",
  "description": "Ваши ответы приняты",
  "cta_text": null,
  "cta_url": null
}';

-- Индексы
CREATE INDEX IF NOT EXISTS idx_quizzes_telegram_id ON quizzes(telegram_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_slug ON quizzes(slug) WHERE slug IS NOT NULL;

-- ===========================================
-- ТАБЛИЦА: quiz_leads
-- ===========================================

CREATE TABLE IF NOT EXISTS quiz_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  answers JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_quiz_id ON quiz_leads(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_created_at ON quiz_leads(created_at DESC);

ALTER TABLE quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz leads" ON quiz_leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Quiz leads readable via RPC" ON quiz_leads
  FOR SELECT USING (true);

-- ===========================================
-- RPC 1: nq_get_user_quizzes
-- ===========================================

CREATE OR REPLACE FUNCTION nq_get_user_quizzes(p_telegram_id BIGINT)
RETURNS TABLE(
  id UUID,
  title VARCHAR(255),
  description TEXT,
  slug TEXT,
  cover_image_url TEXT,
  cta_text TEXT,
  is_published BOOLEAN,
  contact_config JSONB,
  result_config JSONB,
  thank_you_config JSONB,
  settings JSONB,
  total_views INTEGER,
  total_completions INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT q.id, q.title, q.description, q.slug, q.cover_image_url, q.cta_text,
         q.is_published, q.contact_config, q.result_config, q.thank_you_config,
         q.settings, q.total_views, q.total_completions, q.created_at, q.updated_at
  FROM quizzes q
  WHERE q.telegram_id = p_telegram_id
  ORDER BY q.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_user_quizzes(BIGINT) TO anon, authenticated;

-- ===========================================
-- RPC 2: nq_create_quiz
-- ===========================================

CREATE OR REPLACE FUNCTION nq_create_quiz(
  p_telegram_id BIGINT,
  p_title TEXT DEFAULT 'Новый квиз'
)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  title VARCHAR(255)
) AS $$
DECLARE
  v_user_id UUID;
  v_slug TEXT;
  v_quiz_id UUID;
BEGIN
  -- Ищем user_id по telegram_id
  SELECT u.id INTO v_user_id FROM users u WHERE u.telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for telegram_id %', p_telegram_id;
  END IF;

  -- Генерируем уникальный slug (6 символов)
  LOOP
    v_slug := lower(substr(md5(random()::text), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM quizzes WHERE quizzes.slug = v_slug);
  END LOOP;

  INSERT INTO quizzes (user_id, telegram_id, title, slug, is_published, is_public)
  VALUES (v_user_id, p_telegram_id, p_title::VARCHAR(255), v_slug, false, true)
  RETURNING quizzes.id INTO v_quiz_id;

  RETURN QUERY SELECT v_quiz_id, v_slug, p_title::VARCHAR(255);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_create_quiz(BIGINT, TEXT) TO anon, authenticated;

-- ===========================================
-- RPC 3: nq_update_quiz
-- ===========================================

CREATE OR REPLACE FUNCTION nq_update_quiz(
  p_telegram_id BIGINT,
  p_quiz_id UUID,
  p_updates JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Проверяем владение
  SELECT COUNT(*) INTO v_count FROM quizzes WHERE id = p_quiz_id AND telegram_id = p_telegram_id;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'Quiz not found or access denied';
  END IF;

  UPDATE quizzes SET
    title = COALESCE((p_updates->>'title')::VARCHAR(255), title),
    description = CASE WHEN p_updates ? 'description' THEN p_updates->>'description' ELSE description END,
    cover_image_url = CASE WHEN p_updates ? 'cover_image_url' THEN p_updates->>'cover_image_url' ELSE cover_image_url END,
    cta_text = COALESCE(p_updates->>'cta_text', cta_text),
    is_published = COALESCE((p_updates->>'is_published')::BOOLEAN, is_published),
    settings = CASE WHEN p_updates ? 'settings' THEN p_updates->'settings' ELSE settings END,
    contact_config = CASE WHEN p_updates ? 'contact_config' THEN p_updates->'contact_config' ELSE contact_config END,
    result_config = CASE WHEN p_updates ? 'result_config' THEN p_updates->'result_config' ELSE result_config END,
    thank_you_config = CASE WHEN p_updates ? 'thank_you_config' THEN p_updates->'thank_you_config' ELSE thank_you_config END,
    updated_at = NOW()
  WHERE id = p_quiz_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_update_quiz(BIGINT, UUID, JSONB) TO anon, authenticated;

-- ===========================================
-- RPC 4: nq_delete_quiz
-- ===========================================

CREATE OR REPLACE FUNCTION nq_delete_quiz(p_telegram_id BIGINT, p_quiz_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM quizzes WHERE id = p_quiz_id AND telegram_id = p_telegram_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_delete_quiz(BIGINT, UUID) TO anon, authenticated;

-- ===========================================
-- RPC 5: nq_get_quiz_with_questions
-- ===========================================

CREATE OR REPLACE FUNCTION nq_get_quiz_with_questions(p_quiz_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quiz JSONB;
  v_questions JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', q.id,
    'title', q.title,
    'description', q.description,
    'slug', q.slug,
    'cover_image_url', q.cover_image_url,
    'cta_text', q.cta_text,
    'is_published', q.is_published,
    'settings', q.settings,
    'contact_config', q.contact_config,
    'result_config', q.result_config,
    'thank_you_config', q.thank_you_config,
    'total_views', q.total_views,
    'total_completions', q.total_completions,
    'telegram_id', q.telegram_id,
    'created_at', q.created_at,
    'updated_at', q.updated_at
  ) INTO v_quiz
  FROM quizzes q WHERE q.id = p_quiz_id;

  IF v_quiz IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', qq.id,
      'question_text', qq.question_text,
      'question_type', qq.question_type,
      'question_image_url', qq.question_image_url,
      'order_index', qq.order_index,
      'is_required', qq.is_required,
      'options', COALESCE(
        (SELECT jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'option_text', qo.option_text,
            'option_image_url', qo.option_image_url,
            'is_correct', qo.is_correct,
            'order_index', qo.order_index
          ) ORDER BY qo.order_index
        ) FROM quiz_options qo WHERE qo.question_id = qq.id),
        '[]'::jsonb
      )
    ) ORDER BY qq.order_index
  ), '[]'::jsonb) INTO v_questions
  FROM quiz_questions qq WHERE qq.quiz_id = p_quiz_id;

  RETURN v_quiz || jsonb_build_object('questions', v_questions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_quiz_with_questions(UUID) TO anon, authenticated;

-- ===========================================
-- RPC 6: nq_get_quiz_by_slug
-- ===========================================

CREATE OR REPLACE FUNCTION nq_get_quiz_by_slug(p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quiz_id UUID;
BEGIN
  SELECT q.id INTO v_quiz_id FROM quizzes q WHERE q.slug = p_slug AND q.is_published = true;
  IF v_quiz_id IS NULL THEN RETURN NULL; END IF;
  RETURN nq_get_quiz_with_questions(v_quiz_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_quiz_by_slug(TEXT) TO anon, authenticated;

-- ===========================================
-- RPC 7: nq_save_questions (bulk)
-- ===========================================

CREATE OR REPLACE FUNCTION nq_save_questions(
  p_telegram_id BIGINT,
  p_quiz_id UUID,
  p_questions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_q JSONB;
  v_o JSONB;
  v_question_id UUID;
  v_existing_q_ids UUID[];
  v_new_q_ids UUID[] := '{}';
BEGIN
  -- Проверяем владение
  IF NOT EXISTS (SELECT 1 FROM quizzes WHERE id = p_quiz_id AND telegram_id = p_telegram_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Существующие вопросы
  SELECT COALESCE(array_agg(qq.id), '{}') INTO v_existing_q_ids
  FROM quiz_questions qq WHERE qq.quiz_id = p_quiz_id;

  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    IF v_q->>'id' IS NOT NULL AND (v_q->>'id')::UUID = ANY(v_existing_q_ids) THEN
      -- Обновляем существующий
      v_question_id := (v_q->>'id')::UUID;
      UPDATE quiz_questions SET
        question_text = COALESCE(v_q->>'question_text', question_text),
        question_type = COALESCE(v_q->>'question_type', question_type)::VARCHAR(50),
        order_index = COALESCE((v_q->>'order_index')::INT, order_index),
        is_required = COALESCE((v_q->>'is_required')::BOOLEAN, is_required),
        updated_at = NOW()
      WHERE id = v_question_id;
    ELSE
      -- Создаём новый
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, order_index, is_required)
      VALUES (
        p_quiz_id,
        COALESCE(v_q->>'question_text', 'Новый вопрос'),
        COALESCE(v_q->>'question_type', 'single_choice')::VARCHAR(50),
        COALESCE((v_q->>'order_index')::INT, 0),
        COALESCE((v_q->>'is_required')::BOOLEAN, true)
      ) RETURNING id INTO v_question_id;
    END IF;

    v_new_q_ids := v_new_q_ids || v_question_id;

    -- Удаляем старые опции и вставляем новые
    DELETE FROM quiz_options WHERE question_id = v_question_id;

    IF v_q ? 'options' THEN
      FOR v_o IN SELECT * FROM jsonb_array_elements(v_q->'options')
      LOOP
        INSERT INTO quiz_options (question_id, option_text, is_correct, order_index)
        VALUES (
          v_question_id,
          COALESCE(v_o->>'option_text', ''),
          COALESCE((v_o->>'is_correct')::BOOLEAN, false),
          COALESCE((v_o->>'order_index')::INT, 0)
        );
      END LOOP;
    END IF;
  END LOOP;

  -- Удаляем вопросы, которых нет в новом списке
  DELETE FROM quiz_questions
  WHERE quiz_id = p_quiz_id AND id != ALL(v_new_q_ids);

  -- Обновляем updated_at квиза
  UPDATE quizzes SET updated_at = NOW() WHERE id = p_quiz_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_save_questions(BIGINT, UUID, JSONB) TO anon, authenticated;

-- ===========================================
-- RPC 8: nq_submit_lead
-- ===========================================

CREATE OR REPLACE FUNCTION nq_submit_lead(
  p_quiz_id UUID,
  p_session_id TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_answers JSONB DEFAULT '[]'
)
RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  INSERT INTO quiz_leads (quiz_id, session_id, name, phone, email, answers)
  VALUES (p_quiz_id, p_session_id, p_name, p_phone, p_email, p_answers)
  RETURNING id INTO v_lead_id;

  -- Инкрементируем счётчик
  UPDATE quizzes SET total_completions = total_completions + 1 WHERE id = p_quiz_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_submit_lead(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated;

-- ===========================================
-- RPC 9: nq_get_quiz_leads
-- ===========================================

CREATE OR REPLACE FUNCTION nq_get_quiz_leads(p_telegram_id BIGINT, p_quiz_id UUID)
RETURNS TABLE(
  id UUID,
  quiz_id UUID,
  session_id TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  answers JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Проверяем владение
  IF NOT EXISTS (SELECT 1 FROM quizzes q WHERE q.id = p_quiz_id AND q.telegram_id = p_telegram_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT ql.id, ql.quiz_id, ql.session_id, ql.name, ql.phone, ql.email, ql.answers, ql.created_at
  FROM quiz_leads ql
  WHERE ql.quiz_id = p_quiz_id
  ORDER BY ql.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_quiz_leads(BIGINT, UUID) TO anon, authenticated;

-- ===========================================
-- RPC 10: nq_increment_views
-- ===========================================

CREATE OR REPLACE FUNCTION nq_increment_views(p_quiz_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE quizzes SET total_views = total_views + 1 WHERE id = p_quiz_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_increment_views(UUID) TO anon, authenticated;

-- ===========================================
-- Reload schema
-- ===========================================
NOTIFY pgrst, 'reload schema';
