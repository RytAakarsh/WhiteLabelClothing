import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';

export async function PUT(request: Request) {
  try {
    const authResult = await verifyAdminSession();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { variant_id, stock_quantity } = body;

    if (!variant_id || stock_quantity === undefined) {
      return NextResponse.json({ error: 'Variant ID and stock quantity are required.' }, { status: 400 });
    }

    const safeQty = Math.max(0, parseInt(stock_quantity, 10) || 0);
    const client = authResult.client;

    const { data: updatedVariant, error } = await client
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
