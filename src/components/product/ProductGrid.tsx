import React from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import { PackageOpen, ArrowRight } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  emptyMessage?: string;
  categorySlug?: string;
}

export default function ProductGrid({
  products,
  emptyMessage = 'No products are currently published in this collection.',
  categorySlug,
}: ProductGridProps) {
  if (!products || products.length === 0) {
    return (
      <div className="py-14 px-6 text-center max-w-md mx-auto border border-[#E5E5E5] bg-[#F7F7F7] my-6">
        <PackageOpen className="w-10 h-10 mx-auto text-neutral-400 stroke-1 mb-3" />
        <h3 className="text-sm sm:text-base font-serif uppercase tracking-widest text-black mb-2">
          Collection In Curation
        </h3>
        <p className="text-xs text-neutral-500 leading-relaxed mb-5 max-w-sm mx-auto">
          {emptyMessage}
        </p>
        <div className="flex justify-center">
          <Link
            href="/collections"
            className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition inline-block"
          >
            Explore All Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
