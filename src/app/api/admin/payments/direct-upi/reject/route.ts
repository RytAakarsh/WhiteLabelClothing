import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { order_id, reason = 'Payment not credited to bank account' } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    const adminIdentifier = `Admin (${auth.user.email || auth.user.id})`;

    // Call atomic PostgreSQL function to reject payment, cancel order, and restore inventory
    const { data: rpcResult, error: rpcError } = await auth.client.rpc('reject_direct_upi_payment', {
      p_order_id: order_id,
      p_admin_identifier: adminIdentifier,
      p_reason: reason.trim(),
    });

    if (rpcError) {
      console.error('[Admin Reject Payment] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Rejection failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: 'Payment rejected. Order cancelled and inventory restored.',
    });
  } catch (err: any) {
    console.error('[Admin Reject Payment] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
