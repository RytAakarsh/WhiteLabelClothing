-- =============================================================
-- MIGRATION: Direct UPI Payment Gateway & Manual Bank Verification
-- Target: White Label Clothing (qtvzxezxyzsvgbauyytt)
-- Launch Date: 2026-11-01
-- =============================================================

-- 1. Create payment_settings table for dynamic admin configuration
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway_name TEXT UNIQUE NOT NULL DEFAULT 'direct_upi',
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    receiving_upi_id TEXT NOT NULL DEFAULT 'moinusman0302@oksbi',
    payee_name TEXT NOT NULL DEFAULT 'MOHAMMED MOIN',
    payment_instructions TEXT NOT NULL DEFAULT 'Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM). After payment, enter your 12-digit Bank UTR / Reference number below to verify your order.',
    allow_customer_utr BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by TEXT
);

-- Seed default direct_upi configuration
INSERT INTO public.payment_settings (
    gateway_name,
    is_enabled,
    receiving_upi_id,
    payee_name,
    payment_instructions,
    allow_customer_utr
) VALUES (
    'direct_upi',
    true,
    'moinusman0302@oksbi',
    'MOHAMMED MOIN',
    'Scan the dynamic QR code with any UPI app (GPay, PhonePe, Paytm, BHIM). After transferring, enter your 12-digit Bank UTR / Reference number below to verify your order.',
    true
)
ON CONFLICT (gateway_name) DO UPDATE SET
    receiving_upi_id = EXCLUDED.receiving_upi_id,
    payee_name = EXCLUDED.payee_name;

-- 2. Enhance public.orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS verified_by TEXT;

-- Prevent duplicate UTR on confirmed/paid orders
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paid_utr_unique 
ON public.orders(payment_reference) 
WHERE payment_status = 'paid' AND payment_reference IS NOT NULL;

-- 3. Enhance public.payment_attempts table
ALTER TABLE public.payment_attempts
ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
ADD COLUMN IF NOT EXISTS customer_utr TEXT,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by TEXT;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_customer_utr ON public.payment_attempts(customer_utr);
CREATE INDEX IF NOT EXISTS idx_payment_attempts_transaction_ref ON public.payment_attempts(transaction_reference);

-- 4. Enable RLS on payment_settings
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view payment settings" ON public.payment_settings;
CREATE POLICY "Public can view payment settings"
ON public.payment_settings
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage payment settings" ON public.payment_settings;
CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings
FOR ALL
USING (public.is_admin());

-- 5. Atomic RPC: Admin Verifies Direct UPI Payment
CREATE OR REPLACE FUNCTION public.verify_direct_upi_payment(
    p_order_id UUID,
    p_admin_identifier TEXT,
    p_verified_utr TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_clean_utr TEXT;
    v_duplicate_order RECORD;
BEGIN
    v_clean_utr := TRIM(p_verified_utr);

    IF v_clean_utr IS NULL OR LENGTH(v_clean_utr) < 6 THEN
        RAISE EXCEPTION 'A valid bank UTR / reference number is required (minimum 6 characters).';
    END IF;

    -- Lock and inspect the target order
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order was already verified and marked paid.',
            'order_id', v_order.id,
            'order_number', v_order.order_number
        );
    END IF;

    -- Check for duplicate UTR usage across other paid orders
    SELECT id, order_number INTO v_duplicate_order
    FROM public.orders
    WHERE payment_reference = v_clean_utr
      AND payment_status = 'paid'
      AND id <> p_order_id
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'UTR % has already been used and verified for order %', v_clean_utr, v_duplicate_order.order_number;
    END IF;

    -- Update order to confirmed and paid
    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        settlement_status = 'reconciled',
        payment_reference = v_clean_utr,
        payment_verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_identifier,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Update payment attempts
    UPDATE public.payment_attempts
    SET status = 'completed',
        customer_utr = v_clean_utr,
        verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_identifier,
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- Update payments row
    UPDATE public.payments
    SET status = 'completed',
        provider_reference = v_clean_utr,
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- Record status history
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        note
    ) VALUES (
        p_order_id,
        v_order.status,
        'confirmed',
        p_admin_identifier,
        'Direct UPI payment verified in SBI account. UTR: ' || v_clean_utr
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'payment_status', 'paid',
        'utr', v_clean_utr
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Atomic RPC: Admin Rejects / Cancels Direct UPI Order and Restores Stock
CREATE OR REPLACE FUNCTION public.reject_direct_upi_payment(
    p_order_id UUID,
    p_admin_identifier TEXT,
    p_reason TEXT DEFAULT 'Payment not received in bank account'
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Order already cancelled.');
    END IF;

    -- Restore inventory for each line item
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;
    END LOOP;

    -- Update order status
    UPDATE public.orders
    SET payment_status = 'failed',
        status = 'cancelled',
        settlement_status = 'rejected',
        notes = COALESCE(notes, '') || ' [REJECTED: ' || p_reason || ' by ' || p_admin_identifier || ']',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    -- Update payment attempts
    UPDATE public.payment_attempts
    SET status = 'failed',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- Record history
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        note
    ) VALUES (
        p_order_id,
        v_order.status,
        'cancelled',
        p_admin_identifier,
        'Payment rejected & order cancelled. Reason: ' || p_reason || '. Inventory restored.'
    );

    RETURN jsonb_build_object('success', true, 'order_id', v_order.id, 'status', 'cancelled');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT SELECT ON public.payment_settings TO anon, authenticated, service_role;
GRANT ALL ON public.payment_settings TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_direct_upi_payment(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_direct_upi_payment(UUID, TEXT, TEXT) TO authenticated, service_role;
