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
      return NextResponse.json({ error: 'Unauthorized. Admin session required.' }, { status: 401 });
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
    const { order_id, verified_utr } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    if (!verified_utr || typeof verified_utr !== 'string') {
      return NextResponse.json({ error: 'A verified bank UTR / reference number is required.' }, { status: 400 });
    }

    const cleanUtr = verified_utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Execute atomic PostgreSQL verification function
    const adminIdentifier = `Admin (${user.email || user.id})`;
    const { data: rpcResult, error: rpcError } = await adminClient.rpc('verify_direct_upi_payment', {
      p_order_id: order_id,
      p_admin_identifier: adminIdentifier,
      p_verified_utr: cleanUtr,
    });

    if (rpcError) {
      console.error('verify_direct_upi_payment RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Verification failed.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: rpcResult,
      message: `Payment verified successfully! Order ${rpcResult?.order_number || ''} marked paid and confirmed.`,
    });
  } catch (err: any) {
    console.error('Admin verify payment error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
