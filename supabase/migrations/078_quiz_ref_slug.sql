-- ===========================================
-- Миграция: 077_quiz_ref_slug.sql
-- Описание: Красивые ссылки для квизов /q/{ref}/{slug}
-- ===========================================

-- 1. Убираем глобально уникальный индекс slug, делаем уникальный per-user
DROP INDEX IF EXISTS idx_quizzes_slug;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quizzes_telegram_slug
  ON quizzes(telegram_id, slug) WHERE slug IS NOT NULL;

-- 2. Обновляем nq_create_quiz — slug = quiz-N (по счётчику квизов пользователя)
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

  -- Считаем квизы пользователя для генерации slug
  SELECT COUNT(*) INTO v_count FROM quizzes WHERE telegram_id = p_telegram_id;
  v_slug := 'quiz-' || (v_count + 1);

  -- Проверяем уникальность (на случай если удаляли квизы)
  WHILE EXISTS (SELECT 1 FROM quizzes WHERE quizzes.telegram_id = p_telegram_id AND quizzes.slug = v_slug) LOOP
    v_count := v_count + 1;
    v_slug := 'quiz-' || (v_count + 1);
  END LOOP;

  INSERT INTO quizzes (user_id, telegram_id, title, slug, is_published, is_public)
  VALUES (v_user_id, p_telegram_id, p_title::VARCHAR(255), v_slug, false, true)
  RETURNING quizzes.id INTO v_quiz_id;

  RETURN QUERY SELECT v_quiz_id, v_slug, p_title::VARCHAR(255);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Обновляем nq_update_quiz — добавляем обновление slug
CREATE OR REPLACE FUNCTION nq_update_quiz(
  p_telegram_id BIGINT,
  p_quiz_id UUID,
  p_updates JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
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
    slug = CASE WHEN p_updates ? 'slug' THEN p_updates->>'slug' ELSE slug END,
    settings = CASE WHEN p_updates ? 'settings' THEN p_updates->'settings' ELSE settings END,
    contact_config = CASE WHEN p_updates ? 'contact_config' THEN p_updates->'contact_config' ELSE contact_config END,
    result_config = CASE WHEN p_updates ? 'result_config' THEN p_updates->'result_config' ELSE result_config END,
    thank_you_config = CASE WHEN p_updates ? 'thank_you_config' THEN p_updates->'thank_you_config' ELSE thank_you_config END,
    updated_at = NOW()
  WHERE id = p_quiz_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Новая RPC: nq_get_quiz_by_ref_slug — поиск по referral_code + slug
CREATE OR REPLACE FUNCTION nq_get_quiz_by_ref_slug(p_ref TEXT, p_slug TEXT)
RETURNS JSONB AS $$
DECLARE
  v_quiz_id UUID;
BEGIN
  SELECT q.id INTO v_quiz_id
  FROM quizzes q
  JOIN users u ON u.telegram_id = q.telegram_id
  WHERE u.referral_code = p_ref
    AND q.slug = p_slug
    AND q.is_published = true;

  IF v_quiz_id IS NULL THEN RETURN NULL; END IF;
  RETURN nq_get_quiz_with_questions(v_quiz_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION nq_get_quiz_by_ref_slug(TEXT, TEXT) TO anon, authenticated;
