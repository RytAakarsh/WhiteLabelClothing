import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CollectionBrowser from '@/components/product/CollectionBrowser';
import { createClient } from '@/lib/supabase/server';
import { Product, Category } from '@/lib/types';

export const metadata = {
  title: 'Premium Jackets | White Label Clothing',
  description: 'Architectural outerwear blending technical insulation with tailored luxury aesthetics.',
};

export default async function JacketsCollectionPage() {
  const supabase = await createClient();

  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', 'jackets')
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
    .order('sort_order', { ascending: true });

  const category: Category = (rawCategories as any) || {
    id: 'c2222222-2222-2222-2222-222222222222',
    name: 'Premium Jackets',
    slug: 'jackets',
    description: 'Tactile outerwear combining thermal insulation with austere editorial tailoring.',
  };

  const products: Product[] = ((rawProducts as any[]) || []).filter(
    (p) => p.category?.slug === 'jackets' || p.category_id === category.id
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <CollectionBrowser
          initialProducts={products}
          categories={[category]}
          currentCategorySlug="jackets"
          collectionTitle="Premium Jackets"
          collectionDescription="Sculpted silhouettes, structured collars, and technical weather-resistant fabrics crafted for enduring presence."
        />
      </main>
      <Footer />
    </div>
  );
}
