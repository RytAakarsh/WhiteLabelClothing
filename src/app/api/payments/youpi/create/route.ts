import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createYoupiPayment, isYoupiEnabled, getYoupiConfig } from '@/lib/payments/youpi';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Enforce authentication for orders
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to initiate checkout.' }, { status: 401 });
    }

    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      notes = '',
      idempotency_key,
    } = body;

    // Contact & Delivery Validation
    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: 'Customer contact details are required.' }, { status: 400 });
    }

    if (
      !shipping_address ||
      !shipping_address.address_line1 ||
      !shipping_address.city ||
      !shipping_address.postal_code
    ) {
      return NextResponse.json({ error: 'A complete delivery address is required.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your shopping bag is empty.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check for existing order with idempotency_key
    if (idempotency_key && typeof idempotency_key === 'string') {
      const { data: existingOrder } = await adminClient
        .from('orders')
        .select('id, order_number, total_amount, payment_gateway, gateway_payment_id')
        .eq('idempotency_key', idempotency_key.trim())
        .maybeSingle();

      if (existingOrder) {
        // Find existing payment attempt
        const { data: existingAttempt } = await adminClient
          .from('payment_attempts')
          .select('checkout_url, gateway_payment_id')
          .eq('order_id', existingOrder.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAttempt?.checkout_url) {
          return NextResponse.json({
            success: true,
            order_id: existingOrder.id,
            order_number: existingOrder.order_number,
            checkout_url: existingAttempt.checkout_url,
            idempotent_retry: true,
          });
        }
      }
    }

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `WLC-${dateStr}-${randSuffix}`;

    // Delivery Charge Calculation: Strictly ₹99 (9900 paise) per item unit
    const totalUnits = items.reduce(
      (sum: number, i: any) => sum + (parseInt(i.quantity, 10) || 1),
      0
    );
    const deliveryCharge = totalUnits * 9900;

    // Call atomic PostgreSQL function create_order_with_inventory
    const { data: orderId, error: rpcError } = await adminClient.rpc('create_order_with_inventory', {
      p_user_id: user.id,
      p_customer_name: customer_name.trim(),
      p_customer_email: customer_email.trim(),
      p_customer_phone: customer_phone.trim(),
      p_shipping_address: shipping_address,
      p_items: items.map((i: any) => ({
        variant_id: i.variant_id,
        quantity: parseInt(i.quantity, 10),
      })),
      p_delivery_charge: deliveryCharge,
      p_notes: notes.trim(),
      p_order_number: orderNumber,
      p_idempotency_key: idempotency_key ? idempotency_key.trim() : null,
    });

    if (rpcError || !orderId) {
      console.error('Order creation error for YouPI session:', rpcError);
      return NextResponse.json(
        { error: rpcError?.message || 'Failed to place order due to inventory lock.' },
        { status: 400 }
      );
    }

    // Fetch confirmed order with total_amount
    const { data: order, error: orderFetchError } = await adminClient
      .from('orders')
      .select('id, order_number, total_amount')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json({ error: 'Order created but failed to load totals.' }, { status: 500 });
    }

    // Update order payment method & gateway
    await adminClient
      .from('orders')
      .update({
        payment_gateway: 'youpi',
        payment_status: 'pending',
        settlement_status: 'pending',
      })
      .eq('id', orderId);

    const config = getYoupiConfig();
    const returnUrl = `${config.siteUrl}/checkout/complete?orderId=${order.id}&orderNumber=${order.order_number}`;

    let checkoutUrl = '';
    let gatewayPaymentId = '';

    if (isYoupiEnabled()) {
      try {
        const session = await createYoupiPayment({
          orderId: order.order_number,
          amountPaise: Number(order.total_amount),
          currency: 'INR',
          returnUrl,
          customer: {
            name: customer_name.trim(),
            email: customer_email.trim(),
            phoneNumber: customer_phone.trim(),
          },
          metadata: {
            order_id: order.id,
            order_number: order.order_number,
            user_id: user.id,
          },
          idempotencyKey: idempotency_key ? `youpi_${idempotency_key}` : undefined,
        });

        checkoutUrl = session.checkoutUrl;
        gatewayPaymentId = session.paymentId;
      } catch (gatewayErr: any) {
        console.error('YouPI Gateway API call error:', gatewayErr);
        // Do not fail completely: return detailed message
        return NextResponse.json(
          {
            error: `Payment Gateway Connection Error: ${gatewayErr.message}. Ensure YouPI PG VPS is running.`,
          },
          { status: 502 }
        );
      }
    } else {
      // Gateway is in staged/disabled mode. Create a staging return URL
      gatewayPaymentId = `stage_${Date.now()}`;
      checkoutUrl = `${returnUrl}&staged=true`;
    }

    // Record in orders
    await adminClient
      .from('orders')
      .update({
        gateway_payment_id: gatewayPaymentId,
      })
      .eq('id', orderId);

    // Record in payments table
    await adminClient.from('payments').insert({
      order_id: orderId,
      provider: 'youpi',
      provider_reference: gatewayPaymentId,
      amount: order.total_amount,
      status: 'pending',
    });

    // Record in payment_attempts
    await adminClient.from('payment_attempts').insert({
      order_id: orderId,
      gateway: 'youpi',
      gateway_payment_id: gatewayPaymentId,
      amount_paise: order.total_amount,
      currency: 'INR',
      status: 'pending',
      checkout_url: checkoutUrl,
      metadata: {
        customer_phone: customer_phone.trim(),
        total_units: totalUnits,
        delivery_charge: deliveryCharge,
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      checkout_url: checkoutUrl,
      gateway_payment_id: gatewayPaymentId,
      is_staged: !isYoupiEnabled(),
    });
  } catch (err: any) {
    console.error('YouPI create order error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error initializing payment.' },
      { status: 500 }
    );
  }
}
