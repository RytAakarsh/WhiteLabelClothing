'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import MobileDrawer from './MobileDrawer';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount, setIsCartOpen } = useCart();
  const { user, isAdmin } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 items-center h-16 sm:h-20">
            {/* Left Column: Mobile Hamburger or Desktop Navigation Links */}
            <div className="flex items-center justify-start">
              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-black hover:opacity-60 transition md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-6 lg:space-x-8">
                <Link
                  href="/collections"
                  className="text-xs font-medium uppercase tracking-widest text-black hover:opacity-50 transition"
                >
                  Collections
                </Link>
                <Link
                  href="/collections/sweatshirts"
                  className="text-xs font-medium uppercase tracking-widest text-black hover:opacity-50 transition"
                >
                  Sweatshirts
                </Link>
                <Link
                  href="/collections/jackets"
                  className="text-xs font-medium uppercase tracking-widest text-black hover:opacity-50 transition"
                >
                  Jackets
                </Link>
                <Link
                  href="/offers"
                  className="text-xs font-medium uppercase tracking-widest text-black hover:opacity-50 transition"
                >
                  Offers
                </Link>
              </nav>
            </div>

            {/* Center Column: Perfectly Centered Prominent Brand Logo */}
            <div className="flex justify-center items-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center py-1 transition hover:opacity-80"
                aria-label="White Label Clothing Home"
              >
                <Image
                  src="/images/brand-logo.png"
                  alt="White Label Clothing"
                  width={455}
                  height={233}
                  priority
                  className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain max-h-16 transition-all"
                />
              </Link>
            </div>

            {/* Right Column: Actions */}
            <div className="flex items-center justify-end space-x-3 sm:space-x-5">
              <Link
                href="/search"
                className="p-2 text-black hover:opacity-60 transition"
                aria-label="Search catalog"
              >
                <Search className="w-5 h-5 stroke-[1.5]" />
              </Link>

              <Link
                href={user ? (isAdmin ? '/admin-main/dashboard' : '/account') : '/login'}
                className="p-2 text-black hover:opacity-60 transition hidden sm:block"
                aria-label="Account"
              >
                <User className="w-5 h-5 stroke-[1.5]" />
              </Link>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="p-2 text-black hover:opacity-60 transition relative flex items-center"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-medium">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
