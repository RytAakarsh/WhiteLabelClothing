'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/lib/context/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import { Package, ArrowRight, ArrowLeft } from 'lucide-react';

export default function CustomerOrdersPage() {
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setOrders(data);
        }
        setFetching(false);
      };

      fetchOrders();
    } else if (!isLoading) {
      setFetching(false);
    }
  }, [user, isLoading]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <div className="mb-8 flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
          <div>
            <Link
              href="/account"
              className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black transition flex items-center gap-1.5 mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Account</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
              Order Archive
            </h1>
          </div>
          <span className="text-xs uppercase tracking-widest text-neutral-500">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Recorded
          </span>
        </div>

        {fetching ? (
          <div className="py-20 text-center text-xs uppercase tracking-widest text-neutral-400">
            Loading Purchases...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto border border-dashed border-[#E5E5E5] bg-[#F7F7F7]">
            <Package className="w-12 h-12 mx-auto text-neutral-400 stroke-1 mb-4" />
            <h2 className="text-base font-serif uppercase tracking-widest text-black mb-2">
              No Orders Found
            </h2>
            <p className="text-xs text-neutral-500 mb-6">
              You haven't placed any orders with White Label Clothing yet.
            </p>
            <Link
              href="/collections"
              className="px-6 py-3 bg-black text-white text-xs uppercase tracking-widest hover:bg-neutral-800 transition"
            >
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order.id}
                className="p-6 bg-[#F7F7F7] border border-[#E5E5E5] flex flex-col sm:flex-row justify-between gap-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold text-sm text-black">{order.order_number}</span>
                    <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 bg-black text-white">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                  <div className="pt-2">
                    <p className="text-xs font-medium text-black">
                      {order.items?.length || 0} {order.items?.length === 1 ? 'Garment' : 'Garments'}:
                    </p>
                    <ul className="text-xs text-neutral-600 list-disc list-inside mt-1">
                      {order.items?.map((it: any) => (
                        <li key={it.id}>
                          {it.product_name_snapshot} ({it.size_snapshot}) × {it.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col justify-between sm:items-end border-t sm:border-t-0 pt-3 sm:pt-0 border-[#E5E5E5]">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-neutral-400 block sm:text-right">Total</span>
                    <span className="text-lg font-bold text-black sm:text-right block">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                  <Link
                    href={`/checkout/confirmation/${order.order_number}`}
                    className="mt-4 sm:mt-0 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest font-semibold hover:underline"
                  >
                    <span>View Confirmation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
