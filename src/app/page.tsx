import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Flame, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroCarousel from '@/components/home/HeroCarousel';
import ProductGrid from '@/components/product/ProductGrid';
import { createClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient();

  // Fetch published products with images and variants
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

  const products: Product[] = (rawProducts as any[]) || [];

  // Categorize or filter products
  const featuredProducts = products.filter((p) => p.is_featured);
  const newArrivals = products.filter((p) => p.is_new_arrival);
  const bestSellers = products.filter((p) => p.is_best_seller);
  const offerProducts = products.filter((p) => p.is_offer_eligible && p.compare_at_price && p.compare_at_price > p.base_price);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* A & B. Announcement bar & Header */}
      <Header />

      <main className="flex-1">
        {/* C. Campaign Hero */}
        <HeroCarousel />

        {/* D. Shop by Category */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center mb-12">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
              Curated Monoliths
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black">
              Shop by Category
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
            {/* Category 1: Sweatshirts */}
            <div className="group relative overflow-hidden bg-[#F7F7F7] border border-[#E5E5E5] aspect-4/3 flex flex-col justify-end p-6 sm:p-10">
              <div className="absolute inset-0">
                <Image
                  src="/images/hero-sweatshirt-sale.png"
                  alt="Premium Sweatshirts"
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="relative z-10 text-white">
                <span className="text-[10px] uppercase tracking-widest text-neutral-300">Edition 01</span>
                <h3 className="text-xl sm:text-3xl font-serif uppercase tracking-wider my-2">
                  Premium Sweatshirts
                </h3>
                <p className="text-xs text-neutral-300 max-w-sm mb-4 line-clamp-2">
                  Ultra-heavyweight cotton fleece engineered with architectural silhouettes for everyday permanence.
                </p>
                <Link
                  href="/collections/sweatshirts"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold bg-white text-black px-5 py-3 hover:bg-neutral-200 transition"
                >
                  Explore Sweatshirts <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Category 2: Jackets */}
            <div className="group relative overflow-hidden bg-[#F7F7F7] border border-[#E5E5E5] aspect-4/3 flex flex-col justify-end p-6 sm:p-10">
              <div className="absolute inset-0">
                <Image
                  src="/images/hero-jacket-sale.png"
                  alt="Premium Jackets"
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>

              <div className="relative z-10 text-white">
                <span className="text-[10px] uppercase tracking-widest text-neutral-300">Edition 02</span>
                <h3 className="text-xl sm:text-3xl font-serif uppercase tracking-wider my-2">
                  Premium Jackets
                </h3>
                <p className="text-xs text-neutral-300 max-w-sm mb-4 line-clamp-2">
                  Tactile outerwear combining thermal insulation with austere editorial tailoring.
                </p>
                <Link
                  href="/collections/jackets"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold bg-white text-black px-5 py-3 hover:bg-neutral-200 transition"
                >
                  Explore Jackets <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* E. Featured Products */}
        <section className="bg-[#F7F7F7] py-16 sm:py-24 border-y border-[#E5E5E5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E5E5E5] gap-4">
              <div>
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                  Hand-Selected
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                  Featured Collection
                </h2>
              </div>
              <Link
                href="/collections"
                className="text-xs uppercase tracking-widest font-semibold text-black hover:opacity-60 transition inline-flex items-center gap-1.5"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <ProductGrid
              products={featuredProducts.length > 0 ? featuredProducts : products.slice(0, 4)}
              emptyMessage="Products are currently being curated in the admin panel. Published items will appear here."
            />
          </div>
        </section>

        {/* F. New Arrivals */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E5E5E5] gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-black mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold">Latest Release</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                New Arrivals
              </h2>
            </div>
            <Link
              href="/collections?sort=newest"
              className="text-xs uppercase tracking-widest font-semibold text-black hover:opacity-60 transition inline-flex items-center gap-1.5"
            >
              See All New <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ProductGrid
            products={newArrivals.length > 0 ? newArrivals : products.slice(0, 4)}
            emptyMessage="New season arrivals will appear here once published from the admin panel."
          />
        </section>

        {/* G. Best Sellers (if any designated or data exists) */}
        {bestSellers.length > 0 && (
          <section className="bg-white py-16 sm:py-24 border-t border-[#E5E5E5]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-black" />
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold">
                  Most Coveted
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black mb-10">
                Best Sellers
              </h2>
              <ProductGrid products={bestSellers} />
            </div>
          </section>
        )}

        {/* H. Active Offers */}
        {offerProducts.length > 0 && (
          <section className="bg-[#F7F7F7] py-16 sm:py-24 border-t border-[#E5E5E5]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E5E5E5] gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-black mb-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span className="text-[10px] sm:text-xs uppercase tracking-widest font-semibold">Limited Campaign</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                    Winter Offers
                  </h2>
                </div>
                <Link
                  href="/offers"
                  className="text-xs uppercase tracking-widest font-semibold text-black hover:opacity-60 transition inline-flex items-center gap-1.5"
                >
                  View All Offers <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <ProductGrid products={offerProducts} />
            </div>
          </section>
        )}

        {/* I. Brand Statement */}
        <section className="border-t border-[#E5E5E5] bg-black text-white py-24 sm:py-32 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block">
              White Label Clothing
            </span>
            <blockquote className="text-2xl sm:text-4xl md:text-5xl font-serif tracking-tight leading-tight italic">
              “More than just a label. Made to be remembered.”
            </blockquote>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed pt-2">
              Designed in relentless pursuit of silhouette, proportion, and texture. 
              Our outerwear is tailored for the confident aesthetic mind that speaks through absence of color and uncompromising presence.
            </p>
            <div className="pt-4">
              <Link
                href="/about"
                className="inline-block px-8 py-3.5 bg-white text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-200 transition"
              >
                Read Our Story
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* J. Footer */}
      <Footer />
    </div>
  );
}
