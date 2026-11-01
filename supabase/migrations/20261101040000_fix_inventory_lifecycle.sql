-- ==============================================================================
-- WHITE LABEL CLOTHING — INVENTORY LIFECYCLE REPAIR & FIX PREMATURE STOCK DEDUCTION
-- Migration: 20261101040000_fix_inventory_lifecycle.sql
-- ==============================================================================

-- 1. Redefine create_direct_upi_order: Validate stock availability, but DO NOT deduct stock.
-- Stock is only deducted when the Admin explicitly approves and verifies payment.
DROP FUNCTION IF EXISTS public.create_direct_upi_order(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT, TEXT);

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

    -- Idempotency check: if order with this idempotency_key already exists, return existing order
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

    -- 1. Create order record with pending/awaiting_payment status
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

    -- 2. Validate items & stock availability (WITHOUT DEDUCTING STOCK)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (variant_id UUID, quantity INT)
    LOOP
        IF v_item.quantity IS NULL OR v_item.quantity <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.';
        END IF;

        SELECT * INTO v_variant
        FROM public.product_variants
        WHERE id = v_item.variant_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Garment variant % not found.', v_item.variant_id;
        END IF;

        IF v_variant.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for size % (available: %, requested: %).',
                v_variant.size, v_variant.stock_quantity, v_item.quantity;
        END IF;

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

    -- 3. Atomic Coupon Validation & Reservation
    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
        v_clean_coupon := UPPER(TRIM(p_coupon_code));

        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE UPPER(code) = v_clean_coupon
          AND is_deleted = false
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Coupon "%" not found or no longer available.', v_clean_coupon;
        END IF;

        IF NOT v_coupon.is_active THEN
            RAISE EXCEPTION 'Coupon "%" is currently inactive.', v_clean_coupon;
        END IF;

        IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > (now() + interval '12 hours') THEN
            RAISE EXCEPTION 'Coupon "%" promotion has not started yet.', v_clean_coupon;
        END IF;

        IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
            RAISE EXCEPTION 'Coupon "%" has expired.', v_clean_coupon;
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Coupon "%" has reached its maximum redemption limit.', v_clean_coupon;
        END IF;

        IF v_subtotal < v_coupon.minimum_order_paise THEN
            RAISE EXCEPTION 'Order subtotal must be at least ₹% to use coupon "%".', 
                (v_coupon.minimum_order_paise / 100), v_clean_coupon;
        END IF;

        IF p_user_id IS NOT NULL AND v_coupon.per_customer_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_customer_usage
            FROM public.coupon_redemptions
            WHERE coupon_id = v_coupon.id
              AND customer_id = p_user_id
              AND status IN ('reserved', 'redeemed');

            IF v_customer_usage >= v_coupon.per_customer_limit THEN
                RAISE EXCEPTION 'You have already redeemed coupon "%" the maximum allowed times.', v_clean_coupon;
            END IF;
        END IF;

        IF v_coupon.first_order_only AND p_user_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_prior_orders
            FROM public.orders
            WHERE user_id = p_user_id
              AND payment_status = 'paid';

            IF v_prior_orders > 0 THEN
                RAISE EXCEPTION 'Coupon "%" is exclusively valid on your first order.', v_clean_coupon;
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

        UPDATE public.orders
        SET coupon_id = v_coupon.id,
            coupon_code = v_coupon.code
        WHERE id = v_order_id;

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
        v_order_id, NULL, 'pending', p_customer_name, 'Direct UPI checkout initiated (Awaiting customer payment & UTR)'
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


-- 2. Redefine verify_direct_upi_payment: Deduct stock ONLY when Admin verifies & approves the payment.
-- Prevents duplicate stock deductions if clicked multiple times (idempotency).
DROP FUNCTION IF EXISTS public.verify_direct_upi_payment(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_direct_upi_payment(
    p_order_id UUID,
    p_admin_identifier TEXT,
    p_verified_utr TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_clean_utr TEXT;
    v_duplicate_order RECORD;
    v_redemption RECORD;
    v_item RECORD;
    v_variant RECORD;
BEGIN
    v_clean_utr := TRIM(p_verified_utr);

    IF v_clean_utr IS NULL OR LENGTH(v_clean_utr) < 6 THEN
        RAISE EXCEPTION 'A valid bank UTR / reference number is required (minimum 6 characters).';
    END IF;

    -- Lock the order row
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    -- Idempotency check: if already marked paid, return success without deducting stock again
    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order was already verified and marked paid.',
            'order_id', v_order.id,
            'order_number', v_order.order_number,
            'already_verified', true
        );
    END IF;

    -- Verify UTR is not already used on another confirmed paid order
    SELECT id, order_number INTO v_duplicate_order
    FROM public.orders
    WHERE payment_reference = v_clean_utr
      AND payment_status = 'paid'
      AND id <> p_order_id
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'UTR % has already been used and verified for order %', v_clean_utr, v_duplicate_order.order_number;
    END IF;

    -- Atomic Inventory Deduction: Deduct stock for all items in order
    FOR v_item IN SELECT * FROM public.order_items WHERE order_id = p_order_id
    LOOP
        IF v_item.variant_id IS NOT NULL AND v_item.quantity > 0 THEN
            SELECT * INTO v_variant
            FROM public.product_variants
            WHERE id = v_item.variant_id
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Garment variant not found.';
            END IF;

            IF v_variant.stock_quantity < v_item.quantity THEN
                RAISE EXCEPTION 'Cannot approve order %: Insufficient stock for % (Size: %). Available: %, Required: %.',
                    v_order.order_number, v_item.product_name_snapshot, v_variant.size, v_variant.stock_quantity, v_item.quantity;
            END IF;

            UPDATE public.product_variants
            SET stock_quantity = stock_quantity - v_item.quantity,
                updated_at = timezone('utc'::text, now())
            WHERE id = v_item.variant_id;
        END IF;
    END LOOP;

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
        'Payment verified with UTR: ' || v_clean_utr || '. Order confirmed and stock deducted.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment verified successfully! Order ' || v_order.order_number || ' confirmed and stock deducted.',
        'order_id', v_order.id,
        'order_number', v_order.order_number,
        'already_verified', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_direct_upi_payment TO authenticated, service_role;


-- 3. Redefine reject_direct_upi_payment: Does NOT restore inventory, because stock was never deducted.
DROP FUNCTION IF EXISTS public.reject_direct_upi_payment(UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.reject_direct_upi_payment(
    p_order_id UUID,
    p_admin_identifier TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_redemption RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found.';
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RAISE EXCEPTION 'Cannot reject order %: Payment has already been verified and confirmed as paid.', v_order.order_number;
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
        UPDATE public.coupon_redemptions
        SET status = 'cancelled'
        WHERE id = v_redemption.id;
    END LOOP;

    -- Note: Stock was NOT deducted during UPI initiation, so no stock restoration is performed.

    INSERT INTO public.order_status_history (
        order_id, previous_status, new_status, changed_by, note
    ) VALUES (
        p_order_id, v_order.status, 'cancelled', p_admin_identifier,
        'Payment rejected: ' || p_reason || '. (Stock was not deducted).'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Payment rejected. Order cancelled. Inventory was not deducted.',
        'order_id', v_order.id,
        'order_number', v_order.order_number
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_direct_upi_payment TO authenticated, service_role;
