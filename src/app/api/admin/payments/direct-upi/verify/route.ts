import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { order_id, verified_utr } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    if (!verified_utr || typeof verified_utr !== 'string') {
      return NextResponse.json({ error: 'A verified bank UTR / reference number is required.' }, { status: 400 });
    }

    const cleanUtr = verified_utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Execute atomic PostgreSQL verification function
    const adminIdentifier = `Admin (${auth.user.email || auth.user.id})`;
    const { data: rpcResult, error: rpcError } = await auth.client.rpc('verify_direct_upi_payment', {
      p_order_id: order_id,
      p_admin_identifier: adminIdentifier,
      p_verified_utr: cleanUtr,
    });

    if (rpcError) {
      console.error('[Admin Verify Payment] RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Verification failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: `Payment verified successfully! Order ${rpcResult?.order_number || ''} marked paid and confirmed.`,
    });
  } catch (err: any) {
    console.error('[Admin Verify Payment] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
