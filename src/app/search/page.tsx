'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/product/ProductGrid';
import { createClient } from '@/lib/supabase/client';
import { Product } from '@/lib/types';
import { Search, X } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*),
          images:product_images(*)
        `)
        .eq('status', 'published')
        .order('sort_order', { ascending: true });

      if (data) {
        setProducts(data as any);
      }
      setLoading(false);
    }
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q);
    const skuMatch = p.sku?.toLowerCase().includes(q);
    const descMatch = p.short_description?.toLowerCase().includes(q);
    const catMatch = p.category?.name.toLowerCase().includes(q);
    return nameMatch || skuMatch || descMatch || catMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
      <div className="max-w-2xl mx-auto text-center mb-10">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-4">
          Search Archive
        </h1>
        <div className="relative mt-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search silhouettes, sweatshits, jackets, SKUs..."
            className="w-full pl-12 pr-10 py-3.5 bg-[#F7F7F7] border border-[#E5E5E5] text-sm focus:outline-hidden focus:border-black"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex justify-between items-center text-xs text-neutral-500 uppercase tracking-widest">
        <span>{filtered.length} {filtered.length === 1 ? 'Design Found' : 'Designs Found'}</span>
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
          Searching Products...
        </div>
      ) : (
        <ProductGrid
          products={filtered}
          emptyMessage={`No products found matching "${query}". Try searching for "sweatshirt", "jacket", or clearing your search.`}
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<div className="py-20 text-center text-xs uppercase tracking-widest">Loading Search...</div>}>
          <SearchContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
