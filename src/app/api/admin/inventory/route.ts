import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleData || roleData.role !== 'admin') return null;
  return user;
}

export async function PUT(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { variant_id, stock_quantity } = body;

    if (!variant_id || stock_quantity === undefined) {
      return NextResponse.json({ error: 'Variant ID and stock quantity are required.' }, { status: 400 });
    }

    const safeQty = Math.max(0, parseInt(stock_quantity, 10) || 0);

    const adminClient = createAdminClient();
    const { data: updatedVariant, error } = await adminClient
      .from('product_variants')
      .update({
        stock_quantity: safeQty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', variant_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, variant: updatedVariant });
  } catch (err: any) {
    console.error('Inventory PUT exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
