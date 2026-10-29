import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';

export const metadata = {
  title: 'Brand Story | White Label Clothing',
  description: 'More than just a label. Made to be remembered. The philosophy and architecture of White Label Clothing.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center mb-16">
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2">
            The Philosophy
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif uppercase tracking-wider text-black mb-6">
            More Than Just a Label
          </h1>
          <blockquote className="text-lg sm:text-xl font-serif italic text-neutral-700 max-w-xl mx-auto">
            “Made to be remembered.”
          </blockquote>
        </div>

        <div className="prose prose-neutral max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-neutral-700 font-sans">
          <p>
            White Label Clothing was founded on the rejection of the ephemeral fashion cycle. In an industry defined by fleeting micro-trends and decorative excess, we anchor ourselves in monolithic purity, architectural silhouettes, and pure monochromatic restraint.
          </p>

          <div className="my-12 relative w-full aspect-21/9 bg-neutral-100 border border-[#E5E5E5] overflow-hidden">
            <Image
              src="/images/hero-winter-collection.png"
              alt="White Label Clothing Architectural Outerwear"
              fill
              className="object-cover"
            />
          </div>

          <h2 className="text-xl sm:text-2xl font-serif uppercase tracking-wider text-black pt-4">
            The Monochromatic Architecture
          </h2>
          <p>
            Black and white are not merely colors; they are the absolute limits of light and shadow. By stripping away extraneous hues, every seam, texture, and hem takes on heightened significance. Our garments are defined by their drape, their weight, and the deliberate geometric precision of their cut.
          </p>

          <h2 className="text-xl sm:text-2xl font-serif uppercase tracking-wider text-black pt-4">
            Uncompromising Textile Weight
          </h2>
          <p>
            From our 450+ GSM French terry fleece sweatshirts to our weather-resistant structured jackets, we source fabrics engineered for generational permanence. When you put on a White Label piece, you immediately perceive the density, comfort, and uncompromising structural integrity.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
