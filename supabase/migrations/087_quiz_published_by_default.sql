-- 087_quiz_published_by_default.sql
-- Квизы публикуются по умолчанию при создании

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
  v_count INTEGER;
BEGIN
  SELECT u.id INTO v_user_id FROM users u WHERE u.telegram_id = p_telegram_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found for telegram_id %', p_telegram_id;
  END IF;

  SELECT COUNT(*) INTO v_count FROM quizzes WHERE telegram_id = p_telegram_id;
  v_slug := 'quiz-' || (v_count + 1);

  WHILE EXISTS (SELECT 1 FROM quizzes WHERE quizzes.telegram_id = p_telegram_id AND quizzes.slug = v_slug) LOOP
    v_count := v_count + 1;
    v_slug := 'quiz-' || (v_count + 1);
  END LOOP;

  INSERT INTO quizzes (user_id, telegram_id, title, slug, is_published, is_public)
  VALUES (v_user_id, p_telegram_id, p_title::VARCHAR(255), v_slug, true, true)
  RETURNING quizzes.id INTO v_quiz_id;

  RETURN QUERY SELECT v_quiz_id, v_slug, p_title::VARCHAR(255);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Публикуем все существующие неопубликованные квизы
UPDATE quizzes SET is_published = true WHERE is_published = false;
