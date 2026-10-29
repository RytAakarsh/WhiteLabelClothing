import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CollectionBrowser from '@/components/product/CollectionBrowser';
import { createClient } from '@/lib/supabase/server';
import { Product, Category } from '@/lib/types';

export const metadata = {
  title: 'Premium Sweatshirts | White Label Clothing',
  description: 'Ultra-luxe heavyweight cotton fleece sweatshirts engineered for enduring silhouette and supreme comfort.',
};

export default async function SweatshirtsCollectionPage() {
  const supabase = await createClient();

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'sweatshirts')
    .maybeSingle();

  const { data: rawProducts } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('status', 'published')
    .eq('categories.slug', 'sweatshirts')
    .order('sort_order', { ascending: true });

  const category: Category = (rawCategories as any) || {
    id: 'c1111111-1111-1111-1111-111111111111',
    name: 'Premium Sweatshirts',
    slug: 'sweatshirts',
    description: 'Ultra-heavyweight cotton fleece engineered with architectural silhouettes for everyday permanence.',
  };

  const products: Product[] = ((rawProducts as any[]) || []).filter(
    (p) => p.category?.slug === 'sweatshirts' || p.category_id === category.id
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CollectionBrowser
          initialProducts={products}
          categories={[category]}
          currentCategorySlug="sweatshirts"
          collectionTitle="Premium Sweatshirts"
          collectionDescription="Architectural fleece silhouettes. Engineered with French terry and heavyweight brushed cotton in pure monochromatic tones."
        />
      </main>
      <Footer />
    </div>
  );
}
