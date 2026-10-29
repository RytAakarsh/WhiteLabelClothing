import React from 'react';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductDetailView from '@/components/product/ProductDetailView';
import { createClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('name, short_description, product_images(storage_path, is_primary)')
    .eq('slug', slug)
    .maybeSingle();

  if (!product) {
    return {
      title: 'Product Not Found | White Label Clothing',
    };
  }

  const primaryImage = (product as any).product_images?.find((img: any) => img.is_primary)?.storage_path ||
    (product as any).product_images?.[0]?.storage_path ||
    '/images/brand-logo.png';

  return {
    title: `${product.name} | White Label Clothing`,
    description: product.short_description || 'Luxury monochrome silhouette by White Label Clothing.',
    openGraph: {
      title: `${product.name} | White Label Clothing`,
      description: product.short_description || 'Luxury monochrome apparel.',
      images: [{ url: primaryImage }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  // Fetch product with category, variants, and images
  const { data: rawProduct } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (!rawProduct) {
    notFound();
  }

  const product = rawProduct as Product;

  // Fetch related products in same category
  const { data: rawRelated } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('status', 'published')
    .eq('category_id', product.category_id)
    .neq('id', product.id)
    .limit(4);

  const relatedProducts = (rawRelated as any[]) || [];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <ProductDetailView product={product} relatedProducts={relatedProducts} />
      </main>
      <Footer />
    </div>
  );
}
