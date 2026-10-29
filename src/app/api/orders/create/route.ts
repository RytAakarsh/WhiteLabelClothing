import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      delivery_charge = 0,
      notes = '',
      payment_method = 'cod',
    } = body;

    // Basic Validation
    if (!customer_name || !customer_email || !customer_phone) {
      return NextResponse.json({ error: 'Customer contact details are required.' }, { status: 400 });
    }

    if (!shipping_address || !shipping_address.address_line1 || !shipping_address.city || !shipping_address.postal_code) {
      return NextResponse.json({ error: 'A complete delivery address is required.' }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Your shopping bag is empty.' }, { status: 400 });
    }

    // Generate unique order number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `WLC-${dateStr}-${randSuffix}`;
    const adminClient = createAdminClient();

    // Demo Safeguard: Check if any item belongs to a demonstration product
    const variantIds = items.map((i: any) => i.variant_id);
    const { data: variantsWithProducts } = await adminClient
      .from('product_variants')
      .select('id, products(name, is_demo)')
      .in('id', variantIds);

    const hasDemoItem = variantsWithProducts?.some((v: any) => v.products?.is_demo === true);
    if (hasDemoItem) {
      return NextResponse.json(
        { error: 'Demonstration catalog items cannot be purchased. Live checkout will be enabled when physical production inventory is formally released.' },
        { status: 400 }
      );
    }

    // Call atomic PostgreSQL function create_order_with_inventory
    const { data: orderId, error: rpcError } = await adminClient.rpc('create_order_with_inventory', {
      p_user_id: user?.id || null,
      p_customer_name: customer_name.trim(),
      p_customer_email: customer_email.trim(),
      p_customer_phone: customer_phone.trim(),
      p_shipping_address: shipping_address,
      p_items: items.map((i: any) => ({
        variant_id: i.variant_id,
        quantity: parseInt(i.quantity, 10),
      })),
      p_delivery_charge: delivery_charge,
      p_notes: notes.trim(),
      p_order_number: orderNumber,
    });

    if (rpcError) {
      console.error('Order creation RPC error:', rpcError);
      return NextResponse.json({ error: rpcError.message || 'Failed to place order due to inventory lock.' }, { status: 400 });
    }

    // Record payment placeholder
    await adminClient.from('payments').insert({
      order_id: orderId,
      provider: payment_method,
      amount: 0, // updated after order subtotal
      status: payment_method === 'cod' ? 'pending' : 'pending',
    });

    return NextResponse.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
    });
  } catch (err: any) {
    console.error('Server order error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error processing order.' }, { status: 500 });
  }
}
