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
    const { order_id, note = 'Payment flagged for manual banking audit' } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    const adminIdentifier = `Admin (${user.email || user.id})`;

    await adminClient
      .from('orders')
      .update({
        payment_status: 'manual_review',
        settlement_status: 'manual_review',
        notes: `[MANUAL REVIEW FLAGGED by ${adminIdentifier}: ${note}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    await adminClient.from('order_status_history').insert({
      order_id,
      previous_status: 'awaiting_verification',
      new_status: 'manual_review',
      changed_by: adminIdentifier,
      note: `Flagged for manual review: ${note}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Order successfully flagged for manual review.',
    });
  } catch (err: any) {
    console.error('Flag manual review error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
