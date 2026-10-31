import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyYoupiWebhook, YoupiWebhookEvent } from '@/lib/payments/youpi';

export async function POST(request: Request) {
  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to read raw request body' }, { status: 400 });
  }

  const signatureHeader = request.headers.get('x-gateway-signature');
  const deliveryIdHeader = request.headers.get('x-gateway-delivery-id');
  const timestampHeader = request.headers.get('x-gateway-timestamp');

  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing X-Gateway-Signature header' }, { status: 401 });
  }

  let event: YoupiWebhookEvent;
  try {
    event = verifyYoupiWebhook(rawBody, signatureHeader, timestampHeader);
  } catch (sigErr: any) {
    console.error('YouPI Webhook Signature Verification Error:', sigErr.message);
    return NextResponse.json({ error: sigErr.message || 'Invalid webhook signature' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Deduplication via deliveryId
  const deliveryId =
    deliveryIdHeader ||
    event.deliveryId ||
    `del_${event.paymentId}_${event.event}_${event.timestamp || Date.now()}`;

  const { data: existingEvent } = await adminClient
    .from('webhook_events')
    .select('delivery_id')
    .eq('delivery_id', deliveryId)
    .maybeSingle();

  if (existingEvent) {
    // Idempotent success response for already processed delivery
    return NextResponse.json({ received: true, deduplicated: true }, { status: 200 });
  }

  // Locate matching order in Supabase
  // event.orderId can be either order_number (e.g. WLC-20261031-1234) or UUID
  let orderQuery = adminClient.from('orders').select('*');
  if (event.orderId && event.orderId.includes('-') && event.orderId.length > 30) {
    // Looks like UUID
    orderQuery = orderQuery.eq('id', event.orderId);
  } else if (event.orderId) {
    orderQuery = orderQuery.eq('order_number', event.orderId);
  } else if (event.paymentId) {
    orderQuery = orderQuery.eq('gateway_payment_id', event.paymentId);
  }

  const { data: order, error: orderLookupError } = await orderQuery.maybeSingle();

  const eventType = event.event;
  const settlementState = event.settlementState || 'UNKNOWN';

  // Process event states strictly according to YouPI PG sovereign rules
  if (order) {
    if (eventType === 'OBSERVED_SUCCESS') {
      // 1. Observer matched (Bank SMS or notification alert).
      // IMPORTANT: NOT statement-reconciled. NEVER mark order as paid or confirmed!
      await adminClient
        .from('orders')
        .update({
          payment_status: 'awaiting_verification',
          payment_reference: event.utr || order.payment_reference,
          settlement_status: 'observed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      // Record in order status history
      await adminClient.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: order.status,
        changed_by: 'YouPI Observer (SMS/Push)',
        note: `Observer alert detected incoming UPI transaction. UTR: ${event.utr || 'Pending'}. Settlement state: NOT_RECONCILED. Awaiting bank statement import.`,
      });
    } else if (eventType === 'RECONCILED') {
      // 2. Authoritative reconciliation from bank-statement CSV match.
      // Verify amount matches
      const expectedAmount = Number(order.total_amount);
      const incomingAmount = event.amountPaise
        ? Number(event.amountPaise)
        : event.amount
        ? Math.round(parseFloat(event.amount) * 100)
        : expectedAmount;

      if (incomingAmount !== expectedAmount) {
        // Discrepancy! Hold for manual review
        await adminClient
          .from('orders')
          .update({
            payment_status: 'manual_review',
            settlement_status: 'amount_mismatch',
            notes: `${order.notes || ''} [PAYMENT WARNING: Amount received ₹${(incomingAmount / 100).toFixed(2)} does not match order ₹${(expectedAmount / 100).toFixed(2)}]`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        await adminClient.from('order_status_history').insert({
          order_id: order.id,
          previous_status: order.status,
          new_status: order.status,
          changed_by: 'YouPI Reconciler',
          note: `Amount mismatch: Statement has ₹${(incomingAmount / 100).toFixed(2)}, expected ₹${(expectedAmount / 100).toFixed(2)}. Flagged for manual review.`,
        });
      } else {
        // Exact match! Mark order PAID and CONFIRMED
        await adminClient
          .from('orders')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            settlement_status: 'reconciled',
            payment_verified_at: new Date().toISOString(),
            payment_reference: event.utr || order.payment_reference,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        // Update payment row
        await adminClient
          .from('payments')
          .update({
            status: 'completed',
            provider_reference: event.utr || event.paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq('order_id', order.id);

        await adminClient.from('order_status_history').insert({
          order_id: order.id,
          previous_status: order.status,
          new_status: 'confirmed',
          changed_by: 'YouPI Bank Reconciliation',
          note: `Bank statement line matched. UTR: ${event.utr || 'Verified'}. Payment marked PAID & order CONFIRMED.`,
        });
      }
    } else if (eventType === 'MANUAL_REVIEW') {
      await adminClient
        .from('orders')
        .update({
          payment_status: 'manual_review',
          settlement_status: 'manual_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await adminClient.from('order_status_history').insert({
        order_id: order.id,
        previous_status: order.status,
        new_status: order.status,
        changed_by: 'YouPI Supervisor',
        note: 'Payment session marked for MANUAL_REVIEW. Order fulfillment on hold.',
      });
    } else if (eventType === 'FAILED') {
      await adminClient
        .from('orders')
        .update({
          payment_status: 'failed',
          settlement_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    } else if (eventType === 'EXPIRED') {
      await adminClient
        .from('orders')
        .update({
          payment_status: 'expired',
          settlement_status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    } else if (eventType === 'CANCELLED') {
      await adminClient
        .from('orders')
        .update({
          payment_status: 'cancelled',
          settlement_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }
  }

  // Record audit log in public.webhook_events
  await adminClient.from('webhook_events').insert({
    delivery_id: deliveryId,
    order_id: order?.id || null,
    gateway_payment_id: event.paymentId || null,
    event_type: eventType,
    signature_verified: true,
    settlement_state: settlementState,
    payload: event,
  });

  return NextResponse.json({ received: true });
}
