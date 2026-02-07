-- ===========================================
-- Миграция: 062_pending_referrals.sql
-- Описание: Таблица для хранения реферального кода
-- между моментом /start в боте и открытием мини-аппа
-- ===========================================

CREATE TABLE IF NOT EXISTS pending_referrals (
  telegram_id BIGINT PRIMARY KEY,
  referral_code VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Без RLS — используется только через SECURITY DEFINER функции и Edge Functions с service role
ALTER TABLE pending_referrals ENABLE ROW LEVEL SECURITY;
