'use client';

import React, { useState, useMemo } from 'react';
import { Product, Category } from '@/lib/types';
import ProductCard from './ProductCard';
import { SlidersHorizontal, Search, ArrowUpDown, X } from 'lucide-react';

interface CollectionBrowserProps {
  initialProducts: Product[];
  categories: Category[];
  currentCategorySlug?: string;
  collectionTitle: string;
  collectionDescription?: string;
}

export default function CollectionBrowser({
  initialProducts,
  categories,
  currentCategorySlug,
  collectionTitle,
  collectionDescription,
}: CollectionBrowserProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategorySlug || 'all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);

  // Available unique sizes in current product set
  const allSizes = useMemo(() => {
    const set = new Set<string>();
    initialProducts.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.is_active && v.stock_quantity > 0) set.add(v.size);
      });
    });
    return Array.from(set).sort();
  }, [initialProducts]);

  // Filtered & Sorted products
  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      // Category filter
      if (selectedCategory !== 'all') {
        if (product.category?.slug !== selectedCategory) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesSku = product.sku?.toLowerCase().includes(query) ?? false;
        const matchesDesc = product.short_description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesSku && !matchesDesc) return false;
      }

      // Size filter
      if (selectedSize !== 'all') {
        const hasSize = product.variants?.some(
          (v) => v.size === selectedSize && v.is_active && v.stock_quantity > 0
        );
        if (!hasSize) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-low') {
        return a.base_price - b.base_price;
      }
      if (sortBy === 'price-high') {
        return b.base_price - a.base_price;
      }
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.sort_order - b.sort_order;
    });
  }, [initialProducts, selectedCategory, searchQuery, selectedSize, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Editorial Page Header */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
          White Label Editions
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif uppercase tracking-wider text-black mb-4">
          {collectionTitle}
        </h1>
        {collectionDescription && (
          <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed font-sans">
            {collectionDescription}
          </p>
        )}
      </div>

      {/* Control Bar: Search, Category pills, Sorting, and Filters */}
      <div className="border-y border-[#E5E5E5] py-4 mb-8 sm:mb-12 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category switcher if viewing all collections */}
        {!currentCategorySlug && (
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 text-xs uppercase tracking-widest font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-black text-white'
                  : 'bg-[#F7F7F7] text-black hover:bg-neutral-200'
              }`}
            >
              All Items ({initialProducts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 text-xs uppercase tracking-widest font-medium whitespace-nowrap transition ${
                  selectedCategory === cat.slug
                    ? 'bg-black text-white'
                    : 'bg-[#F7F7F7] text-black hover:bg-neutral-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search within collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort & Size Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Size Filter Dropdown */}
          {allSizes.length > 0 && (
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="py-2 px-3 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider focus:outline-hidden focus:border-black cursor-pointer"
            >
              <option value="all">All Sizes</option>
              {allSizes.map((s) => (
                <option key={s} value={s}>
                  Size {s}
                </option>
              ))}
            </select>
          )}

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="py-2 px-3 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider focus:outline-hidden focus:border-black cursor-pointer"
            >
              <option value="featured">Featured Order</option>
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6 flex justify-between items-center text-xs text-neutral-500 uppercase tracking-widest">
        <span>Showing {filteredProducts.length} Results</span>
        {(searchQuery || selectedSize !== 'all' || selectedCategory !== (currentCategorySlug || 'all')) && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSize('all');
              setSelectedCategory(currentCategorySlug || 'all');
            }}
            className="text-black underline hover:opacity-60"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="py-20 text-center max-w-md mx-auto border border-dashed border-[#E5E5E5] bg-[#F7F7F7]">
          <p className="text-base font-serif uppercase tracking-wider mb-2">No Matching Products Found</p>
          <p className="text-xs text-neutral-500 mb-6">
            Try adjusting your search query, clearing size filters, or exploring another collection.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSize('all');
              setSelectedCategory('all');
            }}
            className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
