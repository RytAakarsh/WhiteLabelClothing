import React from 'react';
import ProductForm from '@/components/admin/ProductForm';
import { verifyAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

export default async function NewProductPage() {
  const authResult = await verifyAdminSession();
  const client = authResult?.client || createAdminClient();

  const { data: rawCategories } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categories = rawCategories || [];

  return <ProductForm categories={categories as any} />;
}
