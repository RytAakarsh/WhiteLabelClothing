'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  RefreshCw,
  X,
  Send,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // Modal editing state
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  const supabase = createClient();

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(*),
        history:order_status_history(*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setOrders(data);
      if (selectedOrder) {
        const updated = data.find((o) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openOrderModal = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setNewPaymentStatus(order.payment_status);
    setTrackingNumber(order.tracking_number || '');
    setAdminNotes(order.notes || '');
  };

  const handleSaveOrderStatus = async () => {
    if (!selectedOrder) return;
    setSavingStatus(true);

    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          status: newStatus,
          payment_status: newPaymentStatus,
          tracking_number: trackingNumber,
          notes: adminNotes,
        }),
      });

      if (res.ok) {
        await fetchOrders();
      }
    } catch (e) {
      console.error('Error updating order:', e);
    } finally {
      setSavingStatus(false);
    }
  };

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const numMatch = o.order_number.toLowerCase().includes(q);
      const nameMatch = o.customer_name.toLowerCase().includes(q);
      const emailMatch = o.customer_email.toLowerCase().includes(q);
      const phoneMatch = o.customer_phone.toLowerCase().includes(q);
      if (!numMatch && !nameMatch && !emailMatch && !phoneMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Fulfillment Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Order Management
          </h1>
        </div>

        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-200 transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-[#E5E5E5] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by order #, client, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-black text-white'
                  : 'bg-[#F7F7F7] text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Order #</th>
              <th className="py-3 px-4">Client</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Fulfillment</th>
              <th className="py-3 px-4">Payment</th>
              <th className="py-3 px-4">Garments</th>
              <th className="py-3 px-4 text-right">Total</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  Loading Orders...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No orders match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-black">{o.order_number}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-black">{o.customer_name}</p>
                    <p className="text-[10px] text-neutral-400">{o.customer_phone}</p>
                  </td>
                  <td className="py-3 px-4 text-neutral-500">
                    {new Date(o.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider ${
                      o.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.status === 'shipped'
                        ? 'bg-blue-100 text-blue-800'
                        : o.status === 'cancelled'
                        ? 'bg-neutral-200 text-neutral-600'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 uppercase text-[10px] font-semibold text-neutral-600">
                    {o.payment_status}
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {o.items?.length || 0} items
                  </td>
                  <td className="py-3 px-4 font-semibold text-right text-black">
                    {formatPrice(o.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openOrderModal(o)}
                      className="px-3 py-1 bg-black text-white text-[10px] uppercase tracking-wider font-semibold hover:bg-neutral-800 transition"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full border border-[#E5E5E5] p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start pb-4 border-b border-[#E5E5E5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block">
                  Order Inspector
                </span>
                <h2 className="text-xl font-serif font-bold text-black font-mono">
                  {selectedOrder.order_number}
                </h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-neutral-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Client and Shipping Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#F7F7F7] p-4 border border-[#E5E5E5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                  Client Contact
                </span>
                <p className="font-semibold text-black">{selectedOrder.customer_name}</p>
                <p className="text-neutral-600">{selectedOrder.customer_email}</p>
                <p className="text-neutral-600 font-mono">{selectedOrder.customer_phone}</p>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
                  Shipping Address
                </span>
                <p className="text-neutral-700">{selectedOrder.shipping_address_snapshot?.address_line1}</p>
                {selectedOrder.shipping_address_snapshot?.address_line2 && (
                  <p className="text-neutral-700">{selectedOrder.shipping_address_snapshot?.address_line2}</p>
                )}
                <p className="text-neutral-700">
                  {selectedOrder.shipping_address_snapshot?.city}, {selectedOrder.shipping_address_snapshot?.state} - {selectedOrder.shipping_address_snapshot?.postal_code}
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black">
                Purchased Garments
              </h3>
              <div className="divide-y divide-[#E5E5E5] border border-[#E5E5E5]">
                {selectedOrder.items?.map((it: any) => (
                  <div key={it.id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-black">{it.product_name_snapshot}</p>
                      <p className="text-neutral-400 uppercase text-[10px]">
                        Size: {it.size_snapshot} · SKU: {it.sku_snapshot || 'N/A'} · Qty: {it.quantity}
                      </p>
                    </div>
                    <span className="font-semibold">{formatPrice(it.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fulfillment Status Controls */}
            <div className="space-y-4 pt-2 border-t border-[#E5E5E5]">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-black">
                Update Fulfillment & Tracking
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Fulfillment Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold uppercase focus:outline-hidden"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Payment Status
                  </label>
                  <select
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold uppercase focus:outline-hidden"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Airway Bill / Courier Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. BlueDart AWB 789234812"
                  className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Internal Administrative Notes
                </label>
                <textarea
                  rows={2}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes regarding size verification, courier handoff, etc."
                  className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
                />
              </div>

              <button
                type="button"
                disabled={savingStatus}
                onClick={handleSaveOrderStatus}
                className="w-full py-3 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center justify-center gap-2"
              >
                <span>{savingStatus ? 'Persisting Changes...' : 'Update Order Status'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
