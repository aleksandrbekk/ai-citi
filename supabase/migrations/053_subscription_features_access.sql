-- 053_subscription_features_access.sql
-- Система доступа к функциям по подписке
-- PRO/ELITE: AI Академия, Закрытый клуб, Бот-транскрибатор, Скидка на стили

-- ===========================================
-- 1. ОБНОВЛЯЕМ СУЩЕСТВУЮЩИЕ ДАННЫЕ
-- ===========================================

-- Переименовываем 'starter' в 'pro', 'elite' в 'elite' где нужно
UPDATE user_subscriptions SET plan = 'pro' WHERE plan = 'starter';
UPDATE user_subscriptions SET plan = 'elite' WHERE plan = 'elite';
UPDATE profiles SET subscription = 'pro' WHERE subscription = 'starter';
UPDATE profiles SET subscription = 'elite' WHERE subscription = 'elite';

-- ===========================================
-- 2. ОБНОВЛЯЕМ CHECK CONSTRAINTS — добавляем 'elite'
-- ===========================================

-- user_subscriptions
ALTER TABLE user_subscriptions
DROP CONSTRAINT IF EXISTS user_subscriptions_plan_check;

ALTER TABLE user_subscriptions
ADD CONSTRAINT user_subscriptions_plan_check
CHECK (plan IN ('free', 'pro', 'elite'));

-- profiles
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_subscription_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_subscription_check
CHECK (subscription IN ('free', 'pro', 'elite'));

