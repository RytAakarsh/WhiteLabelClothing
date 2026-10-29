import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata = {
  title: 'Shipping & Delivery Policy | White Label Clothing',
  description: 'Shipping timelines, courier partners, and pan-India delivery policies for White Label Clothing.',
};

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 font-sans">
        <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black mb-8 pb-4 border-b border-[#E5E5E5]">
          Shipping & Delivery Policy
        </h1>

        <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed">
          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              1. Processing and Dispatch Timeline
            </h2>
            <p>
              Every garment undergoes individual inspection, steaming, and archival packaging before dispatch. Orders placed before 2:00 PM IST on business days are typically processed and dispatched within 24 to 48 hours. Orders placed on Sundays or national holidays are dispatched on the next business day.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              2. Pan-India Delivery Timelines
            </h2>
            <p>
              We partner exclusively with premium express air couriers (BlueDart, Delhivery, DTDC Air) to ensure swift, secure transit:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-neutral-600">
              <li>Metro Cities (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Chennai, Kolkata): 2–4 business days.</li>
              <li>Tier 2 and Rest of India: 3–6 business days.</li>
              <li>North-East, J&K, and remote regions: 5–8 business days.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              3. Complimentary Shipping Threshold
            </h2>
            <p>
              We provide complimentary express shipping on all domestic orders of ₹2,999 and above. For orders below ₹2,999, a flat express shipping fee of ₹150 is applied at checkout.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              4. Real-Time Tracking
            </h2>
            <p>
              Once your shipment is dispatched from our facility, an automated SMS and WhatsApp notification containing your airway bill (AWB) and live tracking link will be transmitted to your registered contact number.
            </p>
          </section>

          <section>
            <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-black mb-2">
              5. Delivery Inquiries
            </h2>
            <p>
              For urgent delivery escalations, contact our direct concierge at <span className="font-semibold text-black">+91 88518 72245</span> or email <span className="font-semibold text-black">info.whitelabelclothing@gmail.com</span> with your order number.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
