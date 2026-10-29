'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';

export default function ProductCard({ product }: { product: Product }) {
  const primaryImage = product.images?.find((img) => img.is_primary)?.storage_path ||
    product.images?.[0]?.storage_path ||
    '/images/brand-logo.png';

  const discountPercent = calculateDiscountPercentage(product.base_price, product.compare_at_price);

  const availableSizes = product.variants
    ?.filter((v) => v.is_active && v.stock_quantity > 0)
    .map((v) => v.size) || [];

  const totalStock = product.variants?.reduce((sum, v) => sum + v.stock_quantity, 0) ?? 0;
  const isOutOfStock = totalStock <= 0;

  return (
    <div className="group flex flex-col bg-white">
      {/* Product Image Container */}
      <Link
        href={`/product/${product.slug}`}
        className="relative w-full aspect-3/4 bg-[#F7F7F7] overflow-hidden border border-[#E5E5E5] block"
      >
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
        />

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.is_demo && (
            <span className="bg-neutral-900 text-white text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5">
              DEMO ITEM
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-black text-white text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-2 py-1">
              {discountPercent}% OFF
            </span>
          )}
          {product.is_new_arrival && (
            <span className="bg-white text-black border border-black text-[9px] sm:text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5">
              NEW
            </span>
          )}
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-2xs flex items-center justify-center">
            <span className="text-xs font-semibold uppercase tracking-widest bg-black text-white px-3 py-1.5">
              Sold Out
            </span>
          </div>
        )}
      </Link>

      {/* Product Details */}
      <div className="pt-3 pb-1 flex flex-col flex-1">
        {/* Available Sizes preview */}
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
          {availableSizes.length > 0 ? (
            <span>Sizes: {availableSizes.join(' · ')}</span>
          ) : (
            <span>Out of Stock</span>
          )}
        </div>

        {/* Title */}
        <Link
          href={`/product/${product.slug}`}
          className="text-xs sm:text-sm font-medium text-black group-hover:underline line-clamp-2 leading-snug"
        >
          {product.name}
        </Link>

        {/* Prices */}
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-xs sm:text-sm font-semibold text-black">
            {formatPrice(product.base_price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.base_price && (
            <span className="text-[11px] sm:text-xs text-neutral-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
