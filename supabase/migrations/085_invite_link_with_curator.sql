-- Добавляем флаг "с куратором" к ссылкам приглашения
ALTER TABLE school_invite_links ADD COLUMN IF NOT EXISTS with_curator BOOLEAN DEFAULT false;
-- Дни куратора (если отличается от стандарта тарифа)
ALTER TABLE school_invite_links ADD COLUMN IF NOT EXISTS curator_days INTEGER;
