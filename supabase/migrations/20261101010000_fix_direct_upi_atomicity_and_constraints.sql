-- ============================================================================
-- MIGRATION: Fix Direct UPI Order Atomicity, Check Constraints & RLS
-- Target: White Label Clothing (qtvzxezxyzsvgbauyytt)
-- Date: 2026-11-01
-- ============================================================================

-- 1. Fix CHECK constraint on orders.payment_status to support awaiting states
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN (
    'pending', 
    'awaiting_payment', 
    'awaiting_verification', 
    'manual_review', 
    'paid', 
    'failed', 
    'refunded'
  ));

-- 2. Fix CHECK constraint on orders.status to support confirmed
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN (
    'pending', 
    'confirmed', 
    'processing', 
    'shipped', 
    'delivered', 
    'cancelled'
  ));

-- 3. Fix CHECK constraint on payments.status
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN (
    'pending', 
    'awaiting_payment', 
    'awaiting_verification', 
    'completed', 
    'failed', 
    'refunded'
  ));

-- 4. Enable user INSERT policies on payments and payment_attempts
DROP POLICY IF EXISTS "Users can insert own payment attempts" ON public.payment_attempts;
CREATE POLICY "Users can insert own payment attempts"
ON public.payment_attempts FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = payment_attempts.order_id 
    AND (orders.user_id = auth.uid() OR auth.uid() IS NULL)
));

DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own payments"
ON public.payments FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = payments.order_id 
    AND (orders.user_id = auth.uid() OR auth.uid() IS NULL)
));

-- 5. Atomic PostgreSQL Function: create_direct_upi_order
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
    p_idempotency_key TEXT DEFAULT NULL
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
    v_total_amount BIGINT := 0;
    v_item RECORD;
    v_variant RECORD;
    v_product RECORD;
    v_offer RECORD;
    v_line_price BIGINT;
    v_line_discount BIGINT;
    v_line_total BIGINT;
