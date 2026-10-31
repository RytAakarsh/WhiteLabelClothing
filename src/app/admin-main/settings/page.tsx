'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, Check, Settings, ShieldCheck, QrCode } from 'lucide-react';

export default function AdminSettingsPage() {
  // Store info state
  const [phone, setPhone] = useState('8851872245');
  const [whatsapp, setWhatsapp] = useState('8851872245');
  const [email, setEmail] = useState('info.whitelabelclothing@gmail.com');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('2999');
  const [defaultShippingFee, setDefaultShippingFee] = useState('150');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Direct UPI settings state
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [receivingUpiId, setReceivingUpiId] = useState('moinusman0302@oksbi');
  const [payeeName, setPayeeName] = useState('MOHAMMED MOIN');
  const [allowCustomerUtr, setAllowCustomerUtr] = useState(true);
  const [paymentInstructions, setPaymentInstructions] = useState(
    'Please transfer the exact amount using any UPI app (GPay, PhonePe, Paytm, BHIM, Cred) and submit your 12-digit Bank UTR / Reference number below.'
  );

  const [savingUpi, setSavingUpi] = useState(false);
  const [upiSavedSuccess, setUpiSavedSuccess] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      // 1. Load store info
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

      // 2. Load Direct UPI settings
      try {
        const upiRes = await fetch('/api/admin/payment-settings');
        if (upiRes.ok) {
          const resJson = await upiRes.json();
          if (resJson.settings) {
            setUpiEnabled(resJson.settings.is_enabled ?? true);
            setReceivingUpiId(resJson.settings.receiving_upi_id || 'moinusman0302@oksbi');
            setPayeeName(resJson.settings.payee_name || 'MOHAMMED MOIN');
            setAllowCustomerUtr(resJson.settings.allow_customer_utr ?? true);
            if (resJson.settings.payment_instructions) {
              setPaymentInstructions(resJson.settings.payment_instructions);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching Direct UPI settings:', err);
      }
    }

    loadSettings();
  }, []);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
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

  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpi(true);
    setUpiSavedSuccess(false);
    setUpiError(null);

    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_enabled: upiEnabled,
          receiving_upi_id: receivingUpiId.trim(),
          payee_name: payeeName.trim(),
          allow_customer_utr: allowCustomerUtr,
          payment_instructions: paymentInstructions.trim(),
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to update payment settings.');
      }

      setUpiSavedSuccess(true);
      setTimeout(() => setUpiSavedSuccess(false), 4000);
    } catch (err: any) {
      setUpiError(err.message || 'Error updating payment settings.');
    } finally {
      setSavingUpi(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Global Configuration
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Store & Payment Settings
          </h1>
        </div>
      </div>

      {/* Direct UPI Payment Gateway Configuration */}
      <div className="bg-white border border-[#E5E5E5] p-6 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-black" />
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
                Direct UPI Payment Gateway
              </h2>
              <p className="text-[11px] text-neutral-500">
                Self-hosted, zero-fee direct bank transfers via NPCI UPI specification.
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
            upiEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
          }`}>
            {upiEnabled ? 'Active at Checkout' : 'Disabled'}
          </span>
        </div>

        {upiSavedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Direct UPI configuration saved and active immediately!</span>
          </div>
        )}

        {upiError && (
          <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700">
            {upiError}
          </div>
        )}

        <form onSubmit={handleSaveUpiSettings} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E5E5E5]">
            <input
              type="checkbox"
              id="upiEnabled"
              checked={upiEnabled}
              onChange={(e) => setUpiEnabled(e.target.checked)}
              className="w-4 h-4 accent-black cursor-pointer"
            />
            <label htmlFor="upiEnabled" className="text-xs font-semibold text-black cursor-pointer">
              Enable Direct UPI Payment Option on Checkout
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Receiving UPI ID (VPA) *
              </label>
              <input
                type="text"
                required
                value={receivingUpiId}
                onChange={(e) => setReceivingUpiId(e.target.value)}
                placeholder="e.g. moinusman0302@oksbi"
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono"
              />
              <p className="text-[10px] text-neutral-400 mt-1">UPI address where customer funds are deposited</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Payee Legal / Display Name *
              </label>
              <input
                type="text"
                required
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="e.g. MOHAMMED MOIN"
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Beneficiary name registered with the receiving bank</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#F7F7F7] border border-[#E5E5E5]">
            <input
              type="checkbox"
              id="allowCustomerUtr"
              checked={allowCustomerUtr}
              onChange={(e) => setAllowCustomerUtr(e.target.checked)}
              className="w-4 h-4 accent-black cursor-pointer"
            />
            <label htmlFor="allowCustomerUtr" className="text-xs font-semibold text-black cursor-pointer">
              Allow Customers to Submit 12-Digit Bank UTR on Checkout Screen
            </label>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
              Customer Payment Instructions
            </label>
            <textarea
              rows={3}
              value={paymentInstructions}
              onChange={(e) => setPaymentInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingUpi}
              className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingUpi ? 'Saving Configuration...' : 'Save UPI Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Store Support Channels & Rules */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Store settings successfully updated in database!</span>
        </div>
      )}

      <form onSubmit={handleSaveStoreSettings} className="space-y-6">
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
