-- ===========================================
-- Миграция: 008_quiz_image_rows_unique.sql
-- Описание: Уникальный индекс для quiz_image_rows (нужен для upsert по quiz_id,row_index)
-- ===========================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_image_rows_quiz_row
  ON public.quiz_image_rows (quiz_id, row_index);

