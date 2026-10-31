import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getDirectUpiSettings } from '@/lib/payments/direct-upi';

export async function GET() {
  try {
    const config = await getDirectUpiSettings();
    return NextResponse.json({ success: true, settings: config });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Verify admin role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return NextResponse.json({ error: 'Forbidden. Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      is_enabled,
      receiving_upi_id,
      payee_name,
      payment_instructions,
      allow_customer_utr,
    } = body;

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user.email || user.id,
    };

    if (is_enabled !== undefined) updates.is_enabled = Boolean(is_enabled);
    if (receiving_upi_id !== undefined && receiving_upi_id.trim()) updates.receiving_upi_id = receiving_upi_id.trim();
    if (payee_name !== undefined && payee_name.trim()) updates.payee_name = payee_name.trim();
    if (payment_instructions !== undefined) updates.payment_instructions = payment_instructions.trim();
    if (allow_customer_utr !== undefined) updates.allow_customer_utr = Boolean(allow_customer_utr);

    const { data, error } = await adminClient
      .from('payment_settings')
      .update(updates)
      .eq('gateway_name', 'direct_upi')
      .select('*')
      .single();

    if (error) {
      console.error('Update payment_settings error:', error);
      return NextResponse.json({ error: 'Failed to update payment settings.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment settings updated successfully.',
      settings: data,
    });
  } catch (err: any) {
    console.error('Save payment settings error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
