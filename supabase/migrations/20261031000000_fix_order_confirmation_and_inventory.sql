-- =============================================================
-- MIGRATION: Fix Order Confirmation, Idempotency & Inventory
-- Date: 2026-10-31
-- Target: White Label Clothing (qtvzxezxyzsvgbauyytt)
-- =============================================================

-- 1. Add idempotency_key to public.orders to prevent duplicate submissions
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON public.orders(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- 2. Update create_order_with_inventory to support idempotency check
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
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order_id UUID;
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
    -- Idempotency check: if order with this idempotency_key already exists, return existing order_id
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_order_id 
        FROM public.orders 
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN v_order_id;
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
        p_delivery_charge,
        0,
        p_shipping_address,
        p_notes,
        p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- 2. Process each item, validate & lock variant row
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS (variant_id UUID, quantity INT)
    LOOP
        -- Lock variant row for update to prevent race conditions / overselling
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
            RAISE EXCEPTION 'Product % is not published', v_product.name;
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
        'Order placed successfully'
    );

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_order_with_inventory(UUID, TEXT, TEXT, TEXT, JSONB, JSONB, BIGINT, TEXT, TEXT, TEXT) TO authenticated, anon, service_role;

-- 3. Function to atomically restore inventory on order cancellation
CREATE OR REPLACE FUNCTION public.restore_variant_inventory(
    p_variant_id UUID,
    p_quantity INT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.product_variants
    SET stock_quantity = stock_quantity + p_quantity,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.restore_variant_inventory(UUID, INT) TO authenticated, service_role;

-- 4. Secure Function to fetch order confirmation without RLS failure
CREATE OR REPLACE FUNCTION public.get_order_confirmation(
    p_order_ref TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_items JSONB;
BEGIN
    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = p_order_ref
       OR (p_order_ref ~ '^[0-9a-fA-F-]{36}$' AND id::text = p_order_ref)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT jsonb_agg(
        to_jsonb(i) || jsonb_build_object(
            'image_url', (
                SELECT pi.storage_path
                FROM public.product_images pi
                WHERE pi.product_id = i.product_id
                ORDER BY pi.is_primary DESC, pi.sort_order ASC
                LIMIT 1
            )
        )
    ) INTO v_items
    FROM public.order_items i
    WHERE i.order_id = v_order.id;

    RETURN jsonb_build_object(
        'id', v_order.id,
        'order_number', v_order.order_number,
        'user_id', v_order.user_id,
        'customer_name', v_order.customer_name,
        'customer_email', v_order.customer_email,
        'customer_phone', v_order.customer_phone,
        'status', v_order.status,
        'payment_status', v_order.payment_status,
        'subtotal', v_order.subtotal,
        'discount_total', v_order.discount_total,
        'delivery_charge', v_order.delivery_charge,
        'total_amount', v_order.total_amount,
        'shipping_address_snapshot', v_order.shipping_address_snapshot,
        'notes', v_order.notes,
        'tracking_number', v_order.tracking_number,
        'created_at', v_order.created_at,
        'items', COALESCE(v_items, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_order_confirmation(TEXT) TO authenticated, anon, service_role;
