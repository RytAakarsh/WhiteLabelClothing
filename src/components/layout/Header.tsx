'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, Search, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import AnnouncementBar from './AnnouncementBar';
import MobileDrawer from './MobileDrawer';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount, setIsCartOpen } = useCart();
  const { user, isAdmin } = useAuth();

  return (
    <>
      <AnnouncementBar />
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Mobile Hamburger Menu */}
            <div className="flex items-center md:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-black hover:opacity-60 transition"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center space-x-8">
              <Link
                href="/collections"
                className="text-xs font-medium uppercase tracking-widest text-black hover:opacity-50 transition"
              >
                All Collections
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
                Winter Offers
              </Link>
            </nav>

            {/* Centered Brand Logo */}
            <div className="flex-1 md:flex-initial flex justify-center">
              <Link href="/" className="relative block h-10 w-32 sm:h-12 sm:w-40 transition hover:opacity-80">
                <Image
                  src="/images/brand-logo.png"
                  alt="White Label Clothing"
                  fill
                  sizes="(max-width: 640px) 128px, 160px"
                  className="object-contain"
                  priority
                />
              </Link>
            </div>

            {/* Right Action Icons */}
            <div className="flex items-center space-x-3 sm:space-x-5">
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
