import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getDirectUpiSettings, buildUpiUri, generateQrDataUrl } from '@/lib/payments/direct-upi';

export async function POST(request: Request) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 1. Validate Customer Authentication
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Please sign in to complete checkout.',
        },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PAYLOAD',
          message: 'Malformed request body.',
        },
        { status: 400 }
      );
    }

    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      notes = '',
      idempotency_key,
    } = body;

    // 2. Validate Contact Details
    if (!customer_name?.trim() || !customer_email?.trim() || !customer_phone?.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'CONTACT_REQUIRED',
          message: 'Contact details (name, email, and 10-digit mobile number) are required.',
        },
        { status: 400 }
      );
    }

    // 3. Validate Delivery Address
    if (
      !shipping_address ||
      !shipping_address.address_line1?.trim() ||
      !shipping_address.city?.trim() ||
      !shipping_address.postal_code?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          code: 'ADDRESS_REQUIRED',
          message: 'Complete delivery address including street, city, and 6-digit PIN code is required.',
        },
        { status: 400 }
      );
    }

    // 4. Validate Items Array
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'EMPTY_CART',
          message: 'Your shopping bag is empty. Please add garments before checking out.',
        },
        { status: 400 }
      );
    }

    for (const item of items) {
      if (!item.variant_id) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_ITEM',
            message: 'Each item must specify a valid size variant ID.',
          },
          { status: 400 }
        );
      }
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          {
            success: false,
            code: 'INVALID_QUANTITY',
            message: 'Item quantity must be a positive integer.',
          },
          { status: 400 }
        );
      }
    }

    // 5. Check if Direct UPI is enabled by administrator
    const upiConfig = await getDirectUpiSettings();
    if (!upiConfig.is_enabled) {
      return NextResponse.json(
        {
          success: false,
          code: 'UPI_DISABLED',
          message: 'Direct UPI payment is temporarily paused by store administration. Please select Cash on Delivery.',
        },
        { status: 403 }
      );
    }

    // 6. Calculate server-side delivery charge: strictly ₹99 (9900 paise) per garment unit
    const totalUnits = items.reduce(
      (sum: number, i: any) => sum + (parseInt(i.quantity, 10) || 1),
      0
    );
    const deliveryCharge = totalUnits * 9900;

    // 7. Generate standard order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `WLC-${dateStr}-${randSuffix}`;

    // 8. Atomic order creation with inventory lock via SECURITY DEFINER PostgreSQL procedure
    const { data: rpcResult, error: rpcError } = await supabase.rpc('create_direct_upi_order', {
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
      p_notes: typeof notes === 'string' ? notes.trim() : '',
      p_order_number: orderNumber,
      p_idempotency_key: idempotency_key ? String(idempotency_key).trim() : null,
    });

    if (rpcError) {
      console.error(`[${requestId}] Direct UPI create_direct_upi_order RPC error:`, rpcError);
      const isStockIssue = rpcError.message?.toLowerCase().includes('stock') || rpcError.message?.toLowerCase().includes('insufficient');
      return NextResponse.json(
        {
          success: false,
          code: isStockIssue ? 'INSUFFICIENT_STOCK' : 'ORDER_CREATION_FAILED',
          message: rpcError.message || 'Could not place order due to inventory lock. Please check garment availability.',
        },
        { status: 400 }
      );
    }

    if (!rpcResult || !rpcResult.order_id || !rpcResult.order_number) {
      console.error(`[${requestId}] Direct UPI unexpected RPC result:`, rpcResult);
      return NextResponse.json(
        {
          success: false,
          code: 'ORDER_CREATION_FAILED',
          message: 'Could not retrieve confirmed order totals. Please try again.',
        },
        { status: 500 }
      );
    }

    // 9. Generate immutable NPCI-compliant UPI Payment URI & Dynamic Vector QR Code
    const totalAmountPaise = Number(rpcResult.total_amount);
    const upiUri = buildUpiUri({
      upiId: upiConfig.receiving_upi_id,
      payeeName: upiConfig.payee_name,
      amountPaise: totalAmountPaise,
      orderNumber: rpcResult.order_number,
    });
    const qrDataUrl = await generateQrDataUrl(upiUri);

    return NextResponse.json({
      success: true,
      order_id: rpcResult.order_id,
      order_number: rpcResult.order_number,
      total_amount: totalAmountPaise,
      subtotal: Number(rpcResult.subtotal),
      delivery_charge: Number(rpcResult.delivery_charge),
      discount_total: Number(rpcResult.discount_total || 0),
      upi_uri: upiUri,
      qr_data_url: qrDataUrl,
      upi_id: upiConfig.receiving_upi_id,
      payee_name: upiConfig.payee_name,
      payment_instructions: upiConfig.payment_instructions,
      idempotent_retry: Boolean(rpcResult.already_existed),
    });
  } catch (err: any) {
    console.error(`[${requestId}] Direct UPI payment initialization error:`, err);
    return NextResponse.json(
      {
        success: false,
        code: 'PAYMENT_CREATION_FAILED',
        message: 'Unable to initialize direct UPI payment session. Your order has not been placed.',
      },
      { status: 500 }
    );
  }
}
