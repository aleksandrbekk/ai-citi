-- 084_curator_assignments.sql
-- Привязка куратора к ученику через user_tariffs

ALTER TABLE user_tariffs ADD COLUMN IF NOT EXISTS curator_id UUID REFERENCES users(id);
ALTER TABLE user_tariffs ADD COLUMN IF NOT EXISTS curator_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_tariffs_curator_id
ON user_tariffs(curator_id) WHERE curator_id IS NOT NULL;
