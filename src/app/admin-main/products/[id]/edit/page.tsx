import React from 'react';
import { notFound } from 'next/navigation';
import ProductForm from '@/components/admin/ProductForm';
import { verifyAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export const revalidate = 0;

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;
  const authResult = await verifyAdminSession();
  const client = authResult?.client || createAdminClient();

  const { data: product } = await client
    .from('products')
    .select(`
      *,
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  const { data: rawCategories } = await client
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true });

  const categories = rawCategories || [];

  return (
    <ProductForm
      initialProduct={product}
      categories={categories as any}
    />
  );
}
