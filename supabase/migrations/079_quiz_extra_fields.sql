-- ===========================================
-- Миграция: 079_quiz_extra_fields.sql
-- Описание: Добавляем display_mode, option_description, тип info
-- + обновляем nq_save_questions для сохранения всех полей
-- ===========================================

-- 1. Добавляем колонку display_mode в quiz_questions
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS display_mode VARCHAR(50) DEFAULT 'text_only';

-- 2. Добавляем колонку option_description в quiz_options
ALTER TABLE quiz_options ADD COLUMN IF NOT EXISTS option_description TEXT;

-- 3. Обновляем CHECK constraint на question_type (добавляем info)
ALTER TABLE quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;
ALTER TABLE quiz_questions ADD CONSTRAINT quiz_questions_question_type_check
  CHECK (question_type IN ('single_choice', 'multiple_choice', 'text', 'rating', 'info'));

-- 4. Обновляем nq_save_questions — сохраняем ВСЕ поля
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
        display_mode = CASE WHEN v_q ? 'display_mode' THEN v_q->>'display_mode' ELSE display_mode END,
        order_index = COALESCE((v_q->>'order_index')::INT, order_index),
        is_required = COALESCE((v_q->>'is_required')::BOOLEAN, is_required),
        updated_at = NOW()
      WHERE id = v_question_id;
    ELSE
      -- Создаём новый
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, question_image_url, display_mode, order_index, is_required)
      VALUES (
        p_quiz_id,
        COALESCE(v_q->>'question_text', 'Новый вопрос'),
        COALESCE(v_q->>'question_type', 'single_choice')::VARCHAR(50),
        v_q->>'question_image_url',
        COALESCE(v_q->>'display_mode', 'text_only'),
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
        INSERT INTO quiz_options (question_id, option_text, option_description, option_image_url, is_correct, order_index)
        VALUES (
          v_question_id,
          COALESCE(v_o->>'option_text', ''),
          v_o->>'option_description',
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

-- 5. Обновляем nq_get_quiz_with_questions — возвращаем новые поля
CREATE OR REPLACE FUNCTION nq_get_quiz_with_questions(p_quiz_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_quiz JSONB;
  v_questions JSONB;
BEGIN
  SELECT to_jsonb(q.*) INTO v_quiz
  FROM quizzes q WHERE q.id = p_quiz_id;

  IF v_quiz IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', qq.id,
      'question_text', qq.question_text,
      'question_image_url', qq.question_image_url,
      'question_type', qq.question_type,
      'display_mode', qq.display_mode,
      'order_index', qq.order_index,
      'is_required', qq.is_required,
      'options', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', qo.id,
            'option_text', qo.option_text,
            'option_description', qo.option_description,
            'option_image_url', qo.option_image_url,
            'is_correct', qo.is_correct,
            'order_index', qo.order_index
          ) ORDER BY qo.order_index
        )
        FROM quiz_options qo WHERE qo.question_id = qq.id
      ), '[]'::JSONB)
    ) ORDER BY qq.order_index
  ), '[]'::JSONB) INTO v_questions
  FROM quiz_questions qq WHERE qq.quiz_id = p_quiz_id;

  RETURN v_quiz || jsonb_build_object('questions', v_questions);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
