import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Check admin helper
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const adminClient = createAdminClient();
  const { data: roleData } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!roleData || roleData.role !== 'admin') return null;
  return user;
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      sku,
      short_description,
      description,
      category_id,
      status = 'draft',
      base_price = 0,
      compare_at_price,
      is_featured = false,
      is_new_arrival = false,
      is_best_seller = false,
      is_offer_eligible = true,
      sort_order = 0,
      variants = [], // Array of { size, sku, stock_quantity, price_adjustment }
      images = [],   // Array of { storage_path, alt_text, is_primary, sort_order }
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Product name and slug are required.' }, { status: 400 });
    }

    if (images.length > 5) {
      return NextResponse.json({ error: 'A maximum of 5 images per product is permitted.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Insert product
    const { data: product, error: prodError } = await adminClient
      .from('products')
      .insert({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        sku: sku?.trim() || null,
        short_description: short_description?.trim() || null,
        description: description?.trim() || null,
        category_id: category_id || null,
        status,
        base_price: Math.max(0, parseInt(base_price, 10) || 0),
        compare_at_price: compare_at_price ? Math.max(0, parseInt(compare_at_price, 10)) : null,
        is_featured: !!is_featured,
        is_new_arrival: !!is_new_arrival,
        is_best_seller: !!is_best_seller,
        is_offer_eligible: !!is_offer_eligible,
        sort_order: parseInt(sort_order, 10) || 0,
      })
      .select()
      .single();

    if (prodError) {
      console.error('Product insert error:', prodError);
      return NextResponse.json({ error: prodError.message }, { status: 400 });
    }

    // 2. Insert variants
    if (variants.length > 0) {
      const variantInserts = variants.map((v: any) => ({
        product_id: product.id,
        size: v.size,
        sku: v.sku?.trim() || `${product.sku || 'WLC'}-${v.size}`,
        stock_quantity: Math.max(0, parseInt(v.stock_quantity, 10) || 0),
        price_adjustment: parseInt(v.price_adjustment, 10) || 0,
        is_active: v.is_active !== undefined ? v.is_active : true,
      }));

      const { error: variantError } = await adminClient
        .from('product_variants')
        .insert(variantInserts);

      if (variantError) {
        console.error('Variant insert error:', variantError);
      }
    }

    // 3. Insert images
    if (images.length > 0) {
      const imageInserts = images.map((img: any, idx: number) => ({
        product_id: product.id,
        storage_path: img.storage_path,
        alt_text: img.alt_text || product.name,
        is_primary: idx === 0 || img.is_primary === true,
        sort_order: idx,
      }));

      const { error: imgError } = await adminClient
        .from('product_images')
        .insert(imageInserts);

      if (imgError) {
        console.error('Image insert error:', imgError);
      }
    }

    return NextResponse.json({ success: true, product });
  } catch (err: any) {
    console.error('Product POST exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      name,
      slug,
      sku,
      short_description,
      description,
      category_id,
      status,
      base_price,
      compare_at_price,
      is_featured,
      is_new_arrival,
      is_best_seller,
      is_offer_eligible,
      sort_order,
      variants = [],
      images = [],
    } = body;

    if (!id || !name || !slug) {
      return NextResponse.json({ error: 'Product ID, name, and slug are required.' }, { status: 400 });
    }

    if (images.length > 5) {
      return NextResponse.json({ error: 'A maximum of 5 images per product is permitted.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Update product base info
    const { data: updatedProduct, error: updateError } = await adminClient
      .from('products')
      .update({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        sku: sku?.trim() || null,
        short_description: short_description?.trim() || null,
        description: description?.trim() || null,
        category_id: category_id || null,
        status,
        base_price: Math.max(0, parseInt(base_price, 10) || 0),
        compare_at_price: compare_at_price ? Math.max(0, parseInt(compare_at_price, 10)) : null,
        is_featured: !!is_featured,
        is_new_arrival: !!is_new_arrival,
        is_best_seller: !!is_best_seller,
        is_offer_eligible: !!is_offer_eligible,
        sort_order: parseInt(sort_order, 10) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // 2. Upsert / update variants
    for (const v of variants) {
      if (v.id) {
        await adminClient
          .from('product_variants')
          .update({
            sku: v.sku?.trim() || null,
            stock_quantity: Math.max(0, parseInt(v.stock_quantity, 10) || 0),
            price_adjustment: parseInt(v.price_adjustment, 10) || 0,
            is_active: v.is_active !== undefined ? v.is_active : true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', v.id);
      } else {
        await adminClient
          .from('product_variants')
          .insert({
            product_id: id,
            size: v.size,
            sku: v.sku?.trim() || null,
            stock_quantity: Math.max(0, parseInt(v.stock_quantity, 10) || 0),
            price_adjustment: parseInt(v.price_adjustment, 10) || 0,
            is_active: v.is_active !== undefined ? v.is_active : true,
          });
      }
    }

    // 3. Replace images if provided
    if (images && images.length > 0) {
      await adminClient.from('product_images').delete().eq('product_id', id);

      const imageInserts = images.map((img: any, idx: number) => ({
        product_id: id,
        storage_path: img.storage_path,
        alt_text: img.alt_text || name,
        is_primary: idx === 0 || img.is_primary === true,
        sort_order: idx,
      }));

      await adminClient.from('product_images').insert(imageInserts);
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (err: any) {
    console.error('Product PUT exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await verifyAdmin();
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if product is in any orders
    const { count } = await adminClient
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);

    if (count && count > 0) {
      // Safe archival rather than hard delete to preserve historical order references
      await adminClient
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Product is referenced in historical orders and was safely archived.',
      });
    }

    // If never ordered, safe to delete
    const { error } = await adminClient.from('products').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err: any) {
    console.error('Product DELETE exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
