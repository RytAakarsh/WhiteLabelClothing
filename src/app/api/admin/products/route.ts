import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth/admin';

export async function POST(request: Request) {
  try {
    const authResult = await verifyAdminSession();
    if (!authResult) {
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

    const client = authResult.client;

    // 1. Insert product
    const { data: product, error: prodError } = await client
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

      const { error: variantError } = await client
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

      const { error: imgError } = await client
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
    const authResult = await verifyAdminSession();
    if (!authResult) {
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

    const client = authResult.client;

    // 1. Update product base info
    const { data: updatedProduct, error: updateError } = await client
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
        await client
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
        await client
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
      await client.from('product_images').delete().eq('product_id', id);

      const imageInserts = images.map((img: any, idx: number) => ({
        product_id: id,
        storage_path: img.storage_path,
        alt_text: img.alt_text || name,
        is_primary: idx === 0 || img.is_primary === true,
        sort_order: idx,
      }));

      await client.from('product_images').insert(imageInserts);
    }

    return NextResponse.json({ success: true, product: updatedProduct });
  } catch (err: any) {
    console.error('Product PUT exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const authResult = await verifyAdminSession();
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required.' }, { status: 400 });
    }

    const client = authResult.client;

    // Check if product is referenced in non-empty historical orders
    const { count } = await client
      .from('order_items')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', id);

    if (count && count > 0) {
      // Safe archival rather than hard delete to preserve historical order references
      await client
        .from('products')
        .update({ status: 'archived', updated_at: new Date().toISOString() })
        .eq('id', id);

      return NextResponse.json({
        success: true,
        message: 'Product is referenced in historical orders and was safely archived.',
      });
    }

    // Explicitly delete child relations to ensure clean hard deletion
    await client.from('product_images').delete().eq('product_id', id);
    await client.from('product_variants').delete().eq('product_id', id);
    await client.from('offer_products').delete().eq('product_id', id);
    await client.from('cart_items').delete().eq('product_id', id);

    // Hard delete product
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err: any) {
    console.error('Product DELETE exception:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
