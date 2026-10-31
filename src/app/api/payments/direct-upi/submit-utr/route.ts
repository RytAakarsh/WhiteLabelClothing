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
      return NextResponse.json({ error: 'Please sign in to submit payment reference.' }, { status: 401 });
    }

    const body = await request.json();
    const { order_id, order_number, utr } = body;

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json({ error: 'Please enter your 12-digit Bank UTR / Reference number.' }, { status: 400 });
    }

    const cleanUtr = utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanUtr.length < 6 || cleanUtr.length > 25) {
      return NextResponse.json(
        { error: 'Invalid UTR format. Bank reference numbers are typically 12 alphanumeric characters.' },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Locate the order and enforce ownership
    let query = adminClient.from('orders').select('*');
    if (order_id) {
      query = query.eq('id', order_id);
    } else if (order_number) {
      query = query.eq('order_number', order_number);
    } else {
      return NextResponse.json({ error: 'Order reference is required.' }, { status: 400 });
    }

    const { data: order, error: orderErr } = await query.maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Ownership validation (or admin check)
    if (order.user_id !== user.id) {
      // Check if user is admin
      const { data: roleData } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!roleData) {
        return NextResponse.json({ error: 'Unauthorized to update this order.' }, { status: 403 });
      }
    }

    // Check if order is already paid
    if (order.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        already_paid: true,
        message: 'This order is already verified and confirmed.',
      });
    }

    // Check if UTR is already used on another paid order (duplicate UTR fraud protection)
    const { data: duplicatePaidOrder } = await adminClient
      .from('orders')
      .select('order_number')
      .eq('payment_reference', cleanUtr)
      .eq('payment_status', 'paid')
      .neq('id', order.id)
      .maybeSingle();

    if (duplicatePaidOrder) {
      return NextResponse.json(
        { error: `This UTR has already been verified on another order (${duplicatePaidOrder.order_number}). Duplicate submissions are not accepted.` },
        { status: 409 }
      );
    }

    // Update order with customer UTR and transition to awaiting_verification
    const { error: updateErr } = await adminClient
      .from('orders')
      .update({
        payment_reference: cleanUtr,
        payment_status: 'awaiting_verification',
        settlement_status: 'observed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to record payment reference.' }, { status: 500 });
    }

    // Update payment attempts table
    await adminClient
      .from('payment_attempts')
      .update({
        customer_utr: cleanUtr,
        status: 'awaiting_verification',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);

    // Update payments table provider_reference
    await adminClient
      .from('payments')
      .update({
        provider_reference: cleanUtr,
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', order.id);

    // Record audit status history
    await adminClient.from('order_status_history').insert({
      order_id: order.id,
      previous_status: order.status,
      new_status: order.status,
      changed_by: `Customer (${user.email || 'User'})`,
      note: `Customer submitted Bank UTR / Reference: ${cleanUtr}. Awaiting administrator verification in SBI receiving account.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment reference submitted successfully. Our team will verify the transfer in our SBI account and confirm your order.',
      payment_status: 'awaiting_verification',
      utr: cleanUtr,
    });
  } catch (err: any) {
    console.error('Submit UTR error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
