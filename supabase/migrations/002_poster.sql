-- ===========================================
-- Миграция: 002_poster.sql
-- Описание: Таблицы для НЕЙРОПОСТЕР
-- Автор: АНЯ
-- ===========================================

-- ===========================================
-- ТАБЛИЦА: instagram_accounts
-- ===========================================
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

-- Индексы
CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);

-- RLS
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own instagram accounts" ON instagram_accounts
  FOR ALL USING (user_id = auth.uid());

-- Триггер updated_at
CREATE TRIGGER update_instagram_accounts_updated_at
  BEFORE UPDATE ON instagram_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- ТАБЛИЦА: scheduled_posts
-- ===========================================
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
  agent_generation_id UUID,
  xp_rewarded BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at) 
  WHERE status = 'scheduled';

-- RLS
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own posts" ON scheduled_posts
  FOR ALL USING (user_id = auth.uid());

-- Триггер updated_at
CREATE TRIGGER update_scheduled_posts_updated_at
  BEFORE UPDATE ON scheduled_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- ТАБЛИЦА: post_media
-- ===========================================
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

-- Индексы
CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);

-- RLS (через связь с постом)
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own media" ON post_media
  FOR ALL USING (
    post_id IN (SELECT id FROM scheduled_posts WHERE user_id = auth.uid())
  );

-- ===========================================
-- ТАБЛИЦА: publish_logs
-- ===========================================
CREATE TABLE IF NOT EXISTS publish_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES scheduled_posts(id) ON DELETE CASCADE,
  action TEXT CHECK (action IN ('attempt', 'success', 'error')),
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_publish_logs_post_id ON publish_logs(post_id);

-- RLS
ALTER TABLE publish_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs" ON publish_logs
  FOR SELECT USING (
    post_id IN (SELECT id FROM scheduled_posts WHERE user_id = auth.uid())
  );
