'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useCart } from '@/lib/context/CartContext';
import { useAuth } from '@/lib/context/AuthContext';
import { formatPrice } from '@/lib/utils';
import { ShieldCheck, Truck, Lock, ArrowRight, AlertCircle, Tag, Check, X, Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();
  const { user, isLoading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('India');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'upi' | 'card_pending'>('cod');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idempotencyKey] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `wlc_checkout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  // Coupon management state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Autofill user details if signed in
  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      if (user.user_metadata?.full_name) {
        setFullName(user.user_metadata.full_name);
      }
      if (user.user_metadata?.phone) {
        setPhone(user.user_metadata.phone);
      }
    }
  }, [user]);

  // Delivery Charge = ₹99 × Total Item Quantity (9900 paise per unit)
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveryCharge = appliedCoupon?.free_shipping ? 0 : totalQuantity * 9900;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount_paise : 0;
  const finalTotal = Math.max(0, subtotal - couponDiscount) + deliveryCharge;

  // Handle Apply Coupon
  const handleApplyCoupon = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await fetch('/api/checkout/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          subtotal,
          items: items.map((i) => ({
            variant_id: i.variant_id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid or inapplicable coupon code.');
      }

      setAppliedCoupon(data.coupon);
      setCouponSuccess(data.message || `Coupon ${data.coupon.code} applied!`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  // Handle Remove Coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Handle form submission
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submission
    setErrorMsg(null);

    if (items.length === 0) {
      setErrorMsg('Your shopping bag is empty.');
      return;
    }

    // Require authentication as per Section 11 & Section 19
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }

    if (paymentMethod === 'card_pending') {
      setErrorMsg('Credit/Debit Card gateway integration is currently pending merchant credential activation. Please select Pay Online via UPI or Cash on Delivery.');
      return;
    }

    setSubmitting(true);

    try {
      if (paymentMethod === 'upi') {
        const response = await fetch('/api/payments/direct-upi/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: fullName.trim(),
            customer_email: email.trim(),
            customer_phone: phone.trim(),
            shipping_address: {
              full_name: fullName.trim(),
              phone: phone.trim(),
              address_line1: addressLine1.trim(),
              address_line2: addressLine2.trim() || undefined,
              city: city.trim(),
              state: state.trim(),
              postal_code: postalCode.trim(),
              country: country.trim(),
              delivery_instructions: instructions.trim() || undefined,
            },
            items: items.map((i) => ({
              variant_id: i.variant_id,
              quantity: i.quantity,
            })),
            notes: instructions.trim(),
            idempotency_key: idempotencyKey,
            coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || data.error || 'Failed to initialize direct UPI payment session.');
        }

        clearCart();
        router.push(`/checkout/direct-upi/${data.order_number}`);
        return;
      }

      // Default: Cash on Delivery flow
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: fullName.trim(),
          customer_email: email.trim(),
          customer_phone: phone.trim(),
          shipping_address: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address_line1: addressLine1.trim(),
            address_line2: addressLine2.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
            delivery_instructions: instructions.trim() || undefined,
          },
          items: items.map((i) => ({
            variant_id: i.variant_id,
            quantity: i.quantity,
          })),
          delivery_charge: deliveryCharge,
          notes: instructions.trim(),
          payment_method: paymentMethod,
          idempotency_key: idempotencyKey,
          coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to place order. Please check item stock.');
      }

      // Order placed successfully! Clear cart & redirect
      clearCart();
      router.push(`/checkout/confirmation/${data.order_number}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while placing your order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-serif uppercase tracking-wider mb-3">Your Bag is Empty</h1>
          <p className="text-xs text-neutral-500 mb-8">
            You must add items to your shopping bag before proceeding to checkout.
          </p>
          <Link
            href="/collections"
            className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            Explore Collections
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Step Indicator */}
        <div className="mb-10 pb-4 border-b border-[#E5E5E5] flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Secure Checkout
          </h1>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
            <Lock className="w-3.5 h-3.5 text-black" />
            <span>256-Bit SSL Encrypted</span>
          </div>
        </div>

        {/* Auth prompt if guest */}
        {!user && !authLoading && (
          <div className="p-4 mb-8 bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-black">
                Have a White Label account?
              </p>
              <p className="text-[11px] text-neutral-500">
                Sign in to auto-fill saved addresses and link this order to your history.
              </p>
            </div>
            <Link
              href={`/login?redirect=${encodeURIComponent('/checkout')}`}
              className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition whitespace-nowrap"
            >
              Sign In to Continue
            </Link>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 mb-8 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
          {/* Left Column: Delivery Details & Payment */}
          <div className="lg:col-span-7 space-y-8">
            {/* 1. Contact Information */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
                1. Contact Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                    placeholder="you@domain.com"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Phone Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10}"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                    placeholder="8851872245"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
                2. Delivery Address
              </h2>
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Recipient Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Street Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                  placeholder="Apartment, building, street address"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                  placeholder="Landmark, suite, floor"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                    placeholder="New Delhi"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                    placeholder="Delhi"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    PIN Code (6 Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{6}"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                    placeholder="110001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Special Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                  placeholder="e.g. Ring bell twice, leave at concierge"
                />
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
                3. Payment Method
              </h2>
              <div className="space-y-3">
                {/* 1. Cash on Delivery */}
                <label className={`block p-4 border cursor-pointer transition ${
                  paymentMethod === 'cod' ? 'border-black bg-[#F7F7F7]' : 'border-[#E5E5E5] hover:border-neutral-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-black"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-black block">
                          Cash on Delivery (Pay at Doorstep)
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 bg-neutral-200 text-neutral-800 rounded-xs">
                          Default
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Pay cash or scan courier UPI QR code upon arrival at your doorstep.
                      </span>
                    </div>
                  </div>
                </label>

                {/* 2. Pay Online via UPI */}
                <label className={`block p-4 border cursor-pointer transition ${
                  paymentMethod === 'upi' ? 'border-black bg-[#F7F7F7]' : 'border-[#E5E5E5] hover:border-neutral-400'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={() => setPaymentMethod('upi')}
                      className="accent-black"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-black block">
                          Pay Online — Instant UPI & QR
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 bg-black text-white rounded-xs">
                          Recommended
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Scan dynamic UPI QR code or pay instantly with Google Pay, PhonePe, Paytm, or BHIM. Zero extra processing surcharge.
                      </span>
                    </div>
                  </div>
                </label>

                {/* 3. Cards & NetBanking (Pending) */}
                <label className={`block p-4 border cursor-pointer transition ${
                  paymentMethod === 'card_pending' ? 'border-black bg-[#F7F7F7]' : 'border-[#E5E5E5] hover:border-neutral-400 opacity-60'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      value="card_pending"
                      checked={paymentMethod === 'card_pending'}
                      onChange={() => setPaymentMethod('card_pending')}
                      className="accent-black"
                    />
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-black block">
                        Credit / Debit Cards & NetBanking (Pending Activation)
                      </span>
                      <span className="text-[11px] text-neutral-500 block mt-0.5">
                        Direct merchant card gateway onboarding in progress. Please use UPI or COD.
                      </span>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary & Placement */}
          <div className="lg:col-span-5">
            <div className="bg-[#F7F7F7] border border-[#E5E5E5] p-6 sm:p-8 space-y-6 sticky top-28">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-black pb-4 border-b border-[#E5E5E5]">
                Order Summary ({items.length})
              </h2>

              {/* Items Preview */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.variant_id} className="flex gap-3 pb-3 border-b border-[#E5E5E5]">
                    <div className="relative w-14 h-18 bg-white border border-[#E5E5E5] flex-shrink-0">
                      <Image
                        src={item.image}
                        alt={item.product_name}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-between text-xs">
                      <div>
                        <p className="font-medium text-black line-clamp-1">{item.product_name}</p>
                        <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                          Size: {item.size} · Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-black">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Code Section */}
              <div className="pt-3 pb-3 border-t border-b border-[#E5E5E5] space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-black">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Have a coupon code?</span>
                </div>

                {!appliedCoupon ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => {
                          setCouponInput(e.target.value.toUpperCase());
                          if (couponError) setCouponError(null);
                        }}
                        placeholder="ENTER COUPON CODE"
                        className="flex-1 px-3 py-2 bg-white border border-[#E5E5E5] text-xs uppercase font-mono tracking-wider focus:outline-hidden focus:border-black"
                      />
                      <button
                        type="button"
                        disabled={couponLoading || !couponInput.trim()}
                        onClick={handleApplyCoupon}
                        className="px-4 py-2 bg-black text-white text-[11px] uppercase tracking-wider font-semibold hover:bg-neutral-800 disabled:opacity-40 transition whitespace-nowrap cursor-pointer flex items-center justify-center min-w-[70px]"
                      >
                        {couponLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>

                    {couponError && (
                      <p className="text-[11px] text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{couponError}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800 uppercase tracking-wider">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{appliedCoupon.code} Applied</span>
                      </div>
                      <p className="text-[11px] text-emerald-700">
                        {appliedCoupon.discount_type === 'percentage'
                          ? `${appliedCoupon.discount_value}% discount (-${formatPrice(couponDiscount)})`
                          : `-${formatPrice(couponDiscount)} fixed discount`}
                        {appliedCoupon.free_shipping ? ' · Free Delivery' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] text-neutral-500 hover:text-black uppercase tracking-wider font-semibold underline p-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Totals Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Bag Subtotal</span>
                  <span className="font-medium text-black">{formatPrice(subtotal)}</span>
                </div>
                {appliedCoupon && couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Coupon Discount ({appliedCoupon.code})</span>
                    <span>-{formatPrice(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Delivery Charges ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'} × ₹99)</span>
                  <span className="font-medium text-black">
                    {appliedCoupon?.free_shipping ? (
                      <span className="text-emerald-700 font-bold uppercase text-[11px]">Free</span>
                    ) : (
                      formatPrice(deliveryCharge)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Applicable GST / Taxes</span>
                  <span className="font-medium text-black">Included</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-black pt-2 border-t border-neutral-300">
                  <span>Total Due</span>
                  <span>{formatPrice(finalTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 transition bg-black text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>
                  {submitting
                    ? paymentMethod === 'upi'
                      ? 'Connecting to UPI Gateway...'
                      : 'Placing Order...'
                    : paymentMethod === 'upi'
                    ? 'Proceed to UPI Payment'
                    : 'Confirm & Place Order (COD)'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="space-y-2 text-[11px] text-neutral-500 pt-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-black" />
                  <span>Verified authenticity guarantee from White Label</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-black" />
                  <span>Dispatched with express tracking within 24-48 hours</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
