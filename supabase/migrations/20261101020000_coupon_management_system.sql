-- ============================================================================
-- MIGRATION: Complete Coupon Management System
-- Target: White Label Clothing (qtvzxezxyzsvgbauyytt)
-- Date: 2026-11-01
-- ============================================================================

-- 1. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  max_discount_paise BIGINT,
  minimum_order_paise BIGINT NOT NULL DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ,
  applicable_products UUID[] DEFAULT '{}'::uuid[],
  applicable_categories UUID[] DEFAULT '{}'::uuid[],
  first_order_only BOOLEAN NOT NULL DEFAULT false,
  free_shipping BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active, is_deleted);

-- 2. Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  discount_paise BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'redeemed', 'cancelled')),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_coupon_order UNIQUE (coupon_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_customer ON public.coupon_redemptions(customer_id, coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_order ON public.coupon_redemptions(order_id);

-- 3. Add coupon columns to public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- 4. Enable RLS on coupons and coupon_redemptions
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
ON public.coupons FOR SELECT
USING (is_active = true AND is_deleted = false);

DROP POLICY IF EXISTS "Admins can manage coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can manage coupon redemptions"
ON public.coupon_redemptions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions"
ON public.coupon_redemptions FOR SELECT
USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can insert own coupon redemptions"
ON public.coupon_redemptions FOR INSERT
WITH CHECK (customer_id = auth.uid() OR auth.uid() IS NULL);

-- 5. RPC: validate_coupon_rpc
CREATE OR REPLACE FUNCTION public.validate_coupon_rpc(
    p_code TEXT,
    p_subtotal BIGINT,
    p_user_id UUID DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_code TEXT;
    v_coupon RECORD;
    v_customer_usage INT := 0;
    v_discount_paise BIGINT := 0;
    v_prior_orders INT := 0;
BEGIN
    v_clean_code := UPPER(TRIM(p_code));

    IF v_clean_code IS NULL OR v_clean_code = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INVALID_CODE',
            'message', 'Please enter a valid coupon code.'
        );
    END IF;

    SELECT * INTO v_coupon
    FROM public.coupons
    WHERE UPPER(code) = v_clean_code
      AND is_deleted = false
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_FOUND',
            'message', 'Invalid coupon code. Please verify and try again.'
        );
    END IF;

    IF NOT v_coupon.is_active THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INACTIVE',
            'message', 'This coupon is currently inactive.'
        );
    END IF;

    IF v_coupon.starts_at > now() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'NOT_STARTED',
            'message', 'This promotion has not started yet.'
        );
    END IF;

    IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'EXPIRED',
            'message', 'This coupon code has expired.'
        );
    END IF;

    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'USAGE_LIMIT_REACHED',
            'message', 'This coupon code has reached its maximum total redemption limit.'
        );
    END IF;

    IF p_subtotal < v_coupon.minimum_order_paise THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'MIN_ORDER_NOT_MET',
            'message', 'Cart subtotal must be at least ₹' || (v_coupon.minimum_order_paise / 100)::text || ' to use this coupon.'
        );
    END IF;

    -- Per-customer limit check
    IF p_user_id IS NOT NULL AND v_coupon.per_customer_limit IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_usage
        FROM public.coupon_redemptions
        WHERE coupon_id = v_coupon.id
          AND customer_id = p_user_id
          AND status IN ('reserved', 'redeemed');

        IF v_customer_usage >= v_coupon.per_customer_limit THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'CUSTOMER_LIMIT_REACHED',
                'message', 'You have already redeemed this coupon the maximum allowed times.'
            );
        END IF;
    END IF;

    -- First order only check
    IF v_coupon.first_order_only AND p_user_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_prior_orders
        FROM public.orders
        WHERE user_id = p_user_id
          AND payment_status = 'paid';

        IF v_prior_orders > 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'code', 'FIRST_ORDER_ONLY',
                'message', 'This coupon is exclusively valid on your first order.'
            );
        END IF;
    END IF;

    -- Calculate discount
    IF v_coupon.discount_type = 'percentage' THEN
        v_discount_paise := (p_subtotal * v_coupon.discount_value::bigint) / 100;
        IF v_coupon.max_discount_paise IS NOT NULL AND v_discount_paise > v_coupon.max_discount_paise THEN
            v_discount_paise := v_coupon.max_discount_paise;
        END IF;
    ELSIF v_coupon.discount_type = 'fixed' THEN
        v_discount_paise := LEAST(p_subtotal, (v_coupon.discount_value * 100)::bigint);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'valid', true,
        'coupon_id', v_coupon.id,
        'code', v_coupon.code,
        'description', v_coupon.description,
        'discount_type', v_coupon.discount_type,
        'discount_value', v_coupon.discount_value,
        'discount_paise', v_discount_paise,
        'max_discount_paise', v_coupon.max_discount_paise,
        'minimum_order_paise', v_coupon.minimum_order_paise,
        'free_shipping', v_coupon.free_shipping,
        'message', 'Coupon ' || v_coupon.code || ' applied successfully!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon_rpc(TEXT, BIGINT, UUID, JSONB) TO authenticated, anon, service_role;

