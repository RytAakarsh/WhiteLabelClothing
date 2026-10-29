import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CollectionBrowser from '@/components/product/CollectionBrowser';
import { createClient } from '@/lib/supabase/server';
import { Product, Category } from '@/lib/types';

export const metadata = {
  title: 'All Collections | White Label Clothing',
  description: 'Explore the complete archive of luxury heavyweight sweatshirts and architectural outerwear.',
};

export default async function CollectionsPage() {
  const supabase = await createClient();

  // Fetch all active categories
  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // Fetch all published products
  const { data: rawProducts } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  const categories: Category[] = (rawCategories as any[]) || [];
  const products: Product[] = (rawProducts as any[]) || [];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CollectionBrowser
          initialProducts={products}
          categories={categories}
          collectionTitle="All Collections"
          collectionDescription="Monochromatic luxury engineered with tactile heavyweight fabrics, precise tailoring, and architectural silhouettes."
        />
      </main>
      <Footer />
    </div>
  );
}
