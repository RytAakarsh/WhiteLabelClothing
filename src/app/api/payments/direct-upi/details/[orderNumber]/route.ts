import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDirectUpiSettings, buildUpiUri, generateQrDataUrl } from '@/lib/payments/direct-upi';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber) {
      return NextResponse.json({ error: 'Order number is required.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch order details
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        customer_name,
        customer_email,
        customer_phone,
        total_amount,
        subtotal,
        delivery_charge,
        status,
        payment_status,
        payment_gateway,
        payment_reference,
        settlement_status,
        payment_verified_at,
        created_at
      `)
      .eq('order_number', orderNumber.trim())
      .maybeSingle();

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    // Fetch active Direct UPI settings
    const config = await getDirectUpiSettings();

    // Generate UPI URI & QR Code
    const totalAmountPaise = Number(order.total_amount);
    const upiUri = buildUpiUri({
      upiId: config.receiving_upi_id,
      payeeName: config.payee_name,
      amountPaise: totalAmountPaise,
      orderNumber: order.order_number,
    });
    const qrDataUrl = await generateQrDataUrl(upiUri);

    return NextResponse.json({
      success: true,
      order,
      upi_uri: upiUri,
      qr_data_url: qrDataUrl,
      receiving_upi_id: config.receiving_upi_id,
      payee_name: config.payee_name,
      payment_instructions: config.payment_instructions,
      allow_customer_utr: config.allow_customer_utr,
    });
  } catch (err: any) {
    console.error('Error in direct UPI details route:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
