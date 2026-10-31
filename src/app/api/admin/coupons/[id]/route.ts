import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { data: coupon, error } = await adminClient
      .from('coupons')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error || !coupon) {
      return NextResponse.json({ error: 'Coupon not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, coupon });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const {
      description,
      discount_type,
      discount_value,
      max_discount_paise,
      minimum_order_paise,
      usage_limit,
      per_customer_limit,
      starts_at,
      expires_at,
      applicable_products,
      applicable_categories,
      first_order_only,
      free_shipping,
      is_active,
    } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (description !== undefined) updates.description = String(description).trim();
    if (discount_type !== undefined) {
      if (!['percentage', 'fixed'].includes(discount_type)) {
        return NextResponse.json({ error: 'Discount type must be percentage or fixed.' }, { status: 400 });
      }
      updates.discount_type = discount_type;
    }
    if (discount_value !== undefined) {
      const num = Number(discount_value);
      if (isNaN(num) || num <= 0) {
        return NextResponse.json({ error: 'Discount value must be a positive number.' }, { status: 400 });
      }
      updates.discount_value = num;
    }
    if (max_discount_paise !== undefined) updates.max_discount_paise = max_discount_paise ? Number(max_discount_paise) : null;
    if (minimum_order_paise !== undefined) updates.minimum_order_paise = Number(minimum_order_paise) || 0;
    if (usage_limit !== undefined) updates.usage_limit = usage_limit ? parseInt(usage_limit, 10) : null;
    if (per_customer_limit !== undefined) updates.per_customer_limit = per_customer_limit ? parseInt(per_customer_limit, 10) : null;
    if (starts_at !== undefined) updates.starts_at = starts_at ? new Date(starts_at).toISOString() : new Date().toISOString();
    if (expires_at !== undefined) updates.expires_at = expires_at ? new Date(expires_at).toISOString() : null;
    if (applicable_products !== undefined) updates.applicable_products = applicable_products;
    if (applicable_categories !== undefined) updates.applicable_categories = applicable_categories;
    if (first_order_only !== undefined) updates.first_order_only = Boolean(first_order_only);
    if (free_shipping !== undefined) updates.free_shipping = Boolean(free_shipping);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const { data: updated, error } = await adminClient
      .from('coupons')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating coupon:', error);
      return NextResponse.json({ error: 'Failed to update coupon.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon updated successfully.',
      coupon: updated,
    });
  } catch (err: any) {
    console.error('Coupon PUT error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { is_active } = body;

    const { data: updated, error } = await adminClient
      .from('coupons')
      .update({
        is_active: Boolean(is_active),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, code, is_active')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to toggle status.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Coupon ${updated.code} is now ${updated.is_active ? 'active' : 'inactive'}.`,
      coupon: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const authCheck = await checkAdmin(supabase, adminClient);
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    // Soft delete: set is_deleted = true to preserve historical redemptions
    const { error } = await adminClient
      .from('coupons')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting coupon:', error);
      return NextResponse.json({ error: 'Failed to delete coupon.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted and archived successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
