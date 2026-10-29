'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, Check, Settings, ShieldCheck } from 'lucide-react';

export default function AdminSettingsPage() {
  const [phone, setPhone] = useState('8851872245');
  const [whatsapp, setWhatsapp] = useState('8851872245');
  const [email, setEmail] = useState('info.whitelabelclothing@gmail.com');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('2999');
  const [defaultShippingFee, setDefaultShippingFee] = useState('150');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'store_info')
        .maybeSingle();

      if (data?.value) {
        if (data.value.support_phone) setPhone(data.value.support_phone);
        if (data.value.whatsapp_number) setWhatsapp(data.value.whatsapp_number);
        if (data.value.support_email) setEmail(data.value.support_email);
        if (data.value.free_shipping_threshold) {
          setFreeShippingThreshold((data.value.free_shipping_threshold / 100).toString());
        }
        if (data.value.default_shipping_fee) {
          setDefaultShippingFee((data.value.default_shipping_fee / 100).toString());
        }
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      await supabase.from('store_settings').upsert({
        key: 'store_info',
        value: {
          brand_name: 'White Label Clothing',
          tagline: 'More than just a label. Made to be remembered.',
          support_phone: phone.trim(),
          whatsapp_number: whatsapp.trim(),
          support_email: email.trim(),
          currency: 'INR',
          currency_symbol: '₹',
          free_shipping_threshold: Math.round(parseFloat(freeShippingThreshold) * 100),
          default_shipping_fee: Math.round(parseFloat(defaultShippingFee) * 100),
        },
        updated_at: new Date().toISOString(),
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Settings save error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Global Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Store Settings
          </h1>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Store settings successfully updated in database!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Support Channels */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
            Customer Support & Concierge Channels
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Support Telephone (India) *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                WhatsApp Concierge Number *
              </label>
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
              Customer Support Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono"
            />
          </div>
        </div>

        {/* Shipping Thresholds */}
        <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
            Shipping & Currency Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Complimentary Shipping Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Orders at or above this amount receive free shipping</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Flat Express Shipping Charge (₹)
              </label>
              <input
                type="number"
                min="0"
                value={defaultShippingFee}
                onChange={(e) => setDefaultShippingFee(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Applied to orders below threshold</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Updating Settings...' : 'Save Settings'}</span>
        </button>
      </form>
    </div>
  );
}
