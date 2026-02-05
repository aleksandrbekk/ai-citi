-- 058_enable_shop_styles.sql
-- Включить все активные стили в магазине с ценами

-- Включаем все активные стили в магазин
UPDATE carousel_styles
SET is_in_shop = true
WHERE is_active = true;

-- Apple Glassmorphism — бесплатный (базовый стиль)
UPDATE carousel_styles
SET is_free = true, price_neurons = 0
WHERE style_id = 'APPLE_GLASSMORPHISM';

-- Остальные стили — платные
UPDATE carousel_styles
SET is_free = false, price_neurons = 100
WHERE style_id = 'AESTHETIC_BEIGE';

UPDATE carousel_styles
SET is_free = false, price_neurons = 100
WHERE style_id = 'SOFT_PINK_EDITORIAL';

UPDATE carousel_styles
SET is_free = false, price_neurons = 100
WHERE style_id = 'MINIMALIST_LINE_ART';

UPDATE carousel_styles
SET is_free = false, price_neurons = 100
WHERE style_id = 'GRADIENT_MESH_3D';
