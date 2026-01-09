-- ===========================================
-- Миграция: 007_increase_postgrest_timeouts.sql
-- Описание: Увеличение statement_timeout для PostgREST ролей
-- Причина: публичные страницы квизов грузят большие base64-картинки из quiz_images,
--          при низком statement_timeout запросы гостей отменяются (500), и пользователи
--          видят "картинок нет".
-- Автор: АНЯ
-- ===========================================

-- Гости (anon) и пользователи (authenticated)
ALTER ROLE anon SET statement_timeout = '30s';
ALTER ROLE authenticated SET statement_timeout = '30s';

-- PostgREST connection pool
ALTER ROLE authenticator SET statement_timeout = '30s';

