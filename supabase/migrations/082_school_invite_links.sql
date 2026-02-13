-- Ссылки приглашения для школы
CREATE TABLE IF NOT EXISTS school_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  tariff_slug VARCHAR(20) NOT NULL,
  days_access INTEGER,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE school_invite_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school_invite_links_all" ON school_invite_links FOR ALL USING (true) WITH CHECK (true);
