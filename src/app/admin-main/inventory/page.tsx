'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Search, AlertTriangle, Check, RefreshCw, ArrowUpRight } from 'lucide-react';

export default function AdminInventoryPage() {
  const [variants, setVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newStockMap, setNewStockMap] = useState<{ [id: string]: number }>({});

  const supabase = createClient();

  const fetchInventory = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_variants')
      .select(`
        id,
        size,
        sku,
        stock_quantity,
        is_active,
        product:products (
          id,
          name,
          slug,
          status,
          category:categories(name)
        )
      `)
      .order('stock_quantity', { ascending: true });

    if (data) {
      setVariants(data);
      const stockMap: any = {};
      data.forEach((v) => {
        stockMap[v.id] = v.stock_quantity;
      });
      setNewStockMap(stockMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async (variantId: string) => {
    setUpdatingId(variantId);
    try {
      const res = await fetch('/api/admin/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: variantId,
          stock_quantity: newStockMap[variantId],
        }),
      });

      if (res.ok) {
        setVariants((prev) =>
          prev.map((v) =>
            v.id === variantId ? { ...v, stock_quantity: newStockMap[variantId] } : v
          )
        );
      }
    } catch (e) {
      console.error('Error updating stock:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = variants.filter((v) => {
    if (filter === 'low' && (v.stock_quantity === 0 || v.stock_quantity > 3)) return false;
    if (filter === 'out' && v.stock_quantity > 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const nameMatch = v.product?.name?.toLowerCase().includes(q);
      const skuMatch = v.sku?.toLowerCase().includes(q);
      if (!nameMatch && !skuMatch) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Variant-Level Stock
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Inventory Controller
          </h1>
        </div>

        <button
          onClick={fetchInventory}
          className="px-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-200 transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white border border-[#E5E5E5] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search garment or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition ${
              filter === 'all' ? 'bg-black text-white' : 'bg-[#F7F7F7] text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All ({variants.length})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition ${
              filter === 'low' ? 'bg-amber-600 text-white' : 'bg-[#F7F7F7] text-amber-700 hover:bg-neutral-200'
            }`}
          >
            Low Stock (≤3)
          </button>
          <button
            onClick={() => setFilter('out')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold transition ${
              filter === 'out' ? 'bg-red-600 text-white' : 'bg-[#F7F7F7] text-red-600 hover:bg-neutral-200'
            }`}
          >
            Out of Stock (0)
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">SKU</th>
              <th className="py-3 px-4">Current Stock</th>
              <th className="py-3 px-4">Adjust Units</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  Loading Inventory...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No inventory variants match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-semibold text-black">
                    <Link
                      href={`/admin-main/products/${v.product?.id}/edit`}
                      className="hover:underline flex items-center gap-1.5"
                    >
                      <span>{v.product?.name || 'Unknown Product'}</span>
                      <ArrowUpRight className="w-3 h-3 text-neutral-400" />
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-black">{v.size}</td>
                  <td className="py-3 px-4 font-mono text-neutral-500">{v.sku || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block font-semibold px-2 py-0.5 text-[11px] ${
                      v.stock_quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : v.stock_quantity <= 3
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {v.stock_quantity} in stock
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={newStockMap[v.id] ?? v.stock_quantity}
                        onChange={(e) =>
                          setNewStockMap({
                            ...newStockMap,
                            [v.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-20 px-2 py-1 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold focus:border-black focus:outline-hidden"
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleUpdateStock(v.id)}
                      disabled={updatingId === v.id || newStockMap[v.id] === v.stock_quantity}
                      className={`px-3 py-1 text-[10px] uppercase font-semibold tracking-wider transition ${
                        newStockMap[v.id] !== v.stock_quantity
                          ? 'bg-black text-white hover:bg-neutral-800'
                          : 'bg-[#F7F7F7] text-neutral-400 cursor-not-allowed'
                      }`}
                    >
                      {updatingId === v.id ? 'Updating...' : 'Save Stock'}
                    </button>
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
