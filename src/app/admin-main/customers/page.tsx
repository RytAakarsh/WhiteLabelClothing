import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import { Users, Mail, Phone, ShoppingBag } from 'lucide-react';

export const revalidate = 0;

export default async function AdminCustomersPage() {
  const adminClient = createAdminClient();

  // Fetch profiles with auth metadata
  const { data: profiles } = await adminClient
    .from('profiles')
    .select(`
      id,
      full_name,
      phone,
      created_at
    `)
    .order('created_at', { ascending: false });

  // Fetch orders to compute customer spend
  const { data: orders } = await adminClient
    .from('orders')
    .select('user_id, total_amount, status');

  const customerList = (profiles || []).map((p) => {
    const userOrders = (orders || []).filter((o) => o.user_id === p.id && o.status !== 'cancelled');
    const totalSpend = userOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    return {
      id: p.id,
      name: p.full_name || 'Client',
      phone: p.phone || '—',
      joined: new Date(p.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      orderCount: userOrders.length,
      totalSpend,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Client Registry
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Customer Directory
          </h1>
        </div>
        <span className="text-xs uppercase tracking-widest text-neutral-500">
          {customerList.length} Registered Accounts
        </span>
      </div>

      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Client Name</th>
              <th className="py-3 px-4">Phone Number</th>
              <th className="py-3 px-4">Member Since</th>
              <th className="py-3 px-4">Orders Placed</th>
              <th className="py-3 px-4 text-right">Lifetime Spend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {customerList.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No registered customer profiles found.
                </td>
              </tr>
            ) : (
              customerList.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-semibold text-black">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-neutral-600">{c.phone}</td>
                  <td className="py-3 px-4 text-neutral-500">{c.joined}</td>
                  <td className="py-3 px-4 font-semibold">{c.orderCount} orders</td>
                  <td className="py-3 px-4 font-bold text-right text-black">
                    {formatPrice(c.totalSpend)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
