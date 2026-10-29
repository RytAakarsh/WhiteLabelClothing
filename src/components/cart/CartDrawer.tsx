'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { formatPrice } from '@/lib/utils';

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeItem, subtotal, itemCount } = useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isCartOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-300"
        onClick={() => setIsCartOpen(false)}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-heading"
          className="w-screen max-w-md bg-white border-l border-[#E5E5E5] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#E5E5E5]">
            <h2 id="cart-drawer-heading" className="text-xl font-serif tracking-wider uppercase">
              Shopping Bag ({itemCount})
            </h2>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-black hover:opacity-60 transition"
              aria-label="Close cart drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <ShoppingBag className="w-12 h-12 text-[#E5E5E5] stroke-1 mb-4" />
                <p className="text-lg font-serif mb-2">Your Bag is Empty</p>
                <p className="text-xs text-neutral-500 uppercase tracking-widest mb-6">
                  Explore our luxury monochrome collection
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.variant_id} className="flex gap-4 pb-6 border-b border-[#E5E5E5]">
                  <div className="relative w-20 h-24 bg-[#F7F7F7] flex-shrink-0 overflow-hidden border border-[#E5E5E5]">
                    <Image
                      src={item.image || '/images/brand-logo.png'}
                      alt={item.product_name}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          href={`/product/${item.product_slug}`}
                          onClick={() => setIsCartOpen(false)}
                          className="font-medium text-sm hover:underline line-clamp-1"
                        >
                          {item.product_name}
                        </Link>
                        <button
                          onClick={() => removeItem(item.variant_id)}
                          className="text-neutral-400 hover:text-black transition text-xs p-1"
                          aria-label={`Remove ${item.product_name} from bag`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">
                        Size: {item.size}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {formatPrice(item.price)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-[#E5E5E5]">
                        <button
                          onClick={() => updateQuantity(item.variant_id, item.quantity - 1)}
                          className="p-1.5 hover:bg-[#F7F7F7] transition text-black"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-xs font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.variant_id, item.quantity + 1)}
                          className="p-1.5 hover:bg-[#F7F7F7] transition text-black"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <span className="text-xs font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#E5E5E5] bg-[#F7F7F7] space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="uppercase tracking-widest text-xs text-neutral-600">Subtotal</span>
                <span className="text-base font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[11px] text-neutral-500 text-center">
                Taxes and complimentary shipping calculated at checkout
              </p>

              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3.5 bg-black text-white text-xs font-medium uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full py-3 bg-white text-black border border-black text-xs font-medium uppercase tracking-widest flex items-center justify-center hover:bg-neutral-100 transition"
                >
                  View Full Bag
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
