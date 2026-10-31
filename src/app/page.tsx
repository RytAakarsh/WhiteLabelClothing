import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Sparkles, Flame, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroCarousel from '@/components/home/HeroCarousel';
import ProductGrid from '@/components/product/ProductGrid';
import { createClient } from '@/lib/supabase/server';
import { Product, Category } from '@/lib/types';

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

  // Fetch active categories with cover images
  const { data: rawCategories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const products: Product[] = (rawProducts as any[]) || [];
  const categories: Category[] = (rawCategories as any[]) || [];

  // Categorize or filter products
  const featuredProducts = products.filter((p) => p.is_featured);
  const newArrivals = products.filter((p) => p.is_new_arrival);
  const bestSellers = products.filter((p) => p.is_best_seller);
  const offerProducts = products.filter((p) => p.is_offer_eligible && p.compare_at_price && p.compare_at_price > p.base_price);
  const sweatshirtProducts = products.filter((p) => (p as any).category?.slug === 'sweatshirts');
  const jacketProducts = products.filter((p) => (p as any).category?.slug === 'jackets');

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* 1 & 2. Announcement bar & Header */}
      <Header />

      <main className="flex-1">
        {/* 3. Campaign Hero Carousel */}
        <HeroCarousel />

        {/* 4. Shop by Collection (Dynamic from Categories Database) */}
        {categories.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="text-center mb-10 sm:mb-14">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
                Curated Monoliths
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black">
                Shop by Collection
              </h2>
            </div>

            <div className={`grid grid-cols-1 ${categories.length === 1 ? 'max-w-2xl mx-auto' : 'md:grid-cols-2'} gap-6 lg:gap-10`}>
              {categories.map((cat, idx) => {
                const coverImage = cat.image_path || (idx % 2 === 0 ? '/images/hero-sweatshirt-sale.png' : '/images/hero-jacket-sale.png');
                const editionNumber = String(idx + 1).padStart(2, '0');

                return (
                  <div
                    key={cat.id}
                    className="group relative overflow-hidden bg-[#F7F7F7] border border-[#E5E5E5] aspect-4/3 flex flex-col justify-end p-6 sm:p-10"
                  >
                    <div className="absolute inset-0">
                      <Image
                        src={coverImage}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-700 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    </div>

                    <div className="relative z-10 text-white">
                      <span className="text-[10px] uppercase tracking-widest text-neutral-300 font-mono">
                        Edition {editionNumber}
                      </span>
                      <h3 className="text-xl sm:text-3xl font-serif uppercase tracking-wider my-2">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-neutral-300 max-w-sm mb-4 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                      <Link
                        href={`/collections/${cat.slug}`}
                        className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold bg-white text-black px-5 py-3 hover:bg-neutral-200 transition"
                      >
                        Explore {cat.name} <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Editorial Benefits */}
        <section className="bg-[#F7F7F7] py-14 sm:py-16 border-y border-[#E5E5E5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <div className="space-y-2 border-l-2 border-black pl-4">
                <span className="text-xs font-mono font-bold text-black uppercase tracking-widest block">
                  01 — Curated Collections
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Thoughtfully selected styles for a distinctive wardrobe. Every garment is cut from structural heavyweight textiles.
                </p>
              </div>
              <div className="space-y-2 border-l-2 border-black pl-4">
                <span className="text-xs font-mono font-bold text-black uppercase tracking-widest block">
                  02 — Designed for Everyday Expression
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Contemporary essentials with a refined identity. Monochromatic purity built for comfortable, enduring presence.
                </p>
              </div>
              <div className="space-y-2 border-l-2 border-black pl-4">
                <span className="text-xs font-mono font-bold text-black uppercase tracking-widest block">
                  03 — A Seamless Shopping Experience
                </span>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Discover, select and shop your favourite pieces with ease. Real-time sizing, express dispatch, and dedicated support.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Product Sections or Luxury Empty Curation */}
        {products.length === 0 ? (
          <section className="bg-[#F7F7F7] py-16 sm:py-24 border-y border-[#E5E5E5]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
                Winter 2026 Curation
              </span>
              <h2 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-4">
                The Monolith Collection
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed mb-8">
                Architectural silhouettes engineered in ultra-heavyweight cotton fleece and technical outerwear.
                Our initial catalog of twelve limited designs is currently being prepared for release.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/collections/sweatshirts"
                  className="w-full sm:w-auto px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
                >
                  Explore Sweatshirts
                </Link>
                <Link
                  href="/collections/jackets"
                  className="w-full sm:w-auto px-8 py-3.5 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
                >
                  Explore Jackets
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <>
            {/* 5. Premium Sweatshirts Section */}
            {sweatshirtProducts.length > 0 && (
              <section className="bg-[#F7F7F7] py-16 sm:py-24 border-y border-[#E5E5E5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E5E5E5] gap-4">
                    <div>
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                        Heavyweight Edition
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                        Premium Sweatshirts
                      </h2>
                    </div>
                    <Link
                      href="/collections/sweatshirts"
                      className="text-xs uppercase tracking-widest font-semibold text-black hover:opacity-60 transition inline-flex items-center gap-1.5"
                    >
                      View All Sweatshirts <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <ProductGrid products={sweatshirtProducts.slice(0, 4)} />
                </div>
              </section>
            )}

            {/* 6. Premium Jackets Section */}
            {jacketProducts.length > 0 && (
              <section className="bg-white py-16 sm:py-24 border-b border-[#E5E5E5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E5E5E5] gap-4">
                    <div>
                      <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                        Tactile Outerwear
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                        Premium Jackets
                      </h2>
                    </div>
                    <Link
                      href="/collections/jackets"
                      className="text-xs uppercase tracking-widest font-semibold text-black hover:opacity-60 transition inline-flex items-center gap-1.5"
                    >
                      View All Jackets <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <ProductGrid products={jacketProducts.slice(0, 4)} />
                </div>
              </section>
            )}

            {/* 7. Featured Collection */}
            {featuredProducts.length > 0 && (
              <section className="bg-[#F7F7F7] py-16 sm:py-24 border-b border-[#E5E5E5]">
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
                  <ProductGrid products={featuredProducts.slice(0, 4)} />
                </div>
              </section>
            )}

            {/* 8. New Arrivals */}
            {newArrivals.length > 0 && (
              <section className="bg-white py-16 sm:py-24 border-b border-[#E5E5E5]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  <ProductGrid products={newArrivals.slice(0, 4)} />
                </div>
              </section>
            )}

            {/* Best Sellers (if any) */}
            {bestSellers.length > 0 && (
              <section className="bg-white py-16 sm:py-24 border-b border-[#E5E5E5]">
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

            {/* 9. Active Offers */}
            {offerProducts.length > 0 && (
              <section className="bg-[#F7F7F7] py-16 sm:py-24 border-b border-[#E5E5E5]">
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
                  <ProductGrid products={offerProducts.slice(0, 4)} />
                </div>
              </section>
            )}
          </>
        )}

        {/* 10. Brand Statement */}
        <section className="border-t border-[#E5E5E5] bg-black text-white py-20 sm:py-28 px-4 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block">
              White Label Clothing
            </span>
            <blockquote className="text-2xl sm:text-4xl md:text-5xl font-serif tracking-tight leading-tight italic">
              “Style is not about being noticed. It’s about being remembered.”
            </blockquote>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed pt-2">
              Designed in relentless pursuit of silhouette, proportion, and texture. 
              Our garments are tailored for the confident aesthetic mind that speaks through absence of color and uncompromising presence.
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

      {/* Footer */}
      <Footer />
    </div>
  );
}