BEGIN
    -- Idempotency check: if order with this idempotency_key already exists, retrieve and return it safely
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) <> '' THEN
        SELECT * INTO v_existing_order 
        FROM public.orders 
        WHERE idempotency_key = TRIM(p_idempotency_key);

        IF FOUND THEN
            -- Ensure a payment_attempts record exists
            IF NOT EXISTS (SELECT 1 FROM public.payment_attempts WHERE order_id = v_existing_order.id) THEN
                INSERT INTO public.payment_attempts (
                    order_id,
                    gateway,
                    amount_paise,
                    currency,
                    status,
                    transaction_reference,
                    metadata
                ) VALUES (
                    v_existing_order.id,
                    'direct_upi',
                    v_existing_order.total_amount,
                    'INR',
                    v_existing_order.payment_status,
                    v_existing_order.order_number,
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
        p_delivery_charge,
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

        -- Lock variant row for update to prevent race conditions / overselling
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

        -- Decrement inventory atomically
        UPDATE public.product_variants
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_item.variant_id;

        -- Fetch product details
        SELECT * INTO v_product
        FROM public.products
        WHERE id = v_variant.product_id;

        IF v_product.status <> 'published' THEN
            RAISE EXCEPTION 'Product "%" is currently unavailable.', v_product.name;
        END IF;

        v_line_price := v_product.base_price + v_variant.price_adjustment;
        v_line_discount := 0;

        -- Check active offer
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

        -- Insert order item snapshot
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

    -- 3. Calculate final total amount
    v_total_amount := (v_subtotal - v_discount_total) + p_delivery_charge;

    -- 4. Update order with actual totals
    UPDATE public.orders
    SET subtotal = v_subtotal,
        discount_total = v_discount_total,
        total_amount = v_total_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order_id;

    -- 5. Record initial order status history
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
        'Direct UPI checkout initiated'
    );

    -- 6. Insert placeholder in payments table
    INSERT INTO public.payments (
        order_id,
        provider,
        amount,
        status
    ) VALUES (
        v_order_id,
        'direct_upi',
        v_total_amount,
        'pending'
    );

    -- 7. Insert record in payment_attempts
    INSERT INTO public.payment_attempts (
        order_id,
        gateway,
        amount_paise,
        currency,
        status,
        transaction_reference,
        metadata
    ) VALUES (
        v_order_id,
        'direct_upi',
        v_total_amount,
        'INR',
        'awaiting_payment',
        p_order_number,
        jsonb_build_object(
            'delivery_charge', p_delivery_charge,
            'order_number', p_order_number
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', p_order_number,
        'total_amount', v_total_amount,
        'subtotal', v_subtotal,
        'delivery_charge', p_delivery_charge,
        'discount_total', v_discount_total,
        'status', 'pending',
        'payment_status', 'awaiting_payment',
        'payment_gateway', 'direct_upi',
        'already_existed', false
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_upi_order TO authenticated, anon, service_role;

-- 6. Atomic RPC: get_direct_upi_order_details (bypasses RLS safely for order details screen)
CREATE OR REPLACE FUNCTION public.get_direct_upi_order_details(
    p_order_ref TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = TRIM(p_order_ref)
       OR (p_order_ref ~ '^[0-9a-fA-F-]{36}$' AND id::text = TRIM(p_order_ref))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'user_id', v_order.user_id,
        'customer_name', v_order.customer_name,
        'customer_email', v_order.customer_email,
        'customer_phone', v_order.customer_phone,
        'status', v_order.status,
        'payment_status', v_order.payment_status,
        'payment_gateway', v_order.payment_gateway,
        'payment_reference', v_order.payment_reference,
        'settlement_status', v_order.settlement_status,
        'payment_verified_at', v_order.payment_verified_at,
        'total_amount', v_order.total_amount,
        'subtotal', v_order.subtotal,
        'delivery_charge', v_order.delivery_charge,
        'discount_total', v_order.discount_total,
        'created_at', v_order.created_at
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_direct_upi_order_details TO authenticated, anon, service_role;

-- 7. Atomic RPC: submit_customer_utr (safe UTR submission with duplicate protection)
CREATE OR REPLACE FUNCTION public.submit_customer_utr(
    p_user_id UUID,
    p_order_ref TEXT,
    p_utr TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_clean_utr TEXT;
    v_duplicate_order RECORD;
BEGIN
    v_clean_utr := UPPER(REGEXP_REPLACE(TRIM(p_utr), '[^a-zA-Z0-9]', '', 'g'));

    IF LENGTH(v_clean_utr) < 6 OR LENGTH(v_clean_utr) > 25 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Please enter a valid 12-digit Bank UTR / Reference number from your payment app.'
        );
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = TRIM(p_order_ref)
       OR (p_order_ref ~ '^[0-9a-fA-F-]{36}$' AND id::text = TRIM(p_order_ref))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found.'
        );
    END IF;

    -- Validate ownership
    IF p_user_id IS NOT NULL AND v_order.user_id IS NOT NULL AND v_order.user_id <> p_user_id THEN
        -- If not owner, check if admin
        IF NOT public.is_admin() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Unauthorized to submit reference for this order.'
            );
        END IF;
    END IF;

    IF v_order.payment_status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_paid', true,
            'message', 'This order is already verified and confirmed.'
        );
    END IF;

    -- Duplicate check on paid orders
    SELECT id, order_number INTO v_duplicate_order
    FROM public.orders
    WHERE payment_reference = v_clean_utr
      AND payment_status = 'paid'
      AND id <> v_order.id
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'This UTR has already been verified on another order (' || v_duplicate_order.order_number || '). Duplicate submissions are not accepted.'
        );
    END IF;

    -- Update order
    UPDATE public.orders
    SET payment_reference = v_clean_utr,
        payment_status = 'awaiting_verification',
        settlement_status = 'observed',
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order.id;

    -- Update payment attempts
    UPDATE public.payment_attempts
    SET customer_utr = v_clean_utr,
        status = 'awaiting_verification',
        updated_at = timezone('utc'::text, now())
    WHERE order_id = v_order.id;

    -- Add status history note
    INSERT INTO public.order_status_history (
        order_id,
        previous_status,
        new_status,
        changed_by,
        note
    ) VALUES (
        v_order.id,
        v_order.status,
        v_order.status,
        COALESCE(v_order.customer_name, 'Customer'),
        'Customer submitted Bank UTR: ' || v_clean_utr
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Your Bank UTR has been recorded and submitted for bank verification.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_utr TO authenticated, anon, service_role;
