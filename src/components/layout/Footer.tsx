import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MessageCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E5E5] text-black">
      {/* Editorial Brand Pillars */}
      <div className="border-b border-[#E5E5E5] bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-1.5 p-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block font-mono">
                01 — Ethos
              </span>
              <h4 className="text-xs font-serif uppercase tracking-wider text-black font-semibold">
                Curated Collections
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
                Thoughtfully selected styles for a distinctive wardrobe.
              </p>
            </div>
            <div className="space-y-1.5 p-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block font-mono">
                02 — Design
              </span>
              <h4 className="text-xs font-serif uppercase tracking-wider text-black font-semibold">
                Designed for Everyday Expression
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
                Contemporary essentials with a refined identity.
              </p>
            </div>
            <div className="space-y-1.5 p-2">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block font-mono">
                03 — Experience
              </span>
              <h4 className="text-xs font-serif uppercase tracking-wider text-black font-semibold">
                A Seamless Shopping Experience
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
                Discover, select and shop your favourite pieces with ease.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block py-1 hover:opacity-80 transition" aria-label="White Label Clothing Home">
              <Image
                src="/images/brand-logo.png"
                alt="White Label Clothing"
                width={455}
                height={233}
                className="h-11 sm:h-12 w-auto object-contain max-w-[150px]"
              />
            </Link>
            <p className="text-xs text-neutral-600 leading-relaxed italic font-serif">
              “More than just a label. Made to be remembered.”
            </p>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Monochromatic luxury silhouettes engineered for the modern aesthetic purist.
            </p>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4">Collections</h3>
            <ul className="space-y-2.5 text-xs text-neutral-600">
              <li>
                <Link href="/collections" className="hover:text-black transition">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/collections/sweatshirts" className="hover:text-black transition">
                  Premium Sweatshirts
                </Link>
              </li>
              <li>
                <Link href="/collections/jackets" className="hover:text-black transition">
                  Premium Jackets
                </Link>
              </li>
              <li>
                <Link href="/offers" className="hover:text-black transition">
                  Active Winter Offers
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-black transition">
                  Brand Philosophy
                </Link>
              </li>
            </ul>
          </div>

          {/* Client Concierge & Policies */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4">Client Concierge</h3>
            <ul className="space-y-2.5 text-xs text-neutral-600">
              <li>
                <Link href="/contact" className="hover:text-black transition">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-black transition">
                  Shipping & Delivery
                </Link>
              </li>

              <li>
                <Link href="/privacy-policy" className="hover:text-black transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-and-conditions" className="hover:text-black transition">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>

          {/* Direct Support */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-4">Direct Contact</h3>
            <div className="space-y-3 text-xs text-neutral-600">
              <a
                href="https://wa.me/918851872245"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-black transition"
              >
                <MessageCircle className="w-4 h-4 text-black shrink-0" />
                <span>WhatsApp: +91 88518 72245</span>
              </a>
              <a
                href="tel:8851872245"
                className="flex items-center gap-3 hover:text-black transition"
              >
                <Phone className="w-4 h-4 text-black shrink-0" />
                <span>Call: +91 88518 72245</span>
              </a>
              <a
                href="mailto:info.whitelabelclothing@gmail.com"
                className="flex items-center gap-3 hover:text-black transition"
              >
                <Mail className="w-4 h-4 text-black shrink-0" />
                <span>info.whitelabelclothing@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar with MightBeMedia Credit */}
        <div className="mt-14 pt-8 border-t border-[#E5E5E5] flex flex-col md:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>© {currentYear} White Label Clothing. All rights reserved.</p>
            <span className="hidden sm:inline text-neutral-300">•</span>
            <p className="text-[11px] text-neutral-400">
              Managed by{' '}
              <a
                href="https://mightbemedia.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-black font-medium hover:underline hover:opacity-80 transition inline-flex items-center"
              >
                MightBeMedia
              </a>
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-black transition">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-black transition">Terms</Link>
            <Link href="/admin-main" className="hover:text-black transition text-neutral-400">Admin Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
