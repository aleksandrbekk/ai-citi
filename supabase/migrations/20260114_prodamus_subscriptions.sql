-- Migration: Prodamus Subscriptions
-- Created: 2026-01-13
-- Description: Tables for storing user subscriptions and payment history from Prodamus

-- ============================================================================
-- Таблица подписок пользователей
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Данные Prodamus
    prodamus_subscription_id TEXT, -- ID подписки в Prodamus (из webhook)
    prodamus_order_id TEXT,        -- ID заказа
    subscription_type TEXT NOT NULL DEFAULT 'basic', -- Тип подписки (basic, premium, pro)
    subscription_name TEXT,        -- Название подписки из Prodamus
    
    -- Статус
    status TEXT NOT NULL DEFAULT 'pending', -- pending, active, cancelled, expired, failed
    is_active BOOLEAN DEFAULT false,
    
    -- Финансы
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'RUB',
    
    -- Данные клиента
    customer_phone TEXT,
    customer_email TEXT,
    telegram_user_id BIGINT, -- Telegram ID для уведомлений
    
    -- Даты
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    next_payment_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Счетчики
    total_payments INTEGER DEFAULT 0,
    max_payments INTEGER, -- NULL = безлимит
    current_attempt INTEGER DEFAULT 0, -- Попытка списания
    
    -- Метаданные
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Таблица платежей (история)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Данные платежа из Prodamus
    prodamus_order_id TEXT NOT NULL,
    prodamus_domain TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'RUB',
    
    -- Тип платежа
    payment_type TEXT NOT NULL, -- 'initial', 'autopayment', 'manual'
    attempt INTEGER DEFAULT 1,
    payment_num INTEGER, -- Номер платежа по подписке
    
    -- Комиссия Prodamus
    commission_percent DECIMAL(5, 2),
    commission_sum DECIMAL(10, 2),
    discount_value DECIMAL(10, 2),
    
    -- Статус
    status TEXT NOT NULL DEFAULT 'success', -- success, failed, pending
    error_code TEXT,
    error_message TEXT,
    
    -- Сырые данные webhook для отладки
    raw_payload JSONB,
    
    -- Даты
    payment_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Таблица для хранения платежных ссылок (опционально)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscription_payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Данные ссылки
    payment_link TEXT NOT NULL,
    subscription_type TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    
    -- Параметры запроса
    prodamus_subscription_id INTEGER, -- ID подписки в Prodamus
    customer_phone TEXT,
    customer_email TEXT,
    
    -- Статус
    status TEXT DEFAULT 'created', -- created, used, expired
    expires_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RLS политики
-- ============================================================================
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payment_links ENABLE ROW LEVEL SECURITY;

-- Пользователи могут видеть только свои подписки
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (user_id = auth.uid());

-- Сервисная роль может управлять всеми подписками (для webhook)
CREATE POLICY "Service role can manage all subscriptions" ON user_subscriptions
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- Пользователи могут видеть только свои платежи
CREATE POLICY "Users can view own payments" ON subscription_payments
    FOR SELECT USING (user_id = auth.uid());

-- Сервисная роль может управлять всеми платежами
CREATE POLICY "Service role can manage all payments" ON subscription_payments
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- Пользователи могут видеть свои платежные ссылки
CREATE POLICY "Users can view own payment links" ON subscription_payment_links
    FOR SELECT USING (user_id = auth.uid());

-- Сервисная роль может управлять ссылками
CREATE POLICY "Service role can manage payment links" ON subscription_payment_links
    FOR ALL 
    TO service_role
    USING (true) 
    WITH CHECK (true);

-- ============================================================================
-- Индексы для оптимизации
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_prodamus_id ON user_subscriptions(prodamus_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_telegram ON user_subscriptions(telegram_user_id);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_order ON subscription_payments(prodamus_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_user ON subscription_payment_links(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON subscription_payment_links(status);

-- ============================================================================
-- Триггер для автообновления updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Комментарии к таблицам
-- ============================================================================
COMMENT ON TABLE user_subscriptions IS 'Подписки пользователей через Prodamus';
COMMENT ON TABLE subscription_payments IS 'История платежей по подпискам';
COMMENT ON TABLE subscription_payment_links IS 'Созданные платежные ссылки';

COMMENT ON COLUMN user_subscriptions.status IS 'Статус: pending, active, cancelled, expired, failed';
COMMENT ON COLUMN subscription_payments.payment_type IS 'Тип: initial (первый), autopayment (авто), manual (ручной)';
