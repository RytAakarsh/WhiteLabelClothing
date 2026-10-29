'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/context/CartContext';
import { formatPrice } from '@/lib/utils';
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal, itemCount, clearCart } = useCart();

  const freeShippingThreshold = 299900; // ₹2,999 in paise
  const shippingCharge = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 15000; // ₹150 in paise
  const finalTotal = subtotal + shippingCharge;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-2">
          Your Shopping Bag
        </h1>
        <p className="text-xs uppercase tracking-widest text-neutral-500 mb-8 sm:mb-12">
          {itemCount} {itemCount === 1 ? 'Piece' : 'Pieces'} Selected
        </p>

        {items.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto border border-dashed border-[#E5E5E5] bg-[#F7F7F7]">
            <ShoppingBag className="w-12 h-12 mx-auto text-neutral-400 stroke-1 mb-4" />
            <h2 className="text-base font-serif uppercase tracking-widest text-black mb-2">
              Your Bag is Currently Empty
            </h2>
            <p className="text-xs text-neutral-500 mb-6">
              Explore our monochromatic outerwear and heavyweight sweatshirts.
            </p>
            <Link
              href="/collections"
              className="inline-block px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
            >
              Discover Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
            {/* Bag Items Table */}
            <div className="lg:col-span-8 space-y-6">
              {/* Free Shipping Bar */}
              <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5]">
                {amountToFreeShipping > 0 ? (
                  <p className="text-xs text-neutral-700 font-medium">
                    Add <span className="font-semibold text-black">{formatPrice(amountToFreeShipping)}</span> more to qualify for <span className="font-semibold">Complimentary Express Shipping</span>.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-800 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    You have unlocked <span className="font-semibold">Complimentary Express Shipping</span>.
                  </p>
                )}
                <div className="w-full bg-[#E5E5E5] h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-black h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotal / freeShippingThreshold) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E5E5E5] border-t border-b border-[#E5E5E5]">
                {items.map((item) => (
                  <div key={item.variant_id} className="py-6 flex flex-col sm:flex-row gap-4 sm:gap-6 justify-between">
                    <div className="flex gap-4 sm:gap-6">
                      <div className="relative w-24 h-32 bg-[#F7F7F7] border border-[#E5E5E5] flex-shrink-0">
                        <Image
                          src={item.image}
                          alt={item.product_name}
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                      <div className="flex flex-col justify-between">
                        <div>
                          <Link
                            href={`/product/${item.product_slug}`}
                            className="text-sm font-medium hover:underline text-black"
                          >
                            {item.product_name}
                          </Link>
                          <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">
                            Size: {item.size}
                          </p>
                          {item.sku && (
                            <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
                              SKU: {item.sku}
                            </p>
                          )}
                          <p className="text-xs font-semibold mt-2">
                            {formatPrice(item.price)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center border border-[#E5E5E5]">
                            <button
                              onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                              className="p-1.5 text-black hover:bg-[#F7F7F7] transition"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 text-xs font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                              className="p-1.5 text-black hover:bg-[#F7F7F7] transition"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeItem(item.variant_id)}
                            className="text-xs text-neutral-400 hover:text-black transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col justify-between sm:justify-start items-center sm:items-end pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                      <span className="sm:hidden text-xs text-neutral-500 uppercase">Line Total:</span>
                      <span className="text-sm font-semibold text-black">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2">
                <Link
                  href="/collections"
                  className="text-xs uppercase tracking-widest font-semibold hover:underline"
                >
                  ← Continue Shopping
                </Link>
                <button
                  onClick={clearCart}
                  className="text-xs text-neutral-400 hover:text-black underline uppercase tracking-wider"
                >
                  Clear Bag
                </button>
              </div>
            </div>

            {/* Order Summary Card */}
            <div className="lg:col-span-4">
              <div className="bg-[#F7F7F7] border border-[#E5E5E5] p-6 sm:p-8 space-y-6">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-black pb-4 border-b border-[#E5E5E5]">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-neutral-600">
                    <span>Bag Subtotal</span>
                    <span className="font-medium text-black">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>Shipping</span>
                    <span className="font-medium text-black">
                      {shippingCharge === 0 ? 'Complimentary' : formatPrice(shippingCharge)}
                    </span>
                  </div>

                  <div className="flex justify-between text-neutral-600">
                    <span>Estimated Tax</span>
                    <span className="font-medium text-black">Included</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E5E5E5] flex justify-between items-baseline">
                  <span className="text-sm font-semibold uppercase tracking-wider">Estimated Total</span>
                  <span className="text-xl font-bold">{formatPrice(finalTotal)}</span>
                </div>

                <Link
                  href="/checkout"
                  className="w-full py-4 bg-black text-white text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
                  Prices, taxes, and promotional discounts are confirmed during checkout.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
