import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDirectUpiSettings, buildUpiUri, generateQrDataUrl } from '@/lib/payments/direct-upi';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const { orderNumber } = await params;
    if (!orderNumber?.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'ORDER_REQUIRED',
          message: 'Order reference number is required.',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch order details using resilient SECURITY DEFINER RPC
    const { data: order, error: orderErr } = await supabase.rpc('get_direct_upi_order_details', {
      p_order_ref: orderNumber.trim(),
    });

    if (orderErr || !order) {
      return NextResponse.json(
        {
          success: false,
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found or has expired.',
        },
        { status: 404 }
      );
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
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Could not load order details.',
      },
      { status: 500 }
    );
  }
}
