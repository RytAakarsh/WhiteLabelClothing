import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getDirectUpiSettings, buildUpiUri, generateQrDataUrl } from '@/lib/payments/direct-upi';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Validate Customer Authentication
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to complete checkout.' }, { status: 401 });
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

    // 2. Validate Contact and Address
    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: 'Contact details (name, email, phone) are required.' }, { status: 400 });
    }

    if (
      !shipping_address ||
      !shipping_address.address_line1 ||
      !shipping_address.city ||
      !shipping_address.postal_code
    ) {
      return NextResponse.json({ error: 'Complete delivery address is required.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your shopping bag is empty.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 3. Check if Direct UPI is enabled by administrator
    const upiConfig = await getDirectUpiSettings();
    if (!upiConfig.is_enabled) {
      return NextResponse.json(
        { error: 'Direct UPI payment is currently paused by administrator. Please select Cash on Delivery.' },
        { status: 403 }
      );
    }

    // 4. Idempotency Protection: If order already exists with this key, return it
    if (idempotency_key && typeof idempotency_key === 'string') {
      const { data: existingOrder } = await adminClient
        .from('orders')
        .select('id, order_number, total_amount, payment_status, payment_gateway')
        .eq('idempotency_key', idempotency_key.trim())
        .maybeSingle();

      if (existingOrder) {
        const upiUri = buildUpiUri({
          upiId: upiConfig.receiving_upi_id,
          payeeName: upiConfig.payee_name,
          amountPaise: Number(existingOrder.total_amount),
          orderNumber: existingOrder.order_number,
        });
        const qrDataUrl = await generateQrDataUrl(upiUri);

        return NextResponse.json({
          success: true,
          order_id: existingOrder.id,
          order_number: existingOrder.order_number,
          total_amount: Number(existingOrder.total_amount),
          upi_uri: upiUri,
          qr_data_url: qrDataUrl,
          upi_id: upiConfig.receiving_upi_id,
          payee_name: upiConfig.payee_name,
          payment_instructions: upiConfig.payment_instructions,
          idempotent_retry: true,
        });
      }
    }

    // 5. Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `WLC-${dateStr}-${randSuffix}`;

    // 6. Server-side delivery charge: strictly ₹99 (9900 paise) per item unit
    const totalUnits = items.reduce(
      (sum: number, i: any) => sum + (parseInt(i.quantity, 10) || 1),
      0
    );
    const deliveryCharge = totalUnits * 9900;

    // 7. Atomic order creation with inventory lock
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
      console.error('Direct UPI order RPC error:', rpcError);
      return NextResponse.json(
        { error: rpcError?.message || 'Could not place order due to inventory lock.' },
        { status: 400 }
      );
    }

    // Fetch confirmed order totals
    const { data: order, error: orderFetchError } = await adminClient
      .from('orders')
      .select('id, order_number, total_amount')
      .eq('id', orderId)
      .single();

    if (orderFetchError || !order) {
      return NextResponse.json({ error: 'Order created but failed to load totals.' }, { status: 500 });
    }

    // 8. Generate immutable UPI Payment URI & Dynamic Vector QR Code
    const totalAmountPaise = Number(order.total_amount);
    const upiUri = buildUpiUri({
      upiId: upiConfig.receiving_upi_id,
      payeeName: upiConfig.payee_name,
      amountPaise: totalAmountPaise,
      orderNumber: order.order_number,
    });
    const qrDataUrl = await generateQrDataUrl(upiUri);

    // 9. Update order to direct_upi & awaiting_payment
    await adminClient
      .from('orders')
      .update({
        payment_gateway: 'direct_upi',
        payment_status: 'awaiting_payment',
        settlement_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Record in payments table
    await adminClient.from('payments').insert({
      order_id: orderId,
      provider: 'direct_upi',
      amount: totalAmountPaise,
      status: 'pending',
    });

    // Record in payment_attempts
    await adminClient.from('payment_attempts').insert({
      order_id: orderId,
      gateway: 'direct_upi',
      amount_paise: totalAmountPaise,
      currency: 'INR',
      status: 'awaiting_payment',
      transaction_reference: order.order_number,
      metadata: {
        receiving_upi_id: upiConfig.receiving_upi_id,
        payee_name: upiConfig.payee_name,
        upi_uri: upiUri,
        total_units: totalUnits,
        delivery_charge: deliveryCharge,
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      total_amount: totalAmountPaise,
      upi_uri: upiUri,
      qr_data_url: qrDataUrl,
      upi_id: upiConfig.receiving_upi_id,
      payee_name: upiConfig.payee_name,
      payment_instructions: upiConfig.payment_instructions,
    });
  } catch (err: any) {
    console.error('Direct UPI payment initialization error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error creating payment.' },
      { status: 500 }
    );
  }
}
