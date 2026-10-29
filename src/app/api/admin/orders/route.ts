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
    const {
      order_id,
      status,
      payment_status,
      tracking_number,
      notes,
    } = body;

    if (!order_id) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch existing order
    const { data: currentOrder, error: fetchErr } = await adminClient
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (fetchErr || !currentOrder) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Build update object
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      updatePayload.status = status;
    }

    if (payment_status && ['pending', 'paid', 'failed', 'refunded'].includes(payment_status)) {
      updatePayload.payment_status = payment_status;
    }

    if (tracking_number !== undefined) {
      updatePayload.tracking_number = tracking_number?.trim() || null;
    }

    if (notes !== undefined) {
      updatePayload.notes = notes?.trim() || null;
    }

    // Update order
    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Record status history audit
    if (status && status !== currentOrder.status) {
      await adminClient.from('order_status_history').insert({
        order_id,
        previous_status: currentOrder.status,
        new_status: status,
        changed_by: adminUser.email || 'Admin',
        note: notes || `Fulfillment status changed to ${status}`,
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Order update exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
