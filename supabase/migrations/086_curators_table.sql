-- 086_curators_table.sql
-- Добавляем Татьяну Морозову (telegram_id 616788625) как куратора

-- Добавляем куратора
INSERT INTO curators (user_id)
SELECT id FROM users WHERE telegram_id = 616788625
ON CONFLICT (user_id) DO UPDATE SET is_active = true;