DROP FUNCTION IF EXISTS public.create_direct_upi_order(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT);

-- 6. Updated create_direct_upi_order with Coupon Support
CREATE OR REPLACE FUNCTION public.create_direct_upi_order(
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_shipping_address JSONB,
    p_items JSONB, -- Array of { variant_id: UUID, quantity: INT }
    p_delivery_charge BIGINT,
    p_notes TEXT,
    p_order_number TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_existing_order RECORD;
    v_subtotal BIGINT := 0;
    v_discount_total BIGINT := 0;
    v_coupon_discount BIGINT := 0;
    v_final_delivery_charge BIGINT;
    v_total_amount BIGINT := 0;
    v_item RECORD;
    v_variant RECORD;
    v_product RECORD;
    v_offer RECORD;
    v_line_price BIGINT;
    v_line_discount BIGINT;
    v_line_total BIGINT;
    v_coupon RECORD;
    v_customer_usage INT;
    v_prior_orders INT;
    v_clean_coupon TEXT;
BEGIN
    v_final_delivery_charge := p_delivery_charge;

    -- Idempotency check: if order with this idempotency_key already exists, retrieve and return it safely
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT * INTO v_existing_order 
        FROM public.orders 
        WHERE idempotency_key = TRIM(p_idempotency_key);

        IF FOUND THEN
            IF NOT EXISTS (SELECT 1 FROM public.payment_attempts WHERE order_id = v_existing_order.id) THEN
                INSERT INTO public.payment_attempts (
                    order_id, gateway, amount_paise, currency, status, transaction_reference, metadata
                ) VALUES (
                    v_existing_order.id, 'direct_upi', v_existing_order.total_amount, 'INR',
                    v_existing_order.payment_status, v_existing_order.order_number,
                    jsonb_build_object('idempotent_retry', true)
                );
            END IF;

            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order.id,
                'order_number', v_existing_order.order_number,
                'total_amount', v_existing_order.total_amount,
                'subtotal', v_existing_order.subtotal,
                'delivery_charge', v_existing_order.delivery_charge,
                'discount_total', v_existing_order.discount_total,
                'status', v_existing_order.status,
                'payment_status', v_existing_order.payment_status,
                'payment_gateway', v_existing_order.payment_gateway,
                'already_existed', true
            );
        END IF;
    END IF;

    -- 1. Create order record placeholder
    INSERT INTO public.orders (
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        status,
        payment_status,
        payment_gateway,
        settlement_status,
        subtotal,
        discount_total,
        delivery_charge,
        total_amount,
        shipping_address_snapshot,
        notes,
        idempotency_key
    ) VALUES (
        p_order_number,
        p_user_id,
        TRIM(p_customer_name),
        TRIM(p_customer_email),
        TRIM(p_customer_phone),
        'pending',
        'awaiting_payment',
        'direct_upi',
        'pending',
        0,
        0,
        v_final_delivery_charge,
        0,
        p_shipping_address,
        p_notes,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- 2. Process each item, validate & lock variant row
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (variant_id UUID, quantity INT)
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.';
        END IF;

        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_item.variant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Garment variant % not found.', v_item.variant_id;
        END IF;

        IF v_variant.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for size % (available: %, requested: %).',
                v_variant.size, v_variant.stock_quantity, v_item.quantity;
        END IF;

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id;

        IF v_product.status <> 'published' THEN
            RAISE EXCEPTION 'Product "%" is currently unavailable.', v_product.name;
        END IF;

        v_line_price := v_product.base_price + v_variant.price_adjustment;
        v_line_discount := 0;

        SELECT o.* INTO v_offer
        FROM public.offers o
        JOIN public.offer_products op ON op.offer_id = o.id
        WHERE op.product_id = v_product.id
          AND o.is_active = true
          AND (o.starts_at IS NULL OR o.starts_at <= now())
          AND (o.ends_at IS NULL OR o.ends_at >= now())
        LIMIT 1;

        IF FOUND THEN
            IF v_offer.discount_type = 'percentage' THEN
                v_line_discount := (v_line_price * v_offer.discount_value) / 100;
            ELSIF v_offer.discount_type = 'fixed' THEN
                v_line_discount := LEAST(v_line_price, v_offer.discount_value);
            END IF;
        END IF;

        v_line_total := (v_line_price - v_line_discount) * v_item.quantity;
        v_subtotal := v_subtotal + (v_line_price * v_item.quantity);
        v_discount_total := v_discount_total + (v_line_discount * v_item.quantity);

        INSERT INTO public.order_items (
            order_id,
            product_id,
            variant_id,
            product_name_snapshot,
            sku_snapshot,
            size_snapshot,
            unit_price_snapshot,
            discount_snapshot,
            quantity,
            line_total
        ) VALUES (
            v_order_id,
            v_product.id,
            v_variant.id,
            v_product.name,
            v_variant.sku,
            v_variant.size,
            v_line_price,
            v_line_discount,
            v_item.quantity,
            v_line_total
        );
    END LOOP;

    -- 3. Server-side coupon application
    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
        v_clean_coupon := UPPER(TRIM(p_coupon_code));

        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE UPPER(code) = v_clean_coupon
          AND is_deleted = false
        FOR UPDATE;

        IF NOT FOUND OR NOT v_coupon.is_active THEN
            RAISE EXCEPTION 'Coupon code % is invalid or inactive.', v_clean_coupon;
        END IF;

        IF v_coupon.starts_at > now() THEN
            RAISE EXCEPTION 'Coupon % is not active yet.', v_clean_coupon;
        END IF;

        IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
            RAISE EXCEPTION 'Coupon % has expired.', v_clean_coupon;
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Coupon % has reached its usage limit.', v_clean_coupon;
        END IF;

        IF v_subtotal < v_coupon.minimum_order_paise THEN
            RAISE EXCEPTION 'Minimum order amount of ₹% required for coupon %.',
                (v_coupon.minimum_order_paise / 100)::text, v_clean_coupon;
        END IF;

        IF p_user_id IS NOT NULL AND v_coupon.per_customer_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_customer_usage
            FROM public.coupon_redemptions
            WHERE coupon_id = v_coupon.id
              AND customer_id = p_user_id
              AND status IN ('reserved', 'redeemed');

            IF v_customer_usage >= v_coupon.per_customer_limit THEN
                RAISE EXCEPTION 'You have already redeemed coupon % the maximum allowed times.', v_clean_coupon;
            END IF;
        END IF;

        IF v_coupon.first_order_only AND p_user_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_prior_orders
            FROM public.orders
            WHERE user_id = p_user_id AND payment_status = 'paid';

            IF v_prior_orders > 0 THEN
                RAISE EXCEPTION 'Coupon % is only valid on your first order.', v_clean_coupon;
            END IF;
        END IF;

        IF v_coupon.discount_type = 'percentage' THEN
            v_coupon_discount := (v_subtotal * v_coupon.discount_value::bigint) / 100;
            IF v_coupon.max_discount_paise IS NOT NULL AND v_coupon_discount > v_coupon.max_discount_paise THEN
                v_coupon_discount := v_coupon.max_discount_paise;
            END IF;
        ELSIF v_coupon.discount_type = 'fixed' THEN
            v_coupon_discount := LEAST(v_subtotal, (v_coupon.discount_value * 100)::bigint);
        END IF;

        IF v_coupon.free_shipping THEN
            v_final_delivery_charge := 0;
        END IF;

        v_discount_total := v_discount_total + v_coupon_discount;

        -- Record coupon on order
        UPDATE public.orders
        SET coupon_code = v_coupon.code,
            coupon_id = v_coupon.id
        WHERE id = v_order_id;

        -- Record reserved coupon redemption
        INSERT INTO public.coupon_redemptions (
            coupon_id, order_id, customer_id, discount_paise, status
        ) VALUES (
            v_coupon.id, v_order_id, p_user_id, v_coupon_discount, 'reserved'
        );
    END IF;

    -- 4. Calculate final total amount
    v_total_amount := (v_subtotal - v_discount_total) + v_final_delivery_charge;

    -- 5. Update order with actual totals
    UPDATE public.orders
    SET subtotal = v_subtotal,
        discount_total = v_discount_total,
        delivery_charge = v_final_delivery_charge,
        total_amount = v_total_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order_id;

    -- 6. Record status history
    INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, note
    ) VALUES (
        v_order_id, NULL, 'pending', p_customer_name, 'Direct UPI checkout initiated'
    );

    -- 7. Insert payment record
    INSERT INTO public.payments (
        order_id, provider, amount, status
    ) VALUES (
        v_order_id, 'direct_upi', v_total_amount, 'pending'
    );

    -- 8. Insert payment attempt
    INSERT INTO public.payment_attempts (
        order_id, gateway, amount_paise, currency, status, transaction_reference, metadata
    ) VALUES (
        v_order_id, 'direct_upi', v_total_amount, 'INR', 'awaiting_payment', p_order_number,
        jsonb_build_object(
            'delivery_charge', v_final_delivery_charge,
            'coupon_code', p_coupon_code,
            'coupon_discount', v_coupon_discount,
            'order_number', p_order_number
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', p_order_number,
        'total_amount', v_total_amount,
        'subtotal', v_subtotal,
        'delivery_charge', v_final_delivery_charge,
        'discount_total', v_discount_total,
        'coupon_discount', v_coupon_discount,
        'coupon_code', p_coupon_code,
        'status', 'pending',
        'payment_status', 'awaiting_payment',
        'payment_gateway', 'direct_upi',
        'already_existed', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_upi_order(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 7. Update verify_direct_upi_payment to finalize coupon redemption
DROP FUNCTION IF EXISTS public.verify_direct_upi_payment(UUID, TEXT, TEXT);
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
    v_redemption RECORD;
BEGIN
    v_clean_utr := TRIM(p_verified_utr);

    IF v_clean_utr IS NULL OR LENGTH(v_clean_utr) < 6 THEN
        RAISE EXCEPTION 'A valid bank UTR / reference number is required (minimum 6 characters).';
    END IF;

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

    SELECT id, order_number INTO v_duplicate_order
    FROM public.orders
    WHERE payment_reference = v_clean_utr
      AND payment_status = 'paid'
      AND id <> p_order_id
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'UTR % has already been used and verified for order %', v_clean_utr, v_duplicate_order.order_number;
    END IF;

    UPDATE public.orders
    SET payment_status = 'paid',
        status = 'confirmed',
        settlement_status = 'reconciled',
        payment_reference = v_clean_utr,
        payment_verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_identifier,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    UPDATE public.payment_attempts
    SET status = 'completed',
        customer_utr = v_clean_utr,
        verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_identifier,
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    UPDATE public.payments
    SET status = 'completed',
        provider_reference = v_clean_utr,
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- Finalize coupon redemption if order used coupon
    FOR v_redemption IN SELECT * FROM public.coupon_redemptions WHERE order_id = p_order_id AND status = 'reserved'
    LOOP
        UPDATE public.coupon_redemptions
        SET status = 'redeemed',
            redeemed_at = timezone('utc'::text, now())
        WHERE id = v_redemption.id;

        UPDATE public.coupons
        SET usage_count = usage_count + 1,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_redemption.coupon_id;
    END LOOP;

    INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, note
    ) VALUES (
        p_order_id, v_order.status, 'confirmed', p_admin_identifier,
        'Direct UPI verified against SBI statement. UTR: ' || v_clean_utr
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment verified successfully. Order confirmed.',
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'utr', v_clean_utr
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_direct_upi_payment TO authenticated, service_role;

-- 8. Update reject_direct_upi_payment to cancel coupon reservation
DROP FUNCTION IF EXISTS public.reject_direct_upi_payment(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.reject_direct_upi_payment(
    p_order_id UUID,
    p_admin_identifier TEXT,
    p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_redemption RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    UPDATE public.orders
    SET payment_status = 'failed',
        status = 'cancelled',
        settlement_status = 'rejected',
        notes = COALESCE(notes || E'\n', '') || 'Rejected by ' || p_admin_identifier || ': ' || p_reason,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_order_id;

    UPDATE public.payment_attempts
    SET status = 'failed',
        verified_at = timezone('utc'::text, now()),
        verified_by = p_admin_identifier,
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    UPDATE public.payments
    SET status = 'failed',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = p_order_id;

    -- Cancel coupon reservation
    FOR v_redemption IN SELECT * FROM public.coupon_redemptions WHERE order_id = p_order_id
    LOOP
        IF v_redemption.status = 'redeemed' THEN
            -- If already redeemed, decrement usage count
            UPDATE public.coupons
            SET usage_count = GREATEST(0, usage_count - 1),
                updated_at = timezone('utc'::text, now())
            WHERE id = v_redemption.coupon_id;
        END IF;

        UPDATE public.coupon_redemptions
        SET status = 'cancelled'
        WHERE id = v_redemption.id;
    END LOOP;

    -- Restore inventory
    FOR v_item IN SELECT variant_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
        IF v_item.variant_id IS NOT NULL THEN
            UPDATE public.product_variants
            SET stock_quantity = stock_quantity + v_item.quantity,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.variant_id;
        END IF;
    END LOOP;

    INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, note
    ) VALUES (
        p_order_id, v_order.status, 'cancelled', p_admin_identifier,
        'Payment rejected: ' || p_reason || '. Inventory restored.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment rejected. Order cancelled and inventory restored.',
        'order_id', v_order.id,
        'order_number', v_order.order_number
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.reject_direct_upi_payment TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.create_order_with_inventory(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT);

-- 9. Update create_order_with_inventory (for COD) with coupon support
CREATE OR REPLACE FUNCTION public.create_order_with_inventory(
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_shipping_address JSONB,
    p_items JSONB, -- Array of { variant_id: UUID, quantity: INT }
    p_delivery_charge BIGINT,
    p_notes TEXT,
    p_order_number TEXT,
    p_idempotency_key TEXT DEFAULT NULL,
    p_coupon_code TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
    v_subtotal BIGINT := 0;
    v_discount_total BIGINT := 0;
    v_coupon_discount BIGINT := 0;
    v_final_delivery_charge BIGINT;
    v_total_amount BIGINT := 0;
    v_item RECORD;
    v_variant RECORD;
    v_product RECORD;
    v_offer RECORD;
    v_line_price BIGINT;
    v_line_discount BIGINT;
    v_line_total BIGINT;
    v_coupon RECORD;
    v_customer_usage INT;
    v_prior_orders INT;
    v_clean_coupon TEXT;
BEGIN
    v_final_delivery_charge := p_delivery_charge;

    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_order_id 
        FROM public.orders 
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN v_order_id;
        END IF;
    END IF;

    INSERT INTO public.orders (
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        status,
        payment_status,
        subtotal,
        discount_total,
        delivery_charge,
        total_amount,
        shipping_address_snapshot,
        notes,
        idempotency_key
    ) VALUES (
        p_order_number,
        p_user_id,
        p_customer_name,
        p_customer_email,
        p_customer_phone,
        'pending',
        'pending',
        0,
        0,
        v_final_delivery_charge,
        0,
        p_shipping_address,
        p_notes,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (variant_id UUID, quantity INT)
    LOOP
        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_item.variant_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant % not found', v_item.variant_id;
        END IF;

        IF v_variant.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for variant % (available: %, requested: %)',
                v_variant.size, v_variant.stock_quantity, v_item.quantity;
        END IF;

        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;

        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id;

        IF v_product.status <> 'published' THEN
            RAISE EXCEPTION 'Product % is not published', v_product.name;
        END IF;

        v_line_price := v_product.base_price + v_variant.price_adjustment;
        v_line_discount := 0;

        SELECT o.* INTO v_offer
        FROM public.offers o
        JOIN public.offer_products op ON op.offer_id = o.id
        WHERE op.product_id = v_product.id
          AND o.is_active = true
          AND (o.starts_at IS NULL OR o.starts_at <= now())
          AND (o.ends_at IS NULL OR o.ends_at >= now())
        LIMIT 1;

        IF FOUND THEN
            IF v_offer.discount_type = 'percentage' THEN
                v_line_discount := (v_line_price * v_offer.discount_value) / 100;
            ELSIF v_offer.discount_type = 'fixed' THEN
                v_line_discount := LEAST(v_line_price, v_offer.discount_value);
            END IF;
        END IF;

        v_line_total := (v_line_price - v_line_discount) * v_item.quantity;
        v_subtotal := v_subtotal + (v_line_price * v_item.quantity);
        v_discount_total := v_discount_total + (v_line_discount * v_item.quantity);

        INSERT INTO public.order_items (
            order_id,
            product_id,
            variant_id,
            product_name_snapshot,
            sku_snapshot,
            size_snapshot,
            unit_price_snapshot,
            discount_snapshot,
            quantity,
            line_total
        ) VALUES (
            v_order_id,
            v_product.id,
            v_variant.id,
            v_product.name,
            v_variant.sku,
            v_variant.size,
            v_line_price,
            v_line_discount,
            v_item.quantity,
            v_line_total
        );
    END LOOP;

    -- Coupon validation for COD
    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
        v_clean_coupon := UPPER(TRIM(p_coupon_code));

        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE UPPER(code) = v_clean_coupon
          AND is_deleted = false
        FOR UPDATE;

        IF FOUND AND v_coupon.is_active AND (v_coupon.starts_at <= now()) AND (v_coupon.expires_at IS NULL OR v_coupon.expires_at >= now()) THEN
            IF (v_coupon.usage_limit IS NULL OR v_coupon.usage_count < v_coupon.usage_limit) AND (v_subtotal >= v_coupon.minimum_order_paise) THEN
                IF v_coupon.discount_type = 'percentage' THEN
                    v_coupon_discount := (v_subtotal * v_coupon.discount_value::bigint) / 100;
                    IF v_coupon.max_discount_paise IS NOT NULL AND v_coupon_discount > v_coupon.max_discount_paise THEN
                        v_coupon_discount := v_coupon.max_discount_paise;
                    END IF;
                ELSIF v_coupon.discount_type = 'fixed' THEN
                    v_coupon_discount := LEAST(v_subtotal, (v_coupon.discount_value * 100)::bigint);
                END IF;

                IF v_coupon.free_shipping THEN
                    v_final_delivery_charge := 0;
                END IF;

                v_discount_total := v_discount_total + v_coupon_discount;

                UPDATE public.orders
                SET coupon_code = v_coupon.code,
                    coupon_id = v_coupon.id
                WHERE id = v_order_id;

                INSERT INTO public.coupon_redemptions (
                    coupon_id, order_id, customer_id, discount_paise, status
                ) VALUES (
                    v_coupon.id, v_order_id, p_user_id, v_coupon_discount, 'redeemed'
                );

                UPDATE public.coupons
                SET usage_count = usage_count + 1,
                    updated_at = timezone('utc'::text, now())
                WHERE id = v_coupon.id;
            END IF;
        END IF;
    END IF;

    v_total_amount := (v_subtotal - v_discount_total) + v_final_delivery_charge;

    UPDATE public.orders
    SET subtotal = v_subtotal,
        discount_total = v_discount_total,
        delivery_charge = v_final_delivery_charge,
        total_amount = v_total_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order_id;

    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        note
    ) VALUES (
        v_order_id,
        NULL,
        'pending',
        p_customer_name,
        'Order placed successfully'
    );

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 10. Seed Welcome coupon if none exist
INSERT INTO public.coupons (
  code,
  description,
  discount_type,
  discount_value,
  max_discount_paise,
  minimum_order_paise,
  usage_limit,
  per_customer_limit,
  first_order_only,
  is_active
) VALUES (
  'WELCOME10',
  '10% Welcome Discount up to ₹500 for First Orders',
  'percentage',
  10,
  50000,
  100000,
  500,
  1,
  true,
  true
) ON CONFLICT (code) DO NOTHING;
