import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, Mail, MessageCircle, ShieldCheck, RefreshCw, Truck } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#E5E5E5] text-black">
      {/* Value Badges */}
      <div className="border-b border-[#E5E5E5] bg-[#F7F7F7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center justify-center p-4">
              <Truck className="w-6 h-6 stroke-[1.2] mb-3" />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-1">Complimentary Express Shipping</h4>
              <p className="text-xs text-neutral-500 max-w-xs">On all pan-India orders above ₹2,999</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <RefreshCw className="w-6 h-6 stroke-[1.2] mb-3" />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-1">Seamless 7-Day Returns</h4>
              <p className="text-xs text-neutral-500 max-w-xs">Hassle-free size exchanges and returns</p>
            </div>
            <div className="flex flex-col items-center justify-center p-4">
              <ShieldCheck className="w-6 h-6 stroke-[1.2] mb-3" />
              <h4 className="text-xs font-semibold uppercase tracking-widest mb-1">Architectural Craftsmanship</h4>
              <p className="text-xs text-neutral-500 max-w-xs">Ultra-heavyweight textiles engineered to last</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-4 md:col-span-1">
            <Link href="/" className="inline-block py-1 hover:opacity-80 transition" aria-label="White Label Clothing Home">
              <Image
                src="/images/brand-logo.png"
                alt="White Label Clothing"
                width={455}
                height={233}
                className="h-12 sm:h-14 w-auto object-contain max-w-[160px]"
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
                <Link href="/return-refund-policy" className="hover:text-black transition">
                  Returns & Refunds
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
                <MessageCircle className="w-4 h-4 text-black" />
                <span>WhatsApp: +91 88518 72245</span>
              </a>
              <a
                href="tel:8851872245"
                className="flex items-center gap-3 hover:text-black transition"
              >
                <Phone className="w-4 h-4 text-black" />
                <span>Call: +91 88518 72245</span>
              </a>
              <a
                href="mailto:info.whitelabelclothing@gmail.com"
                className="flex items-center gap-3 hover:text-black transition"
              >
                <Mail className="w-4 h-4 text-black" />
                <span>info.whitelabelclothing@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>© {currentYear} White Label Clothing. All rights reserved.</p>
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
