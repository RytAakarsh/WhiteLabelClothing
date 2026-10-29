import React from 'react';
import ProductForm from '@/components/admin/ProductForm';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export default async function NewProductPage() {
  const adminClient = createAdminClient();

  const { data: rawCategories } = await adminClient
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categories = rawCategories || [];

  return <ProductForm categories={categories as any} />;
}
