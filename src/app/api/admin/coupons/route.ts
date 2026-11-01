import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';

export async function GET(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = auth.client;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const statusFilter = searchParams.get('status'); // 'all' | 'active' | 'inactive' | 'expired'
    const sort = searchParams.get('sort') || 'created_at_desc';

    let query = client
      .from('coupons')
      .select('*')
      .eq('is_deleted', false);

    if (search) {
      query = query.ilike('code', `%${search}%`);
    }

    if (statusFilter === 'active') {
      query = query.eq('is_active', true);
    } else if (statusFilter === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (sort === 'created_at_asc') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'usage_desc') {
      query = query.order('usage_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: coupons, error } = await query;

    if (error) {
      console.error('[Admin Coupons GET] Error fetching coupons:', error);
      return NextResponse.json({ error: 'Failed to fetch coupons.' }, { status: 500 });
    }

    let filtered: any[] = coupons || [];
    if (statusFilter === 'expired') {
      const now = new Date();
      filtered = filtered.filter((c: any) => c.expires_at && new Date(c.expires_at) < now);
    }

    // Calculate summary statistics
    const totalActive = (coupons || []).filter(
      (c: any) => c.is_active && (!c.expires_at || new Date(c.expires_at) >= new Date())
    ).length;
    const totalRedemptions = (coupons || []).reduce((sum: number, c: any) => sum + (c.usage_count || 0), 0);

    return NextResponse.json({
      success: true,
      coupons: filtered,
      stats: {
        total_coupons: filtered.length,
        total_active: totalActive,
        total_redemptions: totalRedemptions,
      },
    });
  } catch (err: any) {
    console.error('[Admin Coupons GET] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const client = auth.client;

    const body = await request.json();
    const {
      code,
      description = '',
      discount_type,
      discount_value,
      max_discount_paise = null,
      minimum_order_paise = 0,
      usage_limit = null,
      per_customer_limit = 1,
      starts_at = null,
      expires_at = null,
      applicable_products = [],
      applicable_categories = [],
      first_order_only = false,
      free_shipping = false,
      is_active = true,
    } = body;

    // Validate Code (alphanumeric uppercase, min 3 chars)
    const cleanCode = code ? code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
    if (!cleanCode || cleanCode.length < 3) {
      return NextResponse.json(
        { error: 'Coupon code must be at least 3 alphanumeric characters.' },
        { status: 400 }
      );
    }

    // Validate Discount Type & Value
    if (!['percentage', 'fixed'].includes(discount_type)) {
      return NextResponse.json({ error: 'Discount type must be "percentage" or "fixed".' }, { status: 400 });
    }

    const numDiscountValue = Number(discount_value);
    if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
      return NextResponse.json({ error: 'Discount value must be a positive number.' }, { status: 400 });
    }

    if (discount_type === 'percentage' && numDiscountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%.' }, { status: 400 });
    }

    // Validate max cap
    if (max_discount_paise !== null && max_discount_paise !== undefined) {
      const numCap = Number(max_discount_paise);
      if (isNaN(numCap) || numCap < 0) {
        return NextResponse.json({ error: 'Maximum discount cap must be nonnegative.' }, { status: 400 });
      }
    }

    // Validate minimum order
    const numMinOrder = Number(minimum_order_paise) || 0;
    if (numMinOrder < 0) {
      return NextResponse.json({ error: 'Minimum order amount must be nonnegative.' }, { status: 400 });
    }

    // Validate usage limits
    if (usage_limit !== null && usage_limit !== undefined && usage_limit !== '') {
      const numLimit = parseInt(String(usage_limit), 10);
      if (isNaN(numLimit) || numLimit <= 0) {
        return NextResponse.json({ error: 'Global usage limit must be a positive integer.' }, { status: 400 });
      }
    }

    if (per_customer_limit !== null && per_customer_limit !== undefined && per_customer_limit !== '') {
      const numCustLimit = parseInt(String(per_customer_limit), 10);
      if (isNaN(numCustLimit) || numCustLimit <= 0) {
        return NextResponse.json({ error: 'Per-customer limit must be a positive integer.' }, { status: 400 });
      }
    }

    // Validate date chronology
    const startDate = starts_at ? new Date(starts_at) : new Date();
    let expiryDate: Date | null = null;
    if (expires_at) {
      expiryDate = new Date(expires_at);
      if (expiryDate < startDate) {
        return NextResponse.json(
          { error: 'Expiration date must be later than or equal to the start date.' },
          { status: 400 }
        );
      }
    }

    // Check duplicate code
    const { data: existing } = await client
      .from('coupons')
      .select('id, is_deleted')
      .eq('code', cleanCode)
      .maybeSingle();

    if (existing && !existing.is_deleted) {
      return NextResponse.json({ error: `Coupon code "${cleanCode}" already exists.` }, { status: 409 });
    }

    const payload: any = {
      code: cleanCode,
      description: description ? description.trim() : '',
      discount_type,
      discount_value: numDiscountValue,
      max_discount_paise: max_discount_paise ? Number(max_discount_paise) : null,
      minimum_order_paise: numMinOrder,
      usage_limit: usage_limit ? parseInt(String(usage_limit), 10) : null,
      per_customer_limit: per_customer_limit ? parseInt(String(per_customer_limit), 10) : null,
      starts_at: startDate.toISOString(),
      expires_at: expiryDate ? expiryDate.toISOString() : null,
      applicable_products: Array.isArray(applicable_products) ? applicable_products : [],
      applicable_categories: Array.isArray(applicable_categories) ? applicable_categories : [],
      first_order_only: Boolean(first_order_only),
      free_shipping: Boolean(free_shipping),
      is_active: Boolean(is_active),
      is_deleted: false,
      created_by: auth.user.email || auth.user.id,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing && existing.is_deleted) {
      // Restore previously soft-deleted coupon with updated parameters
      result = await client
        .from('coupons')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
    } else {
      result = await client
        .from('coupons')
        .insert(payload)
        .select('*')
        .single();
    }

    if (result.error) {
      console.error('[Admin Coupons POST] Error inserting coupon:', result.error);
      return NextResponse.json({ error: 'Failed to create coupon code.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon ${cleanCode} created successfully.`,
      coupon: result.data,
    });
  } catch (err: any) {
    console.error('[Admin Coupons POST] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
