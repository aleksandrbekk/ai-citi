-- ===========================================
-- Миграция: 077_neuroquiz_v2.sql
-- Описание: НЕЙРОКВИЗ v2 — новые поля, картинки, slug-обновление
-- ===========================================

-- ===========================================
-- 1. quiz_leads — новое поле telegram_username
-- ===========================================

ALTER TABLE quiz_leads ADD COLUMN IF NOT EXISTS telegram_username TEXT;

-- ===========================================
-- 2. Обновляем nq_update_quiz — поддержка slug
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
    slug = CASE WHEN p_updates ? 'slug' AND (p_updates->>'slug') IS NOT NULL AND (p_updates->>'slug') != '' THEN p_updates->>'slug' ELSE slug END,
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
-- 3. Обновляем nq_save_questions — поддержка image URL
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
        question_image_url = CASE WHEN v_q ? 'question_image_url' THEN v_q->>'question_image_url' ELSE question_image_url END,
        order_index = COALESCE((v_q->>'order_index')::INT, order_index),
        is_required = COALESCE((v_q->>'is_required')::BOOLEAN, is_required),
        updated_at = NOW()
      WHERE id = v_question_id;
    ELSE
      -- Создаём новый
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, question_image_url, order_index, is_required)
      VALUES (
        p_quiz_id,
        COALESCE(v_q->>'question_text', 'Новый вопрос'),
        COALESCE(v_q->>'question_type', 'single_choice')::VARCHAR(50),
        v_q->>'question_image_url',
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
        INSERT INTO quiz_options (question_id, option_text, option_image_url, is_correct, order_index)
        VALUES (
          v_question_id,
          COALESCE(v_o->>'option_text', ''),
          v_o->>'option_image_url',
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
-- 4. Обновляем nq_submit_lead — поддержка telegram_username
-- ===========================================

CREATE OR REPLACE FUNCTION nq_submit_lead(
  p_quiz_id UUID,
  p_session_id TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_answers JSONB DEFAULT '[]',
  p_telegram_username TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_lead_id UUID;
BEGIN
  INSERT INTO quiz_leads (quiz_id, session_id, name, phone, email, telegram_username, answers)
  VALUES (p_quiz_id, p_session_id, p_name, p_phone, p_email, p_telegram_username, p_answers)
  RETURNING id INTO v_lead_id;

  -- Инкрементируем счётчик
  UPDATE quizzes SET total_completions = total_completions + 1 WHERE id = p_quiz_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_submit_lead(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon, authenticated;

-- ===========================================
-- 5. Обновляем nq_get_quiz_leads — возвращаем telegram_username
-- ===========================================

CREATE OR REPLACE FUNCTION nq_get_quiz_leads(p_telegram_id BIGINT, p_quiz_id UUID)
RETURNS TABLE(
  id UUID,
  quiz_id UUID,
  session_id TEXT,
  name TEXT,
  phone TEXT,
  telegram_username TEXT,
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
  SELECT ql.id, ql.quiz_id, ql.session_id, ql.name, ql.phone, ql.telegram_username, ql.email, ql.answers, ql.created_at
  FROM quiz_leads ql
  WHERE ql.quiz_id = p_quiz_id
  ORDER BY ql.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_quiz_leads(BIGINT, UUID) TO anon, authenticated;

-- ===========================================
-- Reload schema
-- ===========================================
NOTIFY pgrst, 'reload schema';
