import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    let query = adminClient.from('orders').select(`
      id,
      order_number,
      customer_name,
      customer_email,
      total_amount,
      status,
      payment_status,
      payment_gateway,
      payment_reference,
      settlement_status,
      payment_verified_at,
      created_at
    `);

    if (orderId.includes('-') && orderId.length > 30) {
      query = query.eq('id', orderId);
    } else {
      query = query.eq('order_number', orderId);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
