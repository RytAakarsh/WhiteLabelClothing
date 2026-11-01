'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, ProductVariant } from '@/lib/types';
import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';
import { useCart } from '@/lib/context/CartContext';
import { Check, ShieldCheck, Truck, RefreshCw, ShoppingBag, ArrowRight, Ruler, X } from 'lucide-react';
import ProductGrid from './ProductGrid';

const JACKET_MEASUREMENTS: Record<string, { length: string; shoulder: string }> = {
  L: { length: '25 inches', shoulder: '19 inches' },
  XL: { length: '27 inches', shoulder: '20 inches' },
  XXL: { length: '28 inches', shoulder: '22 inches' },
};

const SWEATSHIRT_MEASUREMENTS: Record<string, { length: string; shoulder: string }> = {
  M: { length: '25 inches', shoulder: '18 inches' },
  L: { length: '26 inches', shoulder: '19 inches' },
  XL: { length: '27 inches', shoulder: '20 inches' },
};

interface ProductDetailViewProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetailView({ product, relatedProducts }: ProductDetailViewProps) {
  const router = useRouter();
  const { addItem, setIsCartOpen } = useCart();

  // Category detection for garment measurements
  const categorySlug = (product.category?.slug || '').toLowerCase();
  const categoryName = (product.category?.name || '').toLowerCase();
  const productNameLower = (product.name || '').toLowerCase();

  const isJacket = categorySlug.includes('jacket') || categoryName.includes('jacket') || productNameLower.includes('jacket');
  const isSweatshirt = categorySlug.includes('sweatshirt') || categoryName.includes('sweatshirt') || productNameLower.includes('sweatshirt');

  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

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

  // Selected size garment measurements
  const selectedSizeKey = (selectedVariant?.size || '').trim().toUpperCase();
  const currentMeasurements = isJacket
    ? JACKET_MEASUREMENTS[selectedSizeKey]
    : isSweatshirt
    ? SWEATSHIRT_MEASUREMENTS[selectedSizeKey]
    : null;

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
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-black">
                  Select Size
                </span>
                {(isJacket || isSweatshirt) && (
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium tracking-wider uppercase text-neutral-500 hover:text-black underline underline-offset-4 transition"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Size Guide</span>
                  </button>
                )}
              </div>

              {selectedVariant && (
                <span className={`text-[11px] font-medium uppercase tracking-wider ${
                  selectedVariant.stock_quantity > 0
                    ? 'text-emerald-700'
                    : 'text-neutral-400'
                }`}>
                  {selectedVariant.stock_quantity > 0 ? 'In Stock' : 'Sold Out'}
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
                        ? 'bg-black text-white border-black ring-2 ring-black ring-offset-1 shadow-xs'
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

            {/* Instant Garment Measurements Display */}
            {currentMeasurements && (
              <div className="mt-3.5 p-3 bg-neutral-50 border border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
                  <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
                    <Ruler className="w-3.5 h-3.5 text-black shrink-0" />
                    <span>Garment Measurements ({selectedVariant?.size}):</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-black font-medium tracking-wide">
                    <span>Length: <strong className="font-semibold text-black">{currentMeasurements.length}</strong></span>
                    <span className="text-neutral-300">|</span>
                    <span>Shoulder: <strong className="font-semibold text-black">{currentMeasurements.shoulder}</strong></span>
                  </div>
                </div>
              </div>
            )}
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
          <div className="pt-6 border-t border-[#E5E5E5] space-y-3 text-xs text-neutral-600">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-black shrink-0" />
              <span>Authentic White Label craftsmanship with structured silhouette</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-4 h-4 text-black shrink-0" />
              <span>Engineered heavyweight textiles tailored for enduring form</span>
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

      {/* Luxury Size Guide Modal */}
      {isSizeGuideOpen && (isJacket || isSweatshirt) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setIsSizeGuideOpen(false)}
        >
          <div
            className="bg-white border border-[#E5E5E5] max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-5 right-5 p-1 text-neutral-400 hover:text-black transition"
              aria-label="Close size guide"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="pr-8 mb-6">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                Precision Sizing
              </span>
              <h3 className="text-xl sm:text-2xl font-serif uppercase tracking-wider text-black">
                {isJacket ? 'Jackets' : 'Sweatshirts'} Size Guide
              </h3>
              <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                All measurements are exact garment dimensions in inches. Designed with an architectural, structured drape.
              </p>
            </div>

            {/* Measurements Table */}
            <div className="border border-[#E5E5E5] mb-6 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-neutral-50 border-b border-[#E5E5E5] text-[11px] font-semibold uppercase tracking-wider text-neutral-600">
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Length</th>
                    <th className="py-3 px-4">Shoulder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                  {Object.entries(isJacket ? JACKET_MEASUREMENTS : SWEATSHIRT_MEASUREMENTS).map(([size, measurements]) => {
                    const isCurrent = size === selectedSizeKey;
                    return (
                      <tr
                        key={size}
                        className={`transition ${
                          isCurrent
                            ? 'bg-neutral-100 font-semibold text-black'
                            : 'hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-black">{size}</span>
                            {isCurrent && (
                              <span className="text-[9px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 font-medium">
                                Selected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">{measurements.length}</td>
                        <td className="py-3.5 px-4">{measurements.shoulder}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Measurement Instructions */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 text-xs text-neutral-600 space-y-1.5 mb-6">
              <p className="font-semibold uppercase tracking-wider text-[11px] text-black">
                How to Measure
              </p>
              <ul className="space-y-1 text-[11px] text-neutral-500">
                <li>
                  <strong className="text-neutral-800">Length:</strong> Measured from the high point of the shoulder straight down to the bottom hem.
                </li>
                <li>
                  <strong className="text-neutral-800">Shoulder:</strong> Measured straight across from shoulder seam to shoulder seam.
                </li>
              </ul>
            </div>

            {/* Close CTA */}
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full py-3.5 bg-black text-white text-xs font-semibold uppercase tracking-widest hover:bg-neutral-800 transition"
            >
              Close Size Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
