import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import {
  CheckCircle2,
  PackageCheck,
  Truck,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  FileQuestion,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ConfirmationPageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderConfirmationPage({ params }: ConfirmationPageProps) {
  const { orderId } = await params;

  // 1. Check logged-in user session
  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  // 2. Query order confirmation using resilient database RPC
  const adminClient = createAdminClient();
  const { data: order, error: rpcError } = await adminClient.rpc('get_order_confirmation', {
    p_order_ref: orderId,
  });

  // 3. Fallback direct query if RPC returned null and user has access
  let finalOrder = order;
  if (!finalOrder) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let directQuery = adminClient
      .from('orders')
      .select('*, items:order_items(*)');

    if (isUuid) {
      directQuery = directQuery.or(`id.eq.${orderId},order_number.eq.${orderId}`);
    } else {
      directQuery = directQuery.eq('order_number', orderId);
    }

    const { data: directData } = await directQuery.maybeSingle();
    finalOrder = directData;
  }

  // 4. Handle Order Not Found with branded editorial UI
  if (!finalOrder) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center w-full">
          <div className="w-16 h-16 bg-[#F7F7F7] border border-[#E5E5E5] text-black rounded-full flex items-center justify-center mx-auto mb-6">
            <FileQuestion className="w-8 h-8 text-neutral-400 stroke-1" />
          </div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2 font-mono">
            Archive Lookup
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black mb-3">
            Order Not Found
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed mb-8">
            We could not locate an order matching reference{' '}
            <code className="font-mono text-black font-semibold bg-neutral-100 px-2 py-0.5 border border-neutral-200">
              {orderId}
            </code>
            . Please verify the link or check your purchase history.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/account/orders"
              className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
            >
              View My Orders
            </Link>
            <Link
              href="/collections"
              className="px-8 py-3.5 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // 5. Authorization check: if order belongs to a user, ensure caller is authorized
  if (finalOrder.user_id && currentUser && currentUser.id !== finalOrder.user_id) {
    // Check if current user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return (
        <div className="min-h-screen flex flex-col bg-white">
          <Header />
          <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center w-full">
            <div className="w-16 h-16 bg-[#F7F7F7] border border-[#E5E5E5] text-black rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-7 h-7 text-neutral-500 stroke-1" />
            </div>
            <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-2 font-mono">
              Confidentiality Notice
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black mb-3">
              Protected Order Details
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed mb-8">
              This order is registered under a different White Label account. Please sign in with the corresponding credentials to view full details.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
              >
                Sign In to Another Account
              </Link>
              <Link
                href="/"
                className="px-8 py-3.5 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
              >
                Return Home
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      );
    }
  }

  const address = (finalOrder.shipping_address_snapshot as any) || {};
  const isCod = finalOrder.payment_status === 'pending';
  const orderDate = new Date(finalOrder.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 w-full">
        {/* Editorial Heading */}
        <div className="text-center space-y-4 mb-10 sm:mb-12">
          <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block font-mono">
            Order Confirmed · Archive Registered
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
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between pb-6 border-b border-[#E5E5E5] gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 block font-mono">
                Order ID
              </span>
              <span className="text-base sm:text-lg font-semibold font-mono text-black">
                {finalOrder.order_number}
              </span>
              <span className="text-[11px] text-neutral-500 block mt-0.5">
                Placed on {orderDate}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-[10px] uppercase tracking-widest text-neutral-400 block font-mono">
                Order Status
              </span>
              <span className="inline-block text-xs uppercase tracking-wider font-semibold bg-black text-white px-3 py-1 mt-1">
                {finalOrder.status}
              </span>
            </div>
          </div>

          {/* Payment & Delivery Notice */}
          <div className="p-4 bg-white border border-[#E5E5E5] text-xs space-y-2">
            <div className="flex items-center gap-2 font-semibold text-black uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              <span>Payment Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-neutral-600 pt-1">
              <p>
                <strong className="text-black font-semibold">Payment Method:</strong> Cash on Delivery
              </p>
              <p>
                <strong className="text-black font-semibold">Payment Status:</strong>{' '}
                <span className="text-amber-800 font-medium">
                  {isCod ? 'Pending — Pay on Delivery' : finalOrder.payment_status}
                </span>
              </p>
            </div>
          </div>

          {/* Items Reserved */}
          <div className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black flex items-center gap-2">
              <PackageCheck className="w-4 h-4" />
              <span>Ordered Garments ({finalOrder.items?.length || 0})</span>
            </h2>
            <div className="divide-y divide-[#E5E5E5] bg-white border border-[#E5E5E5] px-4">
              {finalOrder.items?.map((item: any) => {
                const itemImage = item.image_url || '/images/brand-logo.png';
                return (
                  <div key={item.id} className="py-4 flex gap-4 items-center">
                    <div className="relative w-16 h-20 bg-[#F7F7F7] border border-[#E5E5E5] shrink-0 overflow-hidden">
                      <Image
                        src={itemImage}
                        alt={item.product_name_snapshot}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-black text-xs sm:text-sm truncate">
                        {item.product_name_snapshot}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500 mt-1 uppercase tracking-wider">
                        <span>Size: <strong className="text-black">{item.size_snapshot}</strong></span>
                        <span>•</span>
                        <span>Qty: <strong className="text-black">{item.quantity}</strong></span>
                        <span>•</span>
                        <span>Unit: <strong className="text-black">{formatPrice(item.unit_price_snapshot)}</strong></span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-semibold text-xs sm:text-sm text-black">
                        {formatPrice(item.line_total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delivery & Customer Info */}
          <div className="pt-4 border-t border-[#E5E5E5] grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div>
              <h3 className="font-semibold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Address</span>
              </h3>
              <p className="text-neutral-900 font-semibold">{address.full_name || finalOrder.customer_name}</p>
              <p className="text-neutral-600 mt-0.5">{address.address_line1}</p>
              {address.address_line2 && <p className="text-neutral-600">{address.address_line2}</p>}
              <p className="text-neutral-600">
                {address.city}, {address.state} - {address.postal_code}
              </p>
              <p className="text-neutral-600">{address.country || 'India'}</p>
            </div>

            <div>
              <h3 className="font-semibold uppercase tracking-wider text-black mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Customer & Logistics</span>
              </h3>
              <p className="text-neutral-600">
                <strong className="text-black font-medium">Customer:</strong> {finalOrder.customer_name}
              </p>
              <p className="text-neutral-600 mt-1">
                <strong className="text-black font-medium">Phone:</strong> {finalOrder.customer_phone || address.phone}
              </p>
              <p className="text-neutral-600 mt-1">
                <strong className="text-black font-medium">Email:</strong> {finalOrder.customer_email}
              </p>
              <p className="text-neutral-500 text-[11px] mt-2">
                Estimated Dispatch: Within 24-48 Hours via BlueDart / Delhivery Express
              </p>
            </div>
          </div>

          {/* Order Summary Breakdown */}
          <div className="pt-4 border-t border-[#E5E5E5] space-y-2 text-xs">
            <div className="flex justify-between text-neutral-600">
              <span>Product Subtotal</span>
              <span className="font-medium text-black">{formatPrice(finalOrder.subtotal)}</span>
            </div>
            {finalOrder.discount_total > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied</span>
                <span>-{formatPrice(finalOrder.discount_total)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600">
              <span>Delivery Charges (₹99 × Item Units)</span>
              <span className="font-medium text-black">
                {finalOrder.delivery_charge > 0 ? formatPrice(finalOrder.delivery_charge) : '₹0'}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-black pt-3 border-t border-neutral-300">
              <span>Final Order Amount</span>
              <span>{formatPrice(finalOrder.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/collections"
            className="px-8 py-3.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition text-center"
          >
            Continue Shopping
          </Link>
          <Link
            href="/account/orders"
            className="px-8 py-3.5 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition text-center"
          >
            View My Orders
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
