-- -------------------------------------------------------------
-- White Label Clothing - Initial Schema Migration
-- -------------------------------------------------------------

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. User Roles Table (Server-verified authorization model)
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Security definer function to avoid recursive RLS check
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_path TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT,
    short_description TEXT,
    description TEXT,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    base_price BIGINT NOT NULL DEFAULT 0, -- Stored in paise (INR integer minor units)
    compare_at_price BIGINT, -- Stored in paise
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_new_arrival BOOLEAN NOT NULL DEFAULT false,
    is_best_seller BOOLEAN NOT NULL DEFAULT false,
    is_offer_eligible BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    search_title TEXT,
    search_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Product Images Table (Max 5 images per product enforced)
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    variant_size TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    sku TEXT,
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    price_adjustment BIGINT NOT NULL DEFAULT 0, -- in paise
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_variant_size UNIQUE (product_id, size)
);

-- 7. Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value BIGINT NOT NULL, -- e.g. 40 for 40% or minor units in paise
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Offer Products Join Table
CREATE TABLE IF NOT EXISTS public.offer_products (
    offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (offer_id, product_id)
);

-- 9. Customer Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'India',
    delivery_instructions TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_cart_variant UNIQUE (cart_id, variant_id)
);

-- 12. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    subtotal BIGINT NOT NULL, -- paise
    discount_total BIGINT NOT NULL DEFAULT 0, -- paise
    delivery_charge BIGINT NOT NULL DEFAULT 0, -- paise
    total_amount BIGINT NOT NULL, -- paise
    shipping_address_snapshot JSONB NOT NULL,
    notes TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT,
    size_snapshot TEXT NOT NULL,
    unit_price_snapshot BIGINT NOT NULL, -- paise
    quantity INT NOT NULL CHECK (quantity > 0),
    discount_snapshot BIGINT NOT NULL DEFAULT 0, -- paise
    line_total BIGINT NOT NULL -- paise
);

-- 14. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'cod',
    provider_reference TEXT,
    amount BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. Order Status History Table
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 16. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. Homepage Sections Table
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id TEXT PRIMARY KEY,
    section_type TEXT NOT NULL,
    title TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);

-- Enable Row Level Security (RLS) on all application tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- ROW LEVEL SECURITY POLICIES
-- -------------------------------------------------------------

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Public can view active categories"
ON public.categories FOR SELECT
USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage categories"
ON public.categories FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Products: Public can only view published products
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Public can view published products"
ON public.products FOR SELECT
USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Product Variants
DROP POLICY IF EXISTS "Public can view active variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admins can manage variants" ON public.product_variants;

CREATE POLICY "Public can view active variants"
ON public.product_variants FOR SELECT
USING (
    is_active = true AND EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_variants.product_id AND (p.status = 'published' OR public.is_admin())
    )
);

CREATE POLICY "Admins can manage variants"
ON public.product_variants FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Product Images
DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;

CREATE POLICY "Public can view product images"
ON public.product_images FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_images.product_id AND (p.status = 'published' OR public.is_admin())
    )
);

CREATE POLICY "Admins can manage product images"
ON public.product_images FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Offers & Offer Products
DROP POLICY IF EXISTS "Public can view active offers" ON public.offers;
DROP POLICY IF EXISTS "Admins can manage offers" ON public.offers;

CREATE POLICY "Public can view active offers"
ON public.offers FOR SELECT
USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage offers"
ON public.offers FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view offer products" ON public.offer_products;
DROP POLICY IF EXISTS "Admins can manage offer products" ON public.offer_products;

CREATE POLICY "Public can view offer products"
ON public.offer_products FOR SELECT
USING (true);

CREATE POLICY "Admins can manage offer products"
ON public.offer_products FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- User Roles
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Addresses
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses"
ON public.addresses FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Carts & Cart Items
DROP POLICY IF EXISTS "Users can manage own cart" ON public.carts;
CREATE POLICY "Users can manage own cart"
ON public.carts FOR ALL
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items"
ON public.cart_items FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.carts c
        WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR public.is_admin())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.carts c
        WHERE c.id = cart_items.cart_id AND (c.user_id = auth.uid() OR public.is_admin())
    )
);

-- Orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

CREATE POLICY "Users can view own orders"
ON public.orders FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create own orders"
ON public.orders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view own order items"
ON public.order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
);

CREATE POLICY "Users can insert own order items"
ON public.order_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can manage all order items"
ON public.order_items FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Payments
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = payments.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments"
ON public.payments FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Order Status History
DROP POLICY IF EXISTS "Users can view own order status history" ON public.order_status_history;
CREATE POLICY "Users can view own order status history"
ON public.order_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_status_history.order_id AND (o.user_id = auth.uid() OR public.is_admin())
    )
);

