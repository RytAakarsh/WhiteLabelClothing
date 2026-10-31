import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PAYLOAD',
          message: 'Malformed request payload.',
        },
        { status: 400 }
      );
    }

    const { code, subtotal, items = [] } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json(
        {
          success: false,
          code: 'CODE_REQUIRED',
          message: 'Please enter a coupon code.',
        },
        { status: 400 }
      );
    }

    const numericSubtotal = parseInt(subtotal, 10);
    if (isNaN(numericSubtotal) || numericSubtotal <= 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_SUBTOTAL',
          message: 'Cart subtotal must be greater than zero.',
        },
        { status: 400 }
      );
    }

    // Call atomic RPC
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('validate_coupon_rpc', {
      p_code: code.trim().toUpperCase(),
      p_subtotal: numericSubtotal,
      p_user_id: user?.id || null,
      p_items: Array.isArray(items) ? items : [],
    });

    if (rpcErr) {
      console.error('validate_coupon_rpc error:', rpcErr);
      return NextResponse.json(
        {
          success: false,
          code: 'VALIDATION_FAILED',
          message: 'Could not validate coupon at this time. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!rpcResult || !rpcResult.success) {
      return NextResponse.json(
        {
          success: false,
          code: rpcResult?.code || 'INVALID_COUPON',
          message: rpcResult?.message || 'Invalid or inapplicable coupon code.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      coupon: {
        id: rpcResult.coupon_id,
        code: rpcResult.code,
        description: rpcResult.description,
        discount_type: rpcResult.discount_type,
        discount_value: rpcResult.discount_value,
        discount_paise: Number(rpcResult.discount_paise),
        max_discount_paise: rpcResult.max_discount_paise ? Number(rpcResult.max_discount_paise) : null,
        minimum_order_paise: Number(rpcResult.minimum_order_paise),
        free_shipping: Boolean(rpcResult.free_shipping),
      },
      message: rpcResult.message,
    });
  } catch (err: any) {
    console.error('Error in coupon validation route:', err);
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error validating coupon.',
      },
      { status: 500 }
    );
  }
}
