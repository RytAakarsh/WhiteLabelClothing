-- =============================================================
-- MIGRATION: YouPI PG UPI Payment Gateway Integration Schema
-- Target: White Label Clothing (qtvzxezxyzsvgbauyytt)
-- =============================================================

-- 1. Extend public.orders table with payment gateway & reconciliation fields
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'cod',
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_gateway_payment_id ON public.orders(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);
CREATE INDEX IF NOT EXISTS idx_orders_settlement_status ON public.orders(settlement_status);

-- 2. Create public.payment_attempts table
CREATE TABLE IF NOT EXISTS public.payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL DEFAULT 'youpi',
    gateway_payment_id TEXT,
    amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'pending',
    checkout_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id ON public.payment_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_gateway_payment_id ON public.payment_attempts(gateway_payment_id);

-- 3. Create public.webhook_events table for idempotency and audit trail
CREATE TABLE IF NOT EXISTS public.webhook_events (
    delivery_id TEXT PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    gateway_payment_id TEXT,
    event_type TEXT NOT NULL,
    signature_verified BOOLEAN NOT NULL DEFAULT false,
    settlement_state TEXT,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON public.webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_gateway_payment_id ON public.webhook_events(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON public.webhook_events(event_type);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- 5. Policies for payment_attempts
DROP POLICY IF EXISTS "Users can view their own payment attempts" ON public.payment_attempts;
CREATE POLICY "Users can view their own payment attempts"
ON public.payment_attempts
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = payment_attempts.order_id
          AND orders.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admins have full access to payment attempts" ON public.payment_attempts;
CREATE POLICY "Admins have full access to payment attempts"
ON public.payment_attempts
FOR ALL
USING (public.is_admin());

-- 6. Policies for webhook_events (admin & service_role only)
DROP POLICY IF EXISTS "Admins have full access to webhook events" ON public.webhook_events;
CREATE POLICY "Admins have full access to webhook events"
ON public.webhook_events
FOR ALL
USING (public.is_admin());

-- 7. Grant table access to roles
GRANT SELECT, INSERT, UPDATE ON public.payment_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_events TO service_role;
