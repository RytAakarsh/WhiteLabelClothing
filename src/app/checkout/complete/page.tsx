'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { formatPrice } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface OrderStatusData {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_gateway: string;
  payment_reference: string | null;
  settlement_status: string | null;
  payment_verified_at: string | null;
  created_at: string;
}

function CompleteContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('orderNumber') || '';
  const isStaged = searchParams.get('staged') === 'true';

  const [order, setOrder] = useState<OrderStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const fetchStatus = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/status/${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Unable to retrieve order details.');
      }
    } catch (err: any) {
      setError(err.message || 'Error checking order status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [orderId]);

  // Auto-poll up to 5 times if payment is still pending (giving webhooks time to deliver)
  useEffect(() => {
    if (order && (order.payment_status === 'pending' || order.payment_status === 'awaiting_verification') && pollCount < 5) {
      const timer = setTimeout(() => {
        setPollCount((prev) => prev + 1);
        fetchStatus();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [order, pollCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-neutral-600">Verifying Payment Status...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <AlertCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif uppercase tracking-wider mb-3">Order Status Inquiry</h1>
          <p className="text-xs text-neutral-500 mb-8">{error || 'Order identifier could not be verified.'}</p>
          <div className="flex justify-center gap-4">
            <Link
              href="/account/orders"
              className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
            >
              My Orders
            </Link>
            <Link
              href="/collections"
              className="px-6 py-3 border border-neutral-300 text-black text-xs uppercase tracking-widest hover:border-black transition"
            >
              Back to Shop
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid' || order.settlement_status === 'reconciled';
  const isAwaiting = order.payment_status === 'awaiting_verification' || order.settlement_status === 'observed';
  const isPending = order.payment_status === 'pending';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full">
        {/* Status Card */}
        <div className="border border-[#E5E5E5] bg-[#F7F7F7] p-8 sm:p-12 text-center space-y-6">
          {/* Icon & Heading */}
          {isPaid ? (
            <div>
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                Payment Reconciled & Confirmed
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                Thank You for Your Order
              </h1>
            </div>
          ) : isAwaiting ? (
            <div>
              <div className="w-16 h-16 bg-neutral-900 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-600 font-semibold mb-1">
                Payment Received — Verification Pending
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                UPI Payment Received
              </h1>
            </div>
          ) : (
            <div>
              <div className="w-16 h-16 bg-neutral-200 text-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold mb-1">
                Payment Verification Window
              </p>
              <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
                Order Placed Successfully
              </h1>
            </div>
          )}

          {/* Explanation message */}
          <div className="max-w-lg mx-auto text-xs text-neutral-600 leading-relaxed">
            {isPaid ? (
              <p>
                Your payment of <strong className="text-black">{formatPrice(order.total_amount)}</strong> has been
                authoritatively matched against the official bank settlement records. Your garments are now queued for
                express preparation.
              </p>
            ) : isAwaiting ? (
              <p>
                Our banking observer has recorded your incoming UPI transaction. The order is securely registered, and
                will be marked as fully settled as soon as our daily bank statement reconciliation runs.
                <span className="block mt-2 font-medium text-black">
                  You do not need to make another payment.
                </span>
              </p>
            ) : isStaged ? (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xs text-left">
                <strong>Staging Environment Notice:</strong> The self-hosted YouPI PG gateway VPS is currently
                operating in mock/disabled mode. Live UPI vector QR generation will activate as soon as the VPS endpoint
                at <code className="bg-amber-100 px-1 py-0.5">pay.whitelabelclothing.in</code> is connected.
              </div>
            ) : (
              <p>
                If you completed the UPI transfer via GPay, PhonePe, or Paytm, please allow up to 2 minutes for bank SMS
                and push notification observers to attribute your payment.
              </p>
            )}
          </div>

          {/* Details Table */}
          <div className="bg-white border border-[#E5E5E5] p-5 text-left text-xs space-y-3 max-w-md mx-auto">
            <div className="flex justify-between pb-2 border-b border-[#F0F0F0]">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Order Number</span>
              <span className="font-semibold text-black font-mono">{order.order_number}</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-[#F0F0F0]">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Payment Method</span>
              <span className="font-medium text-black uppercase">{order.payment_gateway.toUpperCase()} (UPI)</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-[#F0F0F0]">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Amount Total</span>
              <span className="font-bold text-black">{formatPrice(order.total_amount)}</span>
            </div>
            {order.payment_reference && (
              <div className="flex justify-between pb-2 border-b border-[#F0F0F0]">
                <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Bank UTR / Ref</span>
                <span className="font-mono text-black">{order.payment_reference}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-500 uppercase tracking-wider text-[10px]">Settlement Status</span>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-xs ${
                  isPaid
                    ? 'bg-emerald-100 text-emerald-800'
                    : isAwaiting
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {order.settlement_status || order.payment_status}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => fetchStatus()}
              className="px-6 py-3 border border-neutral-300 text-black text-xs uppercase tracking-widest font-semibold hover:border-black transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
            <Link
              href={`/checkout/confirmation/${order.order_number}`}
              className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
            >
              <span>View Order Confirmation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-black" />
            <span>256-Bit Cryptographically Signed Gateway Session</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
