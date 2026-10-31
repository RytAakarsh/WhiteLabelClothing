'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { formatPrice } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  QrCode,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

interface DirectUpiPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default function DirectUpiCheckoutPage({ params }: DirectUpiPageProps) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // UTR submission state
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const [utrSuccessMsg, setUtrSuccessMsg] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Active view toggle on mobile (QR vs App buttons)
  const [mobileView, setMobileView] = useState<'apps' | 'qr'>('apps');

  // Load details
  const fetchDetails = async () => {
    try {
      const res = await fetch(`/api/payments/direct-upi/details/${encodeURIComponent(orderNumber)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load order payment details.');
      }
      setData(json);
      if (json.order?.payment_reference) {
        setUtrInput(json.order.payment_reference);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading payment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [orderNumber]);

  // Polling for live status updates every 5 seconds until paid or failed
  useEffect(() => {
    if (!data?.order) return;
    const currentStatus = data.order.payment_status;

    if (currentStatus === 'paid' || currentStatus === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/status/${encodeURIComponent(orderNumber)}`);
        const statusJson = await res.json();
        if (statusJson.success && statusJson.order) {
          if (statusJson.order.payment_status !== currentStatus) {
            setData((prev: any) => ({
              ...prev,
              order: {
                ...prev.order,
                ...statusJson.order,
              },
            }));
          }
        }
      } catch (pollErr) {
        console.error('Polling error:', pollErr);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [data?.order?.payment_status, orderNumber]);

  // Handle Copy UPI ID
  const handleCopyUpiId = () => {
    if (!data?.receiving_upi_id) return;
    navigator.clipboard.writeText(data.receiving_upi_id);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  // Handle UTR submission
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    setUtrError(null);
    setUtrSuccessMsg(null);

    const cleanUtr = utrInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (cleanUtr.length < 6 || cleanUtr.length > 25) {
      setUtrError('Please enter a valid 12-digit Bank UTR / Reference number from your payment app.');
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await fetch('/api/payments/direct-upi/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNumber,
          utr: cleanUtr,
        }),
      });

      const resJson = await res.json();
      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || 'Failed to submit payment reference.');
      }

      setUtrSuccessMsg(resJson.message);
      // Refresh order data
      await fetchDetails();
    } catch (err: any) {
      setUtrError(err.message || 'An error occurred while recording your UTR.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-neutral-600">Generating Secure UPI Payment Session...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif uppercase tracking-wider mb-3">Order Not Found</h1>
          <p className="text-xs text-neutral-500 mb-8">{error || 'Unable to load payment details.'}</p>
          <Link
            href="/collections"
            className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            Return to Store
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const order = data.order;
  const paymentStatus = order.payment_status; // awaiting_payment | awaiting_verification | paid | manual_review | failed
  const isPaid = paymentStatus === 'paid';
  const isAwaitingVerification = paymentStatus === 'awaiting_verification';
  const isManualReview = paymentStatus === 'manual_review';
  const isFailed = paymentStatus === 'failed';
  const isAwaitingPayment = paymentStatus === 'awaiting_payment' || (!isPaid && !isAwaitingVerification && !isManualReview && !isFailed);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 w-full">
        {/* Step Header */}
        <div className="mb-8 pb-4 border-b border-[#E5E5E5] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold block mb-1">
              Direct UPI Payment
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
              Order #{order.order_number}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
            <ShieldCheck className="w-4 h-4 text-black" />
            <span>Zero Processing Surcharge</span>
          </div>
        </div>

        {/* Dynamic Status Banners (Section 9) */}
        {isPaid ? (
          <div className="p-4 mb-8 bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Payment Verified Successfully</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Your payment has been verified in our SBI receiving account. Your order is confirmed and queued for fulfillment.
              </p>
            </div>
          </div>
        ) : isAwaitingVerification ? (
          <div className="p-4 mb-8 bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Verification in Progress</p>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Your payment details have been submitted. We are verifying the transaction against our SBI receiving account. You do not need to make another payment.
              </p>
            </div>
          </div>
        ) : isManualReview ? (
          <div className="p-4 mb-8 bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Payment Under Review</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Your payment is under review. Our team will contact you if further information is needed.
              </p>
            </div>
          </div>
        ) : isFailed ? (
          <div className="p-4 mb-8 bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Payment Could Not Be Verified</p>
              <p className="text-[11px] text-red-800 mt-0.5">
                Payment could not be verified. Please contact support at info.whitelabelclothing@gmail.com before attempting another payment.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 mb-8 bg-[#F7F7F7] border border-[#E5E5E5] text-black flex items-start gap-3">
            <Clock className="w-5 h-5 text-black flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider">Awaiting Payment</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">
                Complete your UPI payment using the dynamic QR code or UPI mobile intent below to proceed.
              </p>
            </div>
          </div>
        )}

        {/* If Order is Paid, show Confirmed View */}
        {isPaid ? (
          <div className="border border-[#E5E5E5] bg-[#F7F7F7] p-8 sm:p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-serif uppercase tracking-wider text-black">
              Payment Confirmed
            </h2>
            <p className="text-xs text-neutral-600 max-w-md mx-auto">
              We have received and verified your payment of <strong className="text-black">{formatPrice(order.total_amount)}</strong> for Order #{order.order_number}.
            </p>
            <div className="bg-white border border-[#E5E5E5] p-4 max-w-sm mx-auto text-xs text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500 uppercase text-[10px]">Bank UTR</span>
                <span className="font-mono font-bold text-black">{order.payment_reference || 'Verified'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 uppercase text-[10px]">Verified Date</span>
                <span>{order.payment_verified_at ? new Date(order.payment_verified_at).toLocaleDateString('en-IN') : 'Today'}</span>
              </div>
            </div>
            <div className="pt-4 flex justify-center gap-4">
              <Link
                href={`/checkout/confirmation/${order.order_number}`}
                className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition inline-flex items-center gap-2"
              >
                <span>View Order Confirmation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/account/orders"
                className="px-6 py-3 border border-neutral-300 text-black text-xs uppercase tracking-widest hover:border-black transition"
              >
                Order History
              </Link>
            </div>
          </div>
        ) : (
          /* Payment Processing Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Column: QR Code & UPI Transfer Controls */}
            <div className="lg:col-span-7 space-y-6">
              {/* Payment Card */}
              <div className="border border-[#E5E5E5] bg-white p-6 sm:p-8 space-y-6 shadow-xs">
                {/* Amount Due (Immutable) */}
                <div className="text-center pb-6 border-b border-[#E5E5E5]">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                    Exact Amount Due
                  </span>
                  <div className="text-3xl sm:text-4xl font-serif font-bold text-black">
                    {formatPrice(order.total_amount)}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-neutral-500 block mt-1">
                    Includes GST & ₹99 Delivery Charge Per Garment
                  </span>
                </div>

                {/* Mobile View Toggle */}
                <div className="sm:hidden flex border border-[#E5E5E5] p-1 bg-[#F7F7F7]">
                  <button
                    type="button"
                    onClick={() => setMobileView('apps')}
                    className={`flex-1 py-2 text-xs uppercase tracking-wider font-semibold transition ${
                      mobileView === 'apps' ? 'bg-black text-white shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Pay via App
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileView('qr')}
                    className={`flex-1 py-2 text-xs uppercase tracking-wider font-semibold transition ${
                      mobileView === 'qr' ? 'bg-black text-white shadow-xs' : 'text-neutral-600 hover:text-black'
                    }`}
                  >
                    Show QR Code
                  </button>
                </div>

                {/* Mobile Direct Intent Button (Always visible on mobile or when 'apps' is active) */}
                <div className={`${mobileView === 'qr' ? 'hidden sm:block' : 'block'} space-y-3`}>
                  <a
                    href={data.upi_uri}
                    className="w-full py-4 bg-black text-white text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 hover:bg-neutral-800 transition shadow-md"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay Using Any UPI App</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                  <p className="text-[10px] text-neutral-500 text-center">
                    Tap to launch Google Pay, PhonePe, Paytm, CRED, or BHIM directly on your mobile device.
                  </p>
                </div>

                {/* Desktop Scannable QR Code & Mobile QR Fallback */}
                <div className={`${mobileView === 'apps' ? 'hidden sm:flex' : 'flex'} flex-col items-center justify-center pt-2`}>
                  <div className="p-3 bg-white border border-neutral-300 shadow-sm relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                    {data.qr_data_url ? (
                      <Image
                        src={data.qr_data_url}
                        alt="Direct UPI Dynamic QR Code"
                        width={280}
                        height={280}
                        className="object-contain"
                        priority
                      />
                    ) : (
                      <div className="text-xs text-neutral-400">Loading QR...</div>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-500 text-center mt-3">
                    Scan with any UPI camera or app on another device
                  </span>
                </div>

                {/* Payee Account Details (Public Safe View: No Bank Account # or IFSC) */}
                <div className="bg-[#F7F7F7] border border-[#E5E5E5] p-4 text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Verified Payee</span>
                    <span className="font-semibold text-black uppercase">{data.payee_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Receiving UPI ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-black">{data.receiving_upi_id}</span>
                      <button
                        type="button"
                        onClick={handleCopyUpiId}
                        className="p-1 text-neutral-500 hover:text-black transition"
                        title="Copy UPI ID"
                      >
                        {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Transaction Ref</span>
                    <span className="font-mono text-neutral-700">{order.order_number}</span>
                  </div>
                </div>

                <div className="text-[11px] text-neutral-500 leading-relaxed border-t border-[#E5E5E5] pt-4">
                  <strong className="text-black font-semibold uppercase block mb-1">Instructions:</strong>
                  {data.payment_instructions}
                </div>
              </div>
            </div>

            {/* Right Column: UTR Submission Form & Verification Instructions */}
            <div className="lg:col-span-5 space-y-6">
              {/* UTR Submission Box */}
              <div className="border border-[#E5E5E5] bg-[#F7F7F7] p-6 sm:p-8 space-y-5">
                <div className="pb-3 border-b border-[#E5E5E5]">
                  <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                    Step 2: Confirm Payment
                  </span>
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-black">
                    Submit 12-Digit Bank UTR
                  </h3>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed">
                  After completing the UPI transfer in your banking app, locate the <strong className="text-black">12-digit UPI Reference Number / Bank UTR</strong> on your payment receipt and enter it below.
                </p>

                {utrError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{utrError}</span>
                  </div>
                )}

                {utrSuccessMsg && (
                  <div className="p-3 bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-start gap-2">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                    <span>{utrSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitUtr} className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1.5">
                      Bank UTR / Transaction Reference (12 Digits) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 430588129482"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value.toUpperCase())}
                      disabled={isAwaitingVerification || isPaid || submittingUtr}
                      className="w-full px-3.5 py-3 bg-white border border-[#E5E5E5] text-sm font-mono tracking-wider focus:outline-hidden focus:border-black disabled:bg-neutral-100 disabled:text-neutral-500"
                    />
                    <span className="text-[10px] text-neutral-400 block mt-1">
                      Found in Google Pay / PhonePe / Paytm transaction details under &quot;UPI Ref No.&quot; or &quot;UTR&quot;.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingUtr || isPaid}
                    className="w-full py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>
                      {submittingUtr
                        ? 'Recording Reference...'
                        : isAwaitingVerification
                        ? 'Update UTR Reference'
                        : 'I Have Completed Payment'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Checking bank verification automatically...</span>
                </div>
              </div>

              {/* Safety & Guarantee Note */}
              <div className="p-4 bg-white border border-[#E5E5E5] space-y-2 text-xs text-neutral-500">
                <div className="flex items-center gap-2 text-black font-semibold text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Direct Merchant Security Assurance</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your funds transfer directly into the official brand SBI account. We never request your UPI PIN or banking passwords. Verified authenticity guaranteed by White Label Clothing.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
