import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Privacy Policy | White Label Clothing',
  description: 'Privacy and data protection commitments for White Label Clothing patrons.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 font-sans">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-8 pb-4 border-b border-[#E5E5E5]">
          Privacy Policy
        </h1>

        <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <p>
            At White Label Clothing, we honor your privacy as deeply as we honor our craftsmanship. This Privacy Policy details our transparent approach to collecting, utilizing, and safeguarding your personal information.
          </p>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              1. Information We Collect
            </h2>
            <p>
              We only collect information strictly required to fulfill your orders and enhance your shopping experience: name, delivery address, contact telephone, email address, and transaction references. We never store credit card numbers, CVVs, or bank credentials.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              2. Usage of Personal Data
            </h2>
            <p>
              Your contact details are utilized solely for order confirmation, dispatch tracking updates, and customer support communications. We do not sell, rent, or lease customer data to third-party advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              3. Data Security
            </h2>
            <p>
              All customer sessions and transmission of personal information are encrypted with 256-bit Secure Sockets Layer (SSL) protocols through Supabase infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              4. Contact the Data Protection Officer
            </h2>
            <p>
              For inquiries regarding data retention or deletion requests, email us at <span className="font-semibold text-black">info.whitelabelclothing@gmail.com</span>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
