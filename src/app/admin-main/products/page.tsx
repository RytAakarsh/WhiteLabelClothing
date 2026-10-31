import React from 'react';
import ProductManagementTable from '@/components/admin/ProductManagementTable';
import { verifyAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const authResult = await verifyAdminSession();
  const client = authResult?.client || createAdminClient();

  const { data: rawProducts } = await client
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const { data: rawCategories } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const products = rawProducts || [];
  const categories = rawCategories || [];

  return (
    <ProductManagementTable
      initialProducts={products}
      categories={categories as any}
    />
  );
}
