import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';

export async function PUT(request: Request) {
  try {
    const authResult = await verifyAdminSession();
    if (!authResult) {
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

    const client = authResult.client;

    // Fetch existing order
    const { data: currentOrder, error: fetchErr } = await client
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
    const { data: updatedOrder, error: updateErr } = await client
      .from('orders')
      .update(updatePayload)
      .eq('id', order_id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    // Restore inventory exactly once if order is transitioning to cancelled before fulfillment
    // Only restore if stock was actually deducted (e.g. COD orders or paid/approved UPI orders)
    const stockWasDeducted =
      currentOrder.payment_gateway === 'cod' ||
      currentOrder.payment_status === 'paid' ||
      currentOrder.status === 'confirmed';

    if (currentOrder.status !== 'cancelled' && status === 'cancelled' && stockWasDeducted) {
      const { data: orderItems } = await client
        .from('order_items')
        .select('variant_id, quantity')
        .eq('order_id', order_id);

      if (orderItems && orderItems.length > 0) {
        for (const item of orderItems) {
          if (item.variant_id && item.quantity > 0) {
            await client.rpc('restore_variant_inventory', {
              p_variant_id: item.variant_id,
              p_quantity: item.quantity,
            });
          }
        }
      }
    }

    // Record status history audit
    if (status && status !== currentOrder.status) {
      await client.from('order_status_history').insert({
        order_id,
        previous_status: currentOrder.status,
        new_status: status,
        changed_by: authResult.user.email || 'Admin',
        note: notes || `Fulfillment status changed to ${status}`,
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('Order update exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
