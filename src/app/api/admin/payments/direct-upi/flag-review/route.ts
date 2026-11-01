import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth/admin';

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { order_id, note = 'Payment flagged for manual banking audit' } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required.' }, { status: 400 });
    }

    const adminIdentifier = `Admin (${auth.user.email || auth.user.id})`;

    await auth.client
      .from('orders')
      .update({
        payment_status: 'manual_review',
        settlement_status: 'manual_review',
        notes: `[MANUAL REVIEW FLAGGED by ${adminIdentifier}: ${note}]`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id);

    await auth.client.from('order_status_history').insert({
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
    console.error('[Admin Flag Review POST] Exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
