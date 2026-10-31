import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminSupabaseConfig } from '@/lib/supabase/config';
import { verifyAdminSession } from '@/lib/auth/admin';
import { formatPrice } from '@/lib/utils';
import {
  Shirt,
  ShoppingBag,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  Tag,
  ArrowRight,
  TrendingUp,
  Package,
} from 'lucide-react';

export const revalidate = 0; // Fresh metrics on load

export default async function AdminDashboardPage() {
  let allProducts: any[] = [];
  let variants: any[] = [];
  let activeOffersCount = 0;
  let totalCustomers = 0;
  let allOrders: any[] = [];
  let isFallbackMode = false;

  try {
    const authResult = await verifyAdminSession();
    const adminConfig = getAdminSupabaseConfig();
    isFallbackMode = adminConfig.isFallback && !authResult?.isServiceRole;
    const client = authResult?.client || createAdminClient();

    // 1. Total products & 2. Total published products
    const { data: productsData } = await client
      .from('products')
      .select('id, status, category_id, base_price, categories(slug)');
    allProducts = productsData || [];

    // Variants stock analysis: 12. Low stock & 13. Out of stock
    const { data: variantsData } = await client
      .from('product_variants')
      .select('id, stock_quantity, size, product_id');
    variants = variantsData || [];

    // 14. Active offers
    const { count: offersCount } = await client
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    activeOffersCount = offersCount || 0;

    // 11. Total registered customers
    const { count: customersCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    totalCustomers = customersCount || 0;

    // Orders metrics
    const { data: ordersData } = await client
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    allOrders = ordersData || [];
  } catch (err) {
    console.error('[AdminDashboardPage] Error fetching dashboard telemetry:', err);
  }

  const totalProducts = allProducts.length;
  const publishedProducts = allProducts.filter((p) => p.status === 'published').length;

  // 3. Sweatshirts & 4. Jackets
  const sweatshirtCount = allProducts.filter((p: any) => p.categories?.slug === 'sweatshirts').length;
  const jacketCount = allProducts.filter((p: any) => p.categories?.slug === 'jackets').length;

  const outOfStockCount = variants.filter((v) => v.stock_quantity === 0).length;
  const lowStockCount = variants.filter((v) => v.stock_quantity > 0 && v.stock_quantity <= 3).length;

  const totalOrders = allOrders.length;

  // Calculate "today" start in IST
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const startOfTodayIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - istOffset);

  const ordersToday = allOrders.filter((o) => new Date(o.created_at) >= startOfTodayIst).length;
  const pendingOrders = allOrders.filter((o) => o.status === 'pending').length;
  const shippedOrders = allOrders.filter((o) => o.status === 'shipped').length;
  const completedOrders = allOrders.filter((o) => o.status === 'delivered').length;
  const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled').length;

  const grossRevenue = allOrders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total_amount || 0), 0);

  const recentOrders = allOrders.slice(0, 5);

  return (
    <div className="space-y-8">
      {isFallbackMode && (
        <div className="p-4 bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Deployment Environment Notice:</strong> <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is not configured in Cloudflare Pages environment variables. Store telemetry is currently restricted by Row Level Security. Add <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in Cloudflare Pages Settings &gt; Environment variables to unlock privileged metrics.
            </span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-[#E5E5E5] gap-4">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Overview & Telemetry
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Store Performance
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin-main/products/new"
            className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            + Add New Product
          </Link>
          <Link
            href="/admin-main/orders"
            className="px-4 py-2 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
          >
            Manage Orders
          </Link>
        </div>
      </div>

      {/* Revenue Banner */}
      <div className="p-6 bg-black text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block">
            Gross Order Value (Non-Cancelled)
          </span>
          <span className="text-2xl sm:text-4xl font-bold font-serif tracking-tight mt-1 block">
            {formatPrice(grossRevenue)}
          </span>
        </div>
        <div className="text-right text-xs text-neutral-400">
          <p>Store Currency: <span className="text-white font-mono font-semibold">INR (₹)</span></p>
          <p>Calculated in integer minor units (paise)</p>
        </div>
      </div>

      {/* The 14 Required Metric Cards */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Catalog & Inventory Telemetry
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* 1. Published Products */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Published Items</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{publishedProducts}</span>
          </div>

          {/* 2. Total Products */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Total Saved</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{totalProducts}</span>
          </div>

          {/* 3. Sweatshirts */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Sweatshirts</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{sweatshirtCount}</span>
          </div>

          {/* 4. Jackets */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Jackets</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{jacketCount}</span>
          </div>

          {/* 12. Low Stock */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 font-medium">Low-Stock (≤3)</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-amber-700">{lowStockCount}</span>
          </div>

          {/* 13. Out of Stock */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-red-600 font-medium">Out-of-Stock</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-red-600">{outOfStockCount}</span>
          </div>

          {/* 14. Active Offers */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Active Offers</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{activeOffersCount || 0}</span>
          </div>
        </div>
      </div>

      {/* Orders Telemetry */}
      <div className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Order & Customer Telemetry
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
          {/* 5. Placed Today */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Orders Today</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{ordersToday}</span>
          </div>

          {/* 6. Total Orders */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Lifetime Orders</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{totalOrders}</span>
          </div>

          {/* 7. Pending / Processing */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-amber-700 font-medium">Awaiting Dispatch</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-amber-700">{pendingOrders}</span>
          </div>

          {/* 8. Shipped */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-blue-700 font-medium">Shipped</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-blue-700">{shippedOrders}</span>
          </div>

          {/* 9. Completed */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-medium">Completed</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-emerald-700">{completedOrders}</span>
          </div>

          {/* 10. Cancelled */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Cancelled</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-neutral-500">{cancelledOrders}</span>
          </div>

          {/* 11. Registered Customers */}
          <div className="p-4 bg-white border border-[#E5E5E5] flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">Customers</span>
            <span className="text-xl sm:text-2xl font-bold mt-2 text-black">{totalCustomers || 0}</span>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white border border-[#E5E5E5] p-6">
        <div className="flex justify-between items-center pb-4 border-b border-[#E5E5E5] mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-black">
            Recent Client Orders
          </h2>
          <Link
            href="/admin-main/orders"
            className="text-xs uppercase tracking-widest font-semibold hover:underline flex items-center gap-1"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs uppercase tracking-widest text-neutral-400">
            No orders placed yet. Live orders will populate automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest">
                  <th className="py-3 px-2">Order #</th>
                  <th className="py-3 px-2">Customer</th>
                  <th className="py-3 px-2">Date (IST)</th>
                  <th className="py-3 px-2">Fulfillment</th>
                  <th className="py-3 px-2">Payment</th>
                  <th className="py-3 px-2 text-right">Total</th>
                  <th className="py-3 px-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-neutral-50">
                    <td className="py-3 px-2 font-mono font-semibold text-black">{o.order_number}</td>
                    <td className="py-3 px-2 font-medium">{o.customer_name}</td>
                    <td className="py-3 px-2 text-neutral-500">
                      {new Date(o.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider ${
                        o.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                        o.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        o.status === 'cancelled' ? 'bg-neutral-200 text-neutral-600' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-neutral-600 uppercase text-[10px] font-medium">
                      {o.payment_status}
                    </td>
                    <td className="py-3 px-2 font-semibold text-right text-black">
                      {formatPrice(o.total_amount)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <Link
                        href={`/admin-main/orders?id=${o.id}`}
                        className="text-black underline font-semibold hover:opacity-60"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
