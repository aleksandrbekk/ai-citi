-- ===========================================
-- Migration: 080_lesson_unlocks.sql
-- Description: Manual lesson unlock overrides by admin
-- ===========================================

CREATE TABLE IF NOT EXISTS lesson_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_unlocks_user ON lesson_unlocks(user_id);

ALTER TABLE lesson_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_unlocks_all" ON lesson_unlocks
  FOR ALL USING (true) WITH CHECK (true);
