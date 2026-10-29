'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Home, Save, Check, RefreshCw, AlertCircle } from 'lucide-react';

export default function AdminHomepagePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Announcement Bar
  const [announcementEnabled, setAnnouncementEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState('COMPLIMENTARY EXPRESS SHIPPING ON ALL ORDERS OVER ₹2,999');

  // Brand Statement
  const [tagline, setTagline] = useState('More than just a label. Made to be remembered.');
  const [brandDesc, setBrandDesc] = useState('Crafted with relentless attention to architectural proportion, monolithic monochromatic tones, and uncompromising textile luxury.');

  // Hero Carousel Configuration
  const [slides, setSlides] = useState([
    {
      id: 1,
      title: 'Winter Collection',
      subtitle: 'Monochrome Luxe',
      image: '/images/hero-winter-collection.png',
      link: '/collections',
      is_enabled: true,
    },
    {
      id: 2,
      title: 'Premium Jacket Sale',
      subtitle: 'Up to 40% Off on Premium Jackets',
      image: '/images/hero-jacket-sale.png',
      link: '/collections/jackets',
      is_enabled: true,
    },
    {
      id: 3,
      title: 'Premium Sweatshirt Sale',
      subtitle: 'Up to 40% Off on Premium Sweatshirts',
      image: '/images/hero-sweatshirt-sale.png',
      link: '/collections/sweatshirts',
      is_enabled: true,
    },
  ]);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      // Fetch announcement bar
      const { data: annData } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'announcement_bar')
        .maybeSingle();

      if (annData?.value) {
        if (annData.value.enabled !== undefined) setAnnouncementEnabled(annData.value.enabled);
        if (annData.value.text) setAnnouncementText(annData.value.text);
      }

      // Fetch hero carousel section
      const { data: heroData } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('id', 'hero_carousel')
        .maybeSingle();

      if (heroData?.configuration?.slides) {
        setSlides(heroData.configuration.slides);
      }

      // Fetch brand statement
      const { data: brandData } = await supabase
        .from('homepage_sections')
        .select('*')
        .eq('id', 'brand_statement')
        .maybeSingle();

      if (brandData?.configuration) {
        if (brandData.configuration.tagline) setTagline(brandData.configuration.tagline);
        if (brandData.configuration.description) setBrandDesc(brandData.configuration.description);
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  const handleSlideChange = (index: number, field: string, val: any) => {
    setSlides((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: val } : s))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      // 1. Save announcement bar
      await supabase.from('store_settings').upsert({
        key: 'announcement_bar',
        value: {
          enabled: announcementEnabled,
          text: announcementText.trim(),
        },
        updated_at: new Date().toISOString(),
      });

      // 2. Save hero carousel section
      await supabase.from('homepage_sections').upsert({
        id: 'hero_carousel',
        section_type: 'hero_carousel',
        title: 'Campaign Hero',
        is_enabled: true,
        sort_order: 1,
        configuration: {
          autoplay_interval: 5000,
          slides,
        },
        updated_at: new Date().toISOString(),
      });

      // 3. Save brand statement
      await supabase.from('homepage_sections').upsert({
        id: 'brand_statement',
        section_type: 'brand_statement',
        title: 'Brand Philosophy',
        is_enabled: true,
        sort_order: 6,
        configuration: {
          tagline: tagline.trim(),
          description: brandDesc.trim(),
        },
        updated_at: new Date().toISOString(),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e) {
      console.error('Error saving homepage configuration:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Storefront Presentation
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Homepage Management
          </h1>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Publishing...' : 'Save & Publish Homepage'}</span>
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Homepage configuration successfully published to database and storefront!</span>
        </div>
      )}

      {/* 1. Announcement Bar */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
          1. Top Announcement Bar
        </h2>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="ann-enabled"
            checked={announcementEnabled}
            onChange={(e) => setAnnouncementEnabled(e.target.checked)}
            className="accent-black w-4 h-4"
          />
          <label htmlFor="ann-enabled" className="text-xs font-semibold uppercase tracking-wider cursor-pointer">
            Enable Announcement Bar
          </label>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Announcement Message
          </label>
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
          />
        </div>
      </div>

      {/* 2. Hero Slides */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-6">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
            2. Campaign Hero Slides (3 Official Banners)
          </h2>
          <p className="text-[11px] text-neutral-500 mt-1">
            Configure destination links and active states for each campaign banner.
          </p>
        </div>

        <div className="space-y-6">
          {slides.map((slide, idx) => (
            <div key={slide.id} className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-28 h-12 bg-white border border-[#E5E5E5] overflow-hidden flex-shrink-0">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                      Slide {idx + 1}
                    </span>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-black">
                      {slide.title}
                    </h3>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slide.is_enabled}
                    onChange={(e) => handleSlideChange(idx, 'is_enabled', e.target.checked)}
                    className="accent-black w-4 h-4"
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-black mb-1">
                    Banner Title
                  </label>
                  <input
                    type="text"
                    value={slide.title}
                    onChange={(e) => handleSlideChange(idx, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-semibold text-black mb-1">
                    Destination Collection Link
                  </label>
                  <input
                    type="text"
                    value={slide.link}
                    onChange={(e) => handleSlideChange(idx, 'link', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#E5E5E5] text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Brand Statement */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
          3. Brand Philosophy Statement
        </h2>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Primary Tagline
          </label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-serif italic text-base"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
            Editorial Description
          </label>
          <textarea
            rows={3}
            value={brandDesc}
            onChange={(e) => setBrandDesc(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
