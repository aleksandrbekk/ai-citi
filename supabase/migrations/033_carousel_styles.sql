-- 033_carousel_styles.sql
-- Таблица для хранения стилей каруселей (редактируемых через админку)

-- Основная таблица стилей
CREATE TABLE IF NOT EXISTS carousel_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Идентификатор стиля (уникальный, используется в коде)
  style_id TEXT NOT NULL UNIQUE,

  -- Мета-информация для UI
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '🎨',
  audience TEXT DEFAULT 'universal' CHECK (audience IN ('universal', 'female', 'male')),
  preview_color TEXT DEFAULT '#FF5A1F',
  preview_image TEXT, -- URL главного превью

  -- Активность
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  -- Полный конфиг стиля (JSON) - отправляется в n8n
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Примеры изображений (массив URL)
  example_images TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by BIGINT, -- telegram_id админа
  updated_by BIGINT  -- telegram_id админа
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_carousel_styles_style_id ON carousel_styles(style_id);
CREATE INDEX IF NOT EXISTS idx_carousel_styles_is_active ON carousel_styles(is_active);
CREATE INDEX IF NOT EXISTS idx_carousel_styles_sort_order ON carousel_styles(sort_order);

-- RLS
ALTER TABLE carousel_styles ENABLE ROW LEVEL SECURITY;

-- Все могут читать активные стили
CREATE POLICY "Anyone can read active styles" ON carousel_styles
  FOR SELECT USING (is_active = true);

-- Анонимные пользователи тоже могут читать (для фронтенда)
CREATE POLICY "Anon can read active styles" ON carousel_styles
  FOR SELECT TO anon USING (is_active = true);

-- Вставка/обновление/удаление - через service role (админка)
CREATE POLICY "Service role full access" ON carousel_styles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_carousel_styles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_carousel_styles_timestamp
  BEFORE UPDATE ON carousel_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_carousel_styles_updated_at();

-- Комментарии
COMMENT ON TABLE carousel_styles IS 'Стили каруселей, редактируемые через админку';
COMMENT ON COLUMN carousel_styles.style_id IS 'Уникальный идентификатор стиля (APPLE_GLASSMORPHISM и т.д.)';
COMMENT ON COLUMN carousel_styles.config IS 'Полный JSON конфиг стиля: colors, typography, cards, person, decorations, prompt_blocks, slide_templates';
COMMENT ON COLUMN carousel_styles.example_images IS 'Массив URL примеров слайдов для превью';
