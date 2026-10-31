import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Returns & Refund Policy | White Label Clothing',
  description: 'Hassle-free 7-day size exchanges, returns, and refund policy for White Label Clothing.',
};

export default function ReturnRefundPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 font-sans">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-8 pb-4 border-b border-[#E5E5E5]">
          Returns & Refund Policy
        </h1>

        <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              1. Dedicated Size Exchanges & Returns
            </h2>
            <p>
              We want you to be completely satisfied with the drape, silhouette, and fit of your garment. You may request a size exchange or return within 7 calendar days from the date of confirmed delivery.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              2. Eligibility Criteria
            </h2>
            <p>To qualify for a return or size exchange, garments must meet the following standards:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-600">
              <li>Item must be unworn, unwashed, and completely free of perfumes, deodorant stains, or marks.</li>
              <li>All original security tags, woven labels, and packaging must remain attached.</li>
              <li>Items purchased during final clearance sales may only be eligible for size exchange rather than cash refund.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              3. Reverse Pickup Process
            </h2>
            <p>
              Once your request is approved via WhatsApp (+91 88518 72245) or email (info.whitelabelclothing@gmail.com), our logistics partner will arrange a reverse pickup from your original delivery address within 24 to 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              4. Refund Processing
            </h2>
            <p>
              Upon receiving and inspecting the returned item at our quality control warehouse, refunds are initiated within 48 hours:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-600">
              <li>For prepaid orders: Credit is issued directly back to the original payment source.</li>
              <li>For Cash on Delivery orders: Refund is disbursed via direct bank transfer (NEFT/IMPS) or UPI ID provided during the return initiation.</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
