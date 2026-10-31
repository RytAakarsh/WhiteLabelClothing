import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: 'AUTH_REQUIRED',
          message: 'Please sign in to submit your payment reference.',
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

    const { order_id, order_number, utr } = body;

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json(
        {
          success: false,
          code: 'UTR_REQUIRED',
          message: 'Please enter your 12-digit Bank UTR / Reference number from your payment app.',
        },
        { status: 400 }
      );
    }

    const cleanUtr = utr.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanUtr.length < 6 || cleanUtr.length > 25) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_UTR_FORMAT',
          message: 'Invalid UTR format. Bank reference numbers typically consist of 12 alphanumeric characters.',
        },
        { status: 400 }
      );
    }

    const orderRef = order_number?.trim() || order_id?.trim();
    if (!orderRef) {
      return NextResponse.json(
        {
          success: false,
          code: 'ORDER_REQUIRED',
          message: 'Order reference number is required.',
        },
        { status: 400 }
      );
    }

    // Call atomic PostgreSQL procedure
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('submit_customer_utr', {
      p_user_id: user.id,
      p_order_ref: orderRef,
      p_utr: cleanUtr,
    });

    if (rpcErr) {
      console.error('Error invoking submit_customer_utr:', rpcErr);
      return NextResponse.json(
        {
          success: false,
          code: 'SUBMISSION_FAILED',
          message: rpcErr.message || 'Could not record Bank UTR at this time. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!rpcResult?.success) {
      const isDuplicate = rpcResult?.error?.includes('already been verified');
      return NextResponse.json(
        {
          success: false,
          code: isDuplicate ? 'DUPLICATE_UTR' : 'VALIDATION_FAILED',
          message: rpcResult?.error || 'Unable to accept UTR submission.',
        },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: rpcResult.message || 'Your Bank UTR has been submitted for bank verification.',
      already_paid: Boolean(rpcResult.already_paid),
    });
  } catch (err: any) {
    console.error('Error in submit-utr route:', err);
    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: 'Internal server error recording payment reference.',
      },
      { status: 500 }
    );
  }
}
