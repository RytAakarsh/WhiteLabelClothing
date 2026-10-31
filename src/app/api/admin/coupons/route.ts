import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Helper to verify admin
async function checkAdmin(supabase: any, adminClient: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { authorized: false, status: 401, error: 'Unauthorized.' };

  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!roleData) return { authorized: false, status: 403, error: 'Forbidden. Admin privileges required.' };

  return { authorized: true, user };
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toUpperCase();
    const statusFilter = searchParams.get('status'); // 'all' | 'active' | 'inactive' | 'expired'
    const sort = searchParams.get('sort') || 'created_at_desc';

    let query = adminClient
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
      console.error('Error fetching coupons:', error);
      return NextResponse.json({ error: 'Failed to fetch coupons.' }, { status: 500 });
    }

    let filtered = coupons || [];
    if (statusFilter === 'expired') {
      const now = new Date();
      filtered = filtered.filter((c) => c.expires_at && new Date(c.expires_at) < now);
    }

    // Calculate summary statistics
    const totalActive = (coupons || []).filter((c) => c.is_active && (!c.expires_at || new Date(c.expires_at) >= new Date())).length;
    const totalRedemptions = (coupons || []).reduce((sum, c) => sum + (c.usage_count || 0), 0);

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
    console.error('Coupons GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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

    // Validate Code
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

    // Check duplicate code
    const { data: existing } = await adminClient
      .from('coupons')
      .select('id, is_deleted')
      .eq('code', cleanCode)
      .maybeSingle();

    if (existing && !existing.is_deleted) {
      return NextResponse.json({ error: `Coupon code "${cleanCode}" already exists.` }, { status: 409 });
    }

    const payload: any = {
      code: cleanCode,
      description: description.trim(),
      discount_type,
      discount_value: numDiscountValue,
      max_discount_paise: max_discount_paise ? Number(max_discount_paise) : null,
      minimum_order_paise: minimum_order_paise ? Number(minimum_order_paise) : 0,
      usage_limit: usage_limit ? parseInt(usage_limit, 10) : null,
      per_customer_limit: per_customer_limit ? parseInt(per_customer_limit, 10) : null,
      starts_at: starts_at ? new Date(starts_at).toISOString() : new Date().toISOString(),
      expires_at: expires_at ? new Date(expires_at).toISOString() : null,
      applicable_products: Array.isArray(applicable_products) ? applicable_products : [],
      applicable_categories: Array.isArray(applicable_categories) ? applicable_categories : [],
      first_order_only: Boolean(first_order_only),
      free_shipping: Boolean(free_shipping),
      is_active: Boolean(is_active),
      is_deleted: false,
      created_by: authCheck.user.email || authCheck.user.id,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing && existing.is_deleted) {
      // Restore previously soft-deleted coupon with updated parameters
      result = await adminClient
        .from('coupons')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
    } else {
      result = await adminClient
        .from('coupons')
        .insert(payload)
        .select('*')
        .single();
    }

    if (result.error) {
      console.error('Error inserting coupon:', result.error);
      return NextResponse.json({ error: 'Failed to create coupon code.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon ${cleanCode} created successfully.`,
      coupon: result.data,
    });
  } catch (err: any) {
    console.error('Coupons POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
