'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, Search, User, ShoppingBag, Phone, Mail, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';
import { useCart } from '@/lib/context/CartContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, isAdmin } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'All Collections', href: '/collections' },
    { label: 'Premium Sweatshirts', href: '/collections/sweatshirts' },
    { label: 'Premium Jackets', href: '/collections/jackets' },
    { label: 'New Arrivals', href: '/collections?sort=newest' },
    { label: 'Winter Offers', href: '/offers' },
    { label: 'Brand Story', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-white border-r border-[#E5E5E5] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E5E5E5]">
          <Link href="/" onClick={onClose} className="relative w-28 h-8">
            <Image
              src="/images/brand-logo.png"
              alt="White Label Clothing"
              fill
              className="object-contain"
            />
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-black hover:opacity-60 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Search */}
        <div className="p-4 border-b border-[#E5E5E5] bg-[#F7F7F7]">
          <Link
            href="/search"
            onClick={onClose}
            className="flex items-center gap-3 w-full py-2.5 px-3 bg-white border border-[#E5E5E5] text-xs text-neutral-500 tracking-wider"
          >
            <Search className="w-4 h-4 text-black" />
            <span>Search designs, styles...</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block text-sm font-medium uppercase tracking-widest py-2 border-b border-neutral-100 hover:pl-2 transition-all duration-200"
            >
              {link.label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin-main/dashboard"
              onClick={onClose}
              className="flex items-center justify-between text-xs font-semibold uppercase tracking-widest py-2.5 px-3 bg-black text-white mt-4"
            >
              <span>Admin Dashboard</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-[#E5E5E5] bg-[#F7F7F7] space-y-3">
          <div className="flex items-center justify-between text-xs tracking-wider uppercase font-medium">
            <Link
              href={user ? '/account' : '/login'}
              onClick={onClose}
              className="flex items-center gap-2 hover:opacity-70 transition py-1"
            >
              <User className="w-4 h-4" />
              <span>{user ? 'My Account' : 'Sign In'}</span>
            </Link>

            <button
              onClick={() => {
                onClose();
                setIsCartOpen(true);
              }}
              className="flex items-center gap-2 hover:opacity-70 transition py-1"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag ({itemCount})</span>
            </button>
          </div>

          <div className="pt-3 border-t border-neutral-200 text-[11px] text-neutral-500 space-y-1">
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3 text-black" />
              <span>+91 88518 72245</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3 text-black" />
              <span>info.whitelabelclothing@gmail.com</span>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
