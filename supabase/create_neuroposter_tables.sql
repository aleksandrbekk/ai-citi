-- =============================================
-- НЕЙРОПОСТЕР: Таблицы для планировщика Instagram
-- =============================================

-- 1. Таблица Instagram аккаунтов
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_user_id VARCHAR(50) NOT NULL,
  username VARCHAR(100),
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Таблица запланированных постов
CREATE TABLE IF NOT EXISTS scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  instagram_account_id UUID REFERENCES instagram_accounts(id),
  caption TEXT,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  instagram_post_id VARCHAR(50),
  instagram_permalink VARCHAR(255),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai_ferma')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Таблица медиа файлов
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  public_url VARCHAR(500) NOT NULL,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Таблица логов публикации
CREATE TABLE IF NOT EXISTS publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('attempt', 'success', 'error')),
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RLS ПОЛИТИКИ (открытые для отладки)
-- =============================================

ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_logs ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если есть
DROP POLICY IF EXISTS "Users can manage own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can manage own posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Users can manage own media" ON post_media;
DROP POLICY IF EXISTS "Users can view own logs" ON publish_logs;
DROP POLICY IF EXISTS "Allow all for instagram_accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Allow all for scheduled_posts" ON scheduled_posts;
DROP POLICY IF EXISTS "Allow all for post_media" ON post_media;
DROP POLICY IF EXISTS "Allow all for publish_logs" ON publish_logs;

-- Политики для instagram_accounts
CREATE POLICY "Allow all for instagram_accounts" ON instagram_accounts
  FOR ALL USING (true) WITH CHECK (true);

-- Политики для scheduled_posts
CREATE POLICY "Allow all for scheduled_posts" ON scheduled_posts
  FOR ALL USING (true) WITH CHECK (true);

-- Политики для post_media
CREATE POLICY "Allow all for post_media" ON post_media
  FOR ALL USING (true) WITH CHECK (true);

-- Политики для publish_logs
CREATE POLICY "Allow all for publish_logs" ON publish_logs
  FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- ИНДЕКСЫ для быстрого поиска
-- =============================================

CREATE INDEX IF NOT EXISTS idx_posts_user_status ON scheduled_posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON scheduled_posts(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_media_post ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_logs_post ON publish_logs(post_id);

-- =============================================
-- ПРОВЕРКА
-- =============================================

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('instagram_accounts', 'scheduled_posts', 'post_media', 'publish_logs');











