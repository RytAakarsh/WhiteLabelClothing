import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import { CheckCircle2, PackageCheck, Truck, ArrowRight, ShieldCheck } from 'lucide-react';

interface ConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderNumber } = await params;
  const adminClient = createAdminClient();

  const { data: order } = await adminClient
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('order_number', orderNumber)
    .maybeSingle();

  if (!order) {
    notFound();
  }

  const address = order.shipping_address_snapshot as any;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full">
        <div className="text-center space-y-4 mb-12">
          <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block">
            Order Confirmed
          </span>
          <h1 className="text-2xl sm:text-4xl font-serif uppercase tracking-wider text-black">
            Thank You for Your Order
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
            Your piece is registered with the White Label archive. We have begun inspecting and preparing your garments for express dispatch.
          </p>
        </div>

        {/* Order Details Card */}
        <div className="border border-[#E5E5E5] bg-[#F7F7F7] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between pb-6 border-b border-[#E5E5E5] gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 block">Order Number</span>
              <span className="text-sm sm:text-base font-semibold font-mono text-black">{order.order_number}</span>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 block">Status</span>
              <span className="inline-block text-xs uppercase tracking-wider font-semibold bg-black text-white px-2.5 py-0.5 mt-0.5">
                {order.status}
              </span>
            </div>
          </div>

          {/* Items Purchased */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
              Items Reserved
            </h2>
            <div className="divide-y divide-[#E5E5E5]">
              {order.items?.map((item: any) => (
                <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-black">{item.product_name_snapshot}</p>
                    <p className="text-neutral-500 uppercase tracking-wider text-[10px]">
                      Size: {item.size_snapshot} · Qty: {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold">{formatPrice(item.line_total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="pt-4 border-t border-[#E5E5E5] grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <h3 className="font-semibold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Address</span>
              </h3>
              <p className="text-neutral-700 font-medium">{address?.full_name}</p>
              <p className="text-neutral-500">{address?.address_line1}</p>
              {address?.address_line2 && <p className="text-neutral-500">{address.address_line2}</p>}
              <p className="text-neutral-500">{address?.city}, {address?.state} - {address?.postal_code}</p>
              <p className="text-neutral-500">Phone: {address?.phone}</p>
            </div>

            <div>
              <h3 className="font-semibold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Payment & Delivery</span>
              </h3>
              <p className="text-neutral-700 font-medium">Method: Cash / UPI on Delivery</p>
              <p className="text-neutral-500">Estimated Dispatch: Within 24-48 Hours</p>
              <p className="text-neutral-500">Courier: BlueDart / Delhivery Express</p>
            </div>
          </div>

          {/* Summary Breakdown */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Subtotal</span>
              <span className="font-medium text-black">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>Delivery Charges</span>
              <span className="font-medium text-black">
                {order.delivery_charge > 0 ? formatPrice(order.delivery_charge) : '₹0'}
              </span>
            </div>
            <div className="flex justify-between text-sm font-bold text-black pt-2 border-t border-neutral-300">
              <span>Total Amount</span>
              <span>{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition text-center"
          >
            Return to Home
          </Link>
          <Link
            href="/account/orders"
            className="px-8 py-3.5 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition text-center"
          >
            View Order History
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
