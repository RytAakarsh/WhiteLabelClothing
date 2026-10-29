import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Phone, Mail, MessageCircle, Clock, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Client Concierge & Contact | White Label Clothing',
  description: 'Connect directly with White Label Clothing concierge for sizing consultations, orders, and inquiries.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
        <div className="text-center mb-16">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
            Direct Concierge
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif uppercase tracking-wider text-black mb-4">
            Contact White Label
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            Our concierge team is available across India for garment inquiries, sizing guidance, and order support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Card 1: WhatsApp */}
          <a
            href="https://wa.me/918851872245"
            target="_blank"
            rel="noopener noreferrer"
            className="p-8 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black transition flex flex-col justify-between group"
          >
            <div>
              <MessageCircle className="w-8 h-8 text-black mb-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
                WhatsApp Concierge
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Instant real-time support for sizing questions and dispatch updates.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-black group-hover:underline">
              +91 88518 72245 →
            </span>
          </a>

          {/* Card 2: Voice Support */}
          <a
            href="tel:8851872245"
            className="p-8 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black transition flex flex-col justify-between group"
          >
            <div>
              <Phone className="w-8 h-8 text-black mb-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
                Direct Telephony
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                Speak directly with our senior store representative.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-black group-hover:underline">
              +91 88518 72245 →
            </span>
          </a>

          {/* Card 3: Email Concierge */}
          <a
            href="mailto:info.whitelabelclothing@gmail.com"
            className="p-8 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black transition flex flex-col justify-between group"
          >
            <div>
              <Mail className="w-8 h-8 text-black mb-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-black mb-1">
                Electronic Mail
              </h2>
              <p className="text-xs text-neutral-500 mb-4">
                For detailed order inquiries, corporate orders, and partnerships.
              </p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-widest text-black group-hover:underline">
              info.whitelabelclothing@gmail.com →
            </span>
          </a>
        </div>

        {/* Operating Hours */}
        <div className="p-6 bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-600 gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-black flex-shrink-0" />
            <span>Support Hours: Monday to Saturday, 10:00 AM – 7:00 PM IST</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-black flex-shrink-0" />
            <span>Typical Response Time: Within 2 Hours</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
