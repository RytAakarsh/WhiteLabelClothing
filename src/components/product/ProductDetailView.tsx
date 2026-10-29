'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, ProductVariant } from '@/lib/types';
import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';
import { useCart } from '@/lib/context/CartContext';
import { Check, ShieldCheck, Truck, RefreshCw, ShoppingBag, ArrowRight } from 'lucide-react';
import ProductGrid from './ProductGrid';

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailView({ product, relatedProducts }: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();

  // Images setup
  const images = (product.images && product.images.length > 0)
    ? product.images.sort((a, b) => a.sort_order - b.sort_order)
    : [{ id: 'default', storage_path: '/images/brand-logo.png', is_primary: true }];

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variants and size selection
  const variants = product.variants?.filter((v) => v.is_active) || [];
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.find((v) => v.stock_quantity > 0) || variants[0] || null
  );

  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeImage = images[activeImageIndex]?.storage_path || '/images/brand-logo.png';
  const currentPrice = (product.base_price || 0) + (selectedVariant?.price_adjustment || 0);
  const discountPercent = calculateDiscountPercentage(currentPrice, product.compare_at_price);

  const isOutOfStock = !selectedVariant || selectedVariant.stock_quantity <= 0;
  const maxAvailable = selectedVariant?.stock_quantity ?? 0;

  const handleAddToCart = () => {
    if (!selectedVariant) {
      setErrorMsg('Please select a size to continue.');
      return;
    }
    if (selectedVariant.stock_quantity <= 0) {
      setErrorMsg('This size is currently sold out.');
      return;
    }

    setErrorMsg(null);
    addItem({
      variant_id: selectedVariant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      size: selectedVariant.size,
      sku: selectedVariant.sku,
      price: currentPrice,
      compare_at_price: product.compare_at_price,
      image: activeImage,
      max_stock: selectedVariant.stock_quantity,
    }, quantity);

    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 3000);
  };

  const handleBuyNow = () => {
    if (!selectedVariant) {
      setErrorMsg('Please select a size to proceed to checkout.');
      return;
    }
    if (selectedVariant.stock_quantity <= 0) {
      setErrorMsg('This size is currently sold out.');
      return;
    }

    setErrorMsg(null);
    addItem({
      variant_id: selectedVariant.id,
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      size: selectedVariant.size,
      sku: selectedVariant.sku,
      price: currentPrice,
      compare_at_price: product.compare_at_price,
      image: activeImage,
      max_stock: selectedVariant.stock_quantity,
    }, quantity);

    router.push('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-8 text-xs uppercase tracking-widest text-neutral-400">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="hover:text-black transition">Home</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/collections" className="hover:text-black transition">Collections</Link>
          </li>
          {product.category && (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/collections/${product.category.slug}`}
                  className="hover:text-black transition"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden="true">/</li>
          <li className="text-black font-semibold truncate max-w-[200px]" aria-current="page">
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Product Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left Column: Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse md:flex-row gap-4">
          {/* Thumbnails (desktop & tablet) */}
          {images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto max-h-[600px] scrollbar-none">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 bg-[#F7F7F7] border transition ${
                    activeImageIndex === idx ? 'border-black ring-1 ring-black' : 'border-[#E5E5E5] hover:border-neutral-400'
                  }`}
                  aria-label={`View image ${idx + 1}`}
                >
                  <Image
                    src={img.storage_path}
                    alt={`${product.name} thumbnail ${idx + 1}`}
                    fill
                    className="object-contain p-1"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Main Display Image */}
          <div className="relative flex-1 aspect-3/4 bg-[#F7F7F7] border border-[#E5E5E5] overflow-hidden">
            <Image
              src={activeImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-contain p-4 transition-all duration-300"
            />
            {discountPercent > 0 && (
              <span className="absolute top-4 left-4 bg-black text-white text-xs font-semibold tracking-wider uppercase px-3 py-1">
                {discountPercent}% OFF
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Information & Actions */}
        <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
          <div>
            {product.category && (
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
                {product.category.name}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
              {product.name}
            </h1>
            {product.sku && (
              <p className="text-[11px] uppercase tracking-widest text-neutral-400 mt-1">
                SKU: {selectedVariant?.sku || product.sku}
              </p>
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3 pb-4 border-b border-[#E5E5E5]">
            <span className="text-2xl font-semibold text-black">
              {formatPrice(currentPrice)}
            </span>
            {product.compare_at_price && product.compare_at_price > currentPrice && (
              <span className="text-base text-neutral-400 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
            <span className="text-xs text-neutral-500 font-medium">
              Inclusive of all taxes
            </span>
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              {product.short_description}
            </p>
          )}

          {/* Size Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-black">
                Select Size
              </span>
              {selectedVariant && (
                <span className={`text-[11px] font-medium uppercase tracking-wider ${
                  selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 3
                    ? 'text-amber-700'
                    : selectedVariant.stock_quantity > 0
                    ? 'text-emerald-700'
                    : 'text-neutral-400'
                }`}>
                  {selectedVariant.stock_quantity > 0 && selectedVariant.stock_quantity <= 3
                    ? `Only ${selectedVariant.stock_quantity} Left`
                    : selectedVariant.stock_quantity > 0
                    ? 'In Stock'
                    : 'Sold Out'}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {variants.map((variant) => {
                const isSelected = selectedVariant?.id === variant.id;
                const isSoldOut = variant.stock_quantity <= 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => {
                      setSelectedVariant(variant);
                      setErrorMsg(null);
                      setQuantity(1);
                    }}
                    className={`min-w-12 h-11 px-4 text-xs font-semibold uppercase tracking-wider border transition flex items-center justify-center ${
                      isSelected
                        ? 'bg-black text-white border-black ring-1 ring-black'
                        : isSoldOut
                        ? 'bg-[#F7F7F7] text-neutral-300 border-[#E5E5E5] line-through cursor-not-allowed'
                        : 'bg-white text-black border-[#E5E5E5] hover:border-black'
                    }`}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-black block mb-2">
                Quantity
              </span>
              <div className="inline-flex items-center border border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 text-black hover:bg-[#F7F7F7] transition"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="px-4 text-xs font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                  className="px-3.5 py-2 text-black hover:bg-[#F7F7F7] transition"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <p className="text-xs text-red-600 tracking-wide font-medium">
              {errorMsg}
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAddToCart}
              className={`w-full py-4 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition ${
                isOutOfStock
                  ? 'bg-neutral-300 text-neutral-500 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-neutral-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}</span>
            </button>

            {!isOutOfStock && (
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-4 bg-white text-black border border-black text-xs font-semibold uppercase tracking-widest hover:bg-neutral-100 transition flex items-center justify-center gap-2"
              >
                <span>Buy It Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {addedMessage && (
              <div className="p-3 bg-neutral-100 border border-neutral-300 text-xs text-black flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <Check className="w-4 h-4 text-emerald-600" /> Added to your shopping bag
                </span>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="underline font-semibold uppercase tracking-wider text-[11px]"
                >
                  View Bag
                </button>
              </div>
            )}
          </div>

          {/* Full Description */}
          {product.description && (
            <div className="pt-6 border-t border-[#E5E5E5] space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black">
                Description & Craftsmanship
              </h3>
              <div className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </div>
            </div>
          )}

          {/* Brand Assurances */}
          <div className="pt-6 border-t border-[#E5E5E5] space-y-3 text-xs text-neutral-500">
            <div className="flex items-center gap-3">
              <Truck className="w-4 h-4 text-black flex-shrink-0" />
              <span>Complimentary shipping on orders above ₹2,999 across India</span>
            </div>
            <div className="flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-black flex-shrink-0" />
              <span>Complimentary 7-day hassle-free exchange & returns</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-black flex-shrink-0" />
              <span>100% Genuine White Label authentic garment with warranty</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section className="mt-20 sm:mt-28 pt-12 border-t border-[#E5E5E5]">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
              Curated Complements
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
              You May Also Admire
            </h2>
          </div>
          <ProductGrid products={relatedProducts} />
        </section>
      )}
    </div>
  );
}
