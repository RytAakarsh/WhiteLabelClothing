import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Terms & Conditions | White Label Clothing',
  description: 'Terms of service and purchasing conditions for White Label Clothing.',
};

export default function TermsConditionsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 font-sans">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-8 pb-4 border-b border-[#E5E5E5]">
          Terms & Conditions
        </h1>

        <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              1. General Overview
            </h2>
            <p>
              By accessing and placing orders through White Label Clothing (whitelabelclothing.com), you agree to be bound by these Terms and Conditions. These terms apply to all visitors, registered clients, and customers.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              2. Intellectual Property
            </h2>
            <p>
              All trademarks, campaign imagery, silhouettes, brand identifiers, logo marks, and editorial compositions on this website are the proprietary intellectual property of White Label Clothing. Unauthorized reproduction is strictly prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              3. Pricing and Availability
            </h2>
            <p>
              All prices are listed in Indian Rupees (INR) and are inclusive of applicable goods and services taxes (GST). We reserve the right to modify prices, discontinue products, or correct typographical errors at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              4. Governing Law and Jurisdiction
            </h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of India. Any disputes arising in connection with orders shall be subject to the exclusive jurisdiction of the competent courts in Delhi, India.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