DROP POLICY IF EXISTS "Admins can manage order status history" ON public.order_status_history;
CREATE POLICY "Admins can manage order status history"
ON public.order_status_history FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Store Settings & Homepage Sections
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
CREATE POLICY "Public can view store settings"
ON public.store_settings FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;
CREATE POLICY "Admins can manage store settings"
ON public.store_settings FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view enabled homepage sections" ON public.homepage_sections;
CREATE POLICY "Public can view enabled homepage sections"
ON public.homepage_sections FOR SELECT
USING (is_enabled = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage homepage sections" ON public.homepage_sections;
CREATE POLICY "Admins can manage homepage sections"
ON public.homepage_sections FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON SIGNUP
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO NOTHING;

    -- Assign customer role by default
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- ATOMIC INVENTORY & ORDER CREATION FUNCTION
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_with_inventory(
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_shipping_address JSONB,
    p_items JSONB, -- Array of { variant_id: UUID, quantity: INT }
    p_delivery_charge BIGINT,
    p_notes TEXT,
    p_order_number TEXT
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
        notes
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
        p_notes
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
            quantity,
            discount_snapshot,
            line_total
        ) VALUES (
            v_order_id,
            v_product.id,
            v_variant.id,
            v_product.name,
            COALESCE(v_variant.sku, v_product.sku),
            v_variant.size,
            v_line_price,
            v_item.quantity,
            v_line_discount,
            v_line_total
        );
    END LOOP;

    v_total_amount := v_subtotal - v_discount_total + p_delivery_charge;

    -- Update final order amounts
    UPDATE public.orders
    SET subtotal = v_subtotal,
        discount_total = v_discount_total,
        total_amount = v_total_amount,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_order_id;

    -- Record initial status in order history
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

-- -------------------------------------------------------------
-- SEED DATA: CATEGORIES, HOMEPAGE SECTIONS, STORE SETTINGS
-- -------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, image_path, sort_order, is_active)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Premium Sweatshirts', 'sweatshirts', 'Ultra-luxe heavyweight cotton fleece sweatshirts engineered for supreme comfort and enduring silhouette.', '/images/hero-sweatshirt-sale.png', 1, true),
    ('c2222222-2222-2222-2222-222222222222', 'Premium Jackets', 'jackets', 'Architectural outerwear blending technical insulation with tailored luxury aesthetics.', '/images/hero-jacket-sale.png', 2, true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    image_path = EXCLUDED.image_path;

INSERT INTO public.store_settings (key, value)
VALUES
    ('store_info', '{
        "brand_name": "White Label Clothing",
        "tagline": "More than just a label. Made to be remembered.",
        "support_phone": "8851872245",
        "whatsapp_number": "8851872245",
        "support_email": "info.whitelabelclothing@gmail.com",
        "currency": "INR",
        "currency_symbol": "₹",
        "free_shipping_threshold": 299900,
        "default_shipping_fee": 15000
    }'::jsonb),
    ('announcement_bar', '{
        "enabled": true,
        "text": "COMPLIMENTARY EXPRESS SHIPPING ON ALL ORDERS OVER ₹2,999"
    }'::jsonb)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;

INSERT INTO public.homepage_sections (id, section_type, title, is_enabled, sort_order, configuration)
VALUES
    ('hero_carousel', 'hero_carousel', 'Campaign Hero', true, 1, '{
        "autoplay_interval": 5000,
        "slides": [
            {
                "id": 1,
                "title": "Winter Collection",
                "subtitle": "Monochrome Luxe",
                "image": "/images/hero-winter-collection.png",
                "link": "/collections",
                "is_enabled": true
            },
            {
                "id": 2,
                "title": "Premium Jacket Sale",
                "subtitle": "Up to 40% Off on Premium Jackets",
                "image": "/images/hero-jacket-sale.png",
                "link": "/collections/jackets",
                "is_enabled": true
            },
            {
                "id": 3,
                "title": "Premium Sweatshirt Sale",
                "subtitle": "Up to 40% Off on Premium Sweatshirts",
                "image": "/images/hero-sweatshirt-sale.png",
                "link": "/collections/sweatshirts",
                "is_enabled": true
            }
        ]
    }'::jsonb),
    ('categories', 'categories', 'Shop by Category', true, 2, '{
        "show_count": true
    }'::jsonb),
    ('featured_products', 'featured_products', 'Featured Collection', true, 3, '{
        "limit": 8
    }'::jsonb),
    ('new_arrivals', 'new_arrivals', 'New Arrivals', true, 4, '{
        "limit": 8
    }'::jsonb),
    ('active_offers', 'active_offers', 'Special Offers', true, 5, '{
        "limit": 8
    }'::jsonb),
    ('brand_statement', 'brand_statement', 'Brand Philosophy', true, 6, '{
        "tagline": "More than just a label. Made to be remembered.",
        "description": "Crafted with relentless attention to architectural proportion, monolithic monochromatic tones, and uncompromising textile luxury."
    }'::jsonb)
ON CONFLICT (id) DO UPDATE
SET configuration = EXCLUDED.configuration,
    title = EXCLUDED.title;

-- Setup Storage bucket for product images if storage schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('product-images', 'product-images', true)
        ON CONFLICT (id) DO NOTHING;

        -- Storage policies: Public read, Admin insert/update/delete
        DROP POLICY IF EXISTS "Public can view product images bucket" ON storage.objects;
        CREATE POLICY "Public can view product images bucket"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'product-images');

        DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
        CREATE POLICY "Admins can upload product images"
        ON storage.objects FOR INSERT
        WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

        DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
        CREATE POLICY "Admins can update product images"
        ON storage.objects FOR UPDATE
        USING (bucket_id = 'product-images' AND public.is_admin());

        DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
        CREATE POLICY "Admins can delete product images"
        ON storage.objects FOR DELETE
        USING (bucket_id = 'product-images' AND public.is_admin());
    END IF;
END $$;
