import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, reason = 'Payment not credited to bank account' } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    const adminIdentifier = `Admin (${user.email || user.id})`;

    // Call atomic PostgreSQL function to reject payment, cancel order, and restore inventory
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('reject_direct_upi_payment', {
      p_order_id: order_id,
      p_admin_identifier: adminIdentifier,
      p_reason: reason.trim(),
    });

    if (rpcError) {
      console.error('reject_direct_upi_payment RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Rejection failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: 'Payment rejected. Order cancelled and inventory restored.',
    });
  } catch (err: any) {
    console.error('Admin reject payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
