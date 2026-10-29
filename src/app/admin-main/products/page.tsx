import React from 'react';
import ProductManagementTable from '@/components/admin/ProductManagementTable';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export default async function AdminProductsPage() {
  const adminClient = createAdminClient();

  const { data: rawProducts } = await adminClient
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  const { data: rawCategories } = await adminClient
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
