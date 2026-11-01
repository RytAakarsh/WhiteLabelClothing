-- ==============================================================================
-- WHITE LABEL CLOTHING — ADMIN AUTHORIZATION REPAIR & COUPON SYSTEM AUDIT
-- Migration: 20261101030000_admin_authorization_repair.sql
-- ==============================================================================

-- 1. Ensure public.is_admin() is robust, SECURITY DEFINER, STABLE, and sets search_path
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- A. Primary check: Verified admin role in public.user_roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_uid AND role = 'admin'
  ) THEN
    RETURN true;
  END IF;

  -- B. Secondary check: Authenticated JWT email or auth.users email against official admin allowlist
  v_email := LOWER(COALESCE(
    auth.jwt() ->> 'email',
    (SELECT email FROM auth.users WHERE id = v_uid)
  ));

  IF v_email IN (
    'info.whitelabelclothing@gmail.com',
    'aakarsh03mishra@gmail.com',
    'aakarshmishra93@gmail.com',
    'aakarshmishra03@gmail.com',
    'mishraakarsh0303@gmail.com'
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 2. Synchronize trusted administrator accounts into public.user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE LOWER(email) IN (
  'info.whitelabelclothing@gmail.com',
  'aakarsh03mishra@gmail.com',
  'aakarshmishra93@gmail.com',
  'aakarshmishra03@gmail.com',
  'mishraakarsh0303@gmail.com'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- 3. Trigger function to automatically assign admin role to authorized admin emails on user creation
CREATE OR REPLACE FUNCTION public.handle_user_role_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF LOWER(NEW.email) IN (
    'info.whitelabelclothing@gmail.com',
    'aakarsh03mishra@gmail.com',
    'aakarshmishra93@gmail.com',
    'aakarshmishra03@gmail.com',
    'mishraakarsh0303@gmail.com'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_role_assignment();

-- 4. Audit & Tighten RLS on public.coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons
  FOR SELECT
  USING (is_active = true AND is_deleted = false);

-- 5. Audit & Tighten RLS on public.coupon_redemptions
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Prevent direct customer inserts (redemptions MUST occur via atomic RPC functions)
DROP POLICY IF EXISTS "Users can insert own coupon redemptions" ON public.coupon_redemptions;

DROP POLICY IF EXISTS "Admins can manage coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can manage coupon redemptions" ON public.coupon_redemptions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions
  FOR SELECT
  USING (customer_id = auth.uid() OR public.is_admin());

-- 6. Audit & Tighten RLS on public.user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT
  USING ((auth.uid() = user_id) OR public.is_admin());

-- 7. Update validate_coupon_rpc with timezone and clock-skew tolerance
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

    -- Starts at check: Allow 12 hours grace for local IST / UTC date transitions
    IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > (now() + interval '12 hours') THEN
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

