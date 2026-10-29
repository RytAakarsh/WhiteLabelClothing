import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import { createClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';
import { Tag } from 'lucide-react';

export const metadata = {
  title: 'Winter Offers | White Label Clothing',
  description: 'Exclusive seasonal offers and promotional discounts on premium jackets and heavyweight sweatshirts.',
};

export default async function OffersPage() {
  const supabase = await createClient();

  const { data: rawProducts } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*),
      variants:product_variants(*),
      images:product_images(*)
    `)
    .eq('status', 'published')
    .eq('is_offer_eligible', true)
    .order('sort_order', { ascending: true });

  const products: Product[] = ((rawProducts as any[]) || []).filter(
    (p) => p.compare_at_price && p.compare_at_price > p.base_price
  );

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 bg-black text-white px-3 py-1 text-[10px] uppercase tracking-widest font-semibold mb-3">
            <Tag className="w-3 h-3" />
            <span>Limited Winter Campaign</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif uppercase tracking-wider text-black mb-4">
            Exclusive Offers
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
            Curated pieces from our winter edit featuring limited-time promotional pricing. 
            Discounts are applied directly and verified at checkout.
          </p>
        </div>

        <ProductGrid
          products={products}
          emptyMessage="No promotional offers are active at this moment. Explore our full permanent collection."
        />
      </main>
      <Footer />
    </div>
  );
}