-- ===========================================
-- 2. ТАБЛИЦА ФУНКЦИЙ ПОДПИСКИ
-- ===========================================
CREATE TABLE IF NOT EXISTS subscription_features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  min_plan TEXT NOT NULL DEFAULT 'pro' CHECK (min_plan IN ('free', 'pro', 'elite')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Заполняем функции
INSERT INTO subscription_features (id, name, description, min_plan) VALUES
  ('ai_academy', 'AI Академия', 'Доступ к обучающим материалам и курсам', 'pro'),
  ('closed_club', 'Закрытый клуб', 'Доступ к закрытому сообществу', 'pro'),
  ('transcriber_bot', 'Бот-транскрибатор', 'Конвертация видео/аудио в текст', 'pro'),
  ('style_discount', 'Скидка на стили', '30% скидка на покупку стилей', 'pro'),
  ('extra_styles', 'Дополнительные стили', 'Доступ к расширенному набору стилей', 'pro'),
  ('priority_generation', 'Приоритетная генерация', 'Ускоренная очередь генерации', 'pro'),
  ('style_coupon', 'Купон на стиль', 'Бесплатный купон на любой стиль', 'elite')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  min_plan = EXCLUDED.min_plan;

-- ===========================================
-- 3. ФУНКЦИЯ: Проверка доступа к функции
-- ===========================================
CREATE OR REPLACE FUNCTION check_feature_access(
  p_telegram_id BIGINT,
  p_feature_id TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_plan TEXT;
  v_feature_min_plan TEXT;
  v_plan_level INTEGER;
  v_required_level INTEGER;
  v_has_access BOOLEAN;
BEGIN
  -- Получаем план пользователя из активной подписки
  SELECT plan INTO v_user_plan
  FROM user_subscriptions
  WHERE telegram_id = p_telegram_id
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  -- Если нет активной подписки — free
  IF v_user_plan IS NULL THEN
    v_user_plan := 'free';
  END IF;

  -- Получаем минимальный план для функции
  SELECT min_plan INTO v_feature_min_plan
  FROM subscription_features
  WHERE id = p_feature_id;

  IF v_feature_min_plan IS NULL THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'error', 'Feature not found',
      'feature_id', p_feature_id
    );
  END IF;

  -- Уровни планов: free=0, pro=1, elite/business=2
  v_plan_level := CASE v_user_plan
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'elite' THEN 2
    WHEN 'elite' THEN 2
    ELSE 0
  END;

  v_required_level := CASE v_feature_min_plan
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'elite' THEN 2
    ELSE 1
  END;

  v_has_access := v_plan_level >= v_required_level;

  RETURN jsonb_build_object(
    'has_access', v_has_access,
    'user_plan', v_user_plan,
    'required_plan', v_feature_min_plan,
    'feature_id', p_feature_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 4. ФУНКЦИЯ: Получить все доступные функции пользователя
-- ===========================================
CREATE OR REPLACE FUNCTION get_user_features(p_telegram_id BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_user_plan TEXT;
  v_plan_level INTEGER;
  v_features JSONB;
BEGIN
  -- Получаем план пользователя
  SELECT plan INTO v_user_plan
  FROM user_subscriptions
  WHERE telegram_id = p_telegram_id
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_user_plan IS NULL THEN
    v_user_plan := 'free';
  END IF;

  v_plan_level := CASE v_user_plan
    WHEN 'free' THEN 0
    WHEN 'pro' THEN 1
    WHEN 'elite' THEN 2
    WHEN 'elite' THEN 2
    ELSE 0
  END;

  -- Собираем все функции с флагом доступа
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', sf.id,
      'name', sf.name,
      'description', sf.description,
      'min_plan', sf.min_plan,
      'has_access', CASE
        WHEN sf.min_plan = 'free' THEN true
        WHEN sf.min_plan = 'pro' AND v_plan_level >= 1 THEN true
        WHEN sf.min_plan = 'elite' AND v_plan_level >= 2 THEN true
        ELSE false
      END
    )
  ) INTO v_features
  FROM subscription_features sf;

  RETURN jsonb_build_object(
    'user_plan', v_user_plan,
    'plan_level', v_plan_level,
    'features', COALESCE(v_features, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. ФУНКЦИЯ: Получить скидку на стили
-- ===========================================
CREATE OR REPLACE FUNCTION get_style_discount(p_telegram_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_access JSONB;
BEGIN
  -- Проверяем доступ к скидке
  SELECT check_feature_access(p_telegram_id, 'style_discount') INTO v_access;

  IF (v_access->>'has_access')::boolean THEN
    RETURN 30; -- 30% скидка для PRO/ELITE
  ELSE
    RETURN 0; -- Без скидки
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 6. ФУНКЦИЯ: Купить стиль со скидкой
-- ===========================================
CREATE OR REPLACE FUNCTION purchase_style_with_discount(
  p_telegram_id BIGINT,
  p_style_id TEXT,
  p_base_price INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_discount INTEGER;
  v_final_price INTEGER;
  v_result JSONB;
BEGIN
  -- Получаем скидку
  v_discount := get_style_discount(p_telegram_id);

  -- Вычисляем финальную цену
  v_final_price := p_base_price - (p_base_price * v_discount / 100);

  -- Покупаем стиль
  SELECT purchase_style(p_telegram_id, p_style_id, v_final_price) INTO v_result;

  -- Добавляем информацию о скидке
  RETURN v_result || jsonb_build_object(
    'base_price', p_base_price,
    'discount_percent', v_discount,
    'final_price', v_final_price
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. ФУНКЦИЯ: Получить количество доступных стилей
-- ===========================================
CREATE OR REPLACE FUNCTION get_available_styles_count(p_telegram_id BIGINT)
RETURNS INTEGER AS $$
DECLARE
  v_user_plan TEXT;
BEGIN
  SELECT plan INTO v_user_plan
  FROM user_subscriptions
  WHERE telegram_id = p_telegram_id
    AND status = 'active'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_user_plan IS NULL THEN
    v_user_plan := 'free';
  END IF;

  RETURN CASE v_user_plan
    WHEN 'free' THEN 5
    WHEN 'pro' THEN 7
    WHEN 'elite' THEN 10
    WHEN 'elite' THEN 10
    ELSE 5
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 8. КОММЕНТАРИИ
-- ===========================================
COMMENT ON FUNCTION check_feature_access IS 'Проверяет доступ пользователя к функции по подписке';
COMMENT ON FUNCTION get_user_features IS 'Возвращает все функции с флагом доступа для пользователя';
COMMENT ON FUNCTION get_style_discount IS 'Возвращает скидку на стили (30% для PRO/ELITE, 0 для FREE)';
COMMENT ON FUNCTION get_available_styles_count IS 'Возвращает количество доступных стилей: FREE=5, PRO=7, ELITE=10';
