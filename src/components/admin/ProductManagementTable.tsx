'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Product, Category } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import {
  Search,
  Plus,
  Edit,
  Archive,
  Trash2,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ProductManagementTableProps {
  initialProducts: any[];
  categories: Category[];
}

export default function ProductManagementTable({
  initialProducts,
  categories,
}: ProductManagementTableProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all') {
        if (p.category_id !== selectedCategory && p.category?.slug !== selectedCategory) return false;
      }

      if (selectedStatus !== 'all') {
        if (p.status !== selectedStatus) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesSku) return false;
      }

      return true;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

  // Handle Quick Status Toggle (Draft <-> Published)
  const handleToggleStatus = async (product: any) => {
    const newStatus = product.status === 'published' ? 'draft' : 'published';
    setActionLoading(product.id);

    try {
      const res = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          name: product.name,
          slug: product.slug,
          status: newStatus,
          base_price: product.base_price,
          category_id: product.category_id,
        }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
        );
        router.refresh();
      }
    } catch (err) {
      console.error('Status toggle error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Archive / Delete
  const handleDeleteOrArchive = async (product: any) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete or archive "${product.name}"? If it is referenced in past orders, it will be safely archived to preserve customer records.`
    );
    if (!confirmed) return;

    setActionLoading(product.id);

    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== product.id));
        router.refresh();
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Product Archive
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Catalog Management
          </h1>
        </div>

        <Link
          href="/admin-main/products/new"
          className="px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Product</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E5E5E5] p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="py-2 px-3 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider focus:outline-hidden focus:border-black"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider focus:outline-hidden focus:border-black"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Table view */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Garment</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Price (INR)</th>
              <th className="py-3 px-4">Variants & Stock</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Merchandising</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No products found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((prod) => {
                const primaryImage =
                  prod.images?.find((img: any) => img.is_primary)?.storage_path ||
                  prod.images?.[0]?.storage_path ||
                  '/images/brand-logo.png';

                const totalStock = prod.variants?.reduce(
                  (sum: number, v: any) => sum + (v.stock_quantity || 0),
                  0
                ) ?? 0;

                const variantSizes = prod.variants?.map((v: any) => v.size).join(', ') || 'None';

                return (
                  <tr key={prod.id} className="hover:bg-neutral-50 transition">
                    {/* Garment / Thumbnail */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-14 bg-[#F7F7F7] border border-[#E5E5E5] flex-shrink-0">
                          <Image
                            src={primaryImage}
                            alt={prod.name}
                            fill
                            className="object-contain p-1"
                          />
                        </div>
                        <div>
                          <Link
                            href={`/admin-main/products/${prod.id}/edit`}
                            className="font-semibold text-black hover:underline line-clamp-1"
                          >
                            {prod.name}
                          </Link>
                          <span className="text-[10px] font-mono text-neutral-400 uppercase">
                            SKU: {prod.sku || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 uppercase text-[11px] font-medium text-neutral-600">
                      {prod.category?.name || 'Unassigned'}
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 font-semibold text-black">
                      {prod.base_price > 0 ? formatPrice(prod.base_price) : <span className="text-neutral-400">Not set</span>}
                    </td>

                    {/* Variants & Stock */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <span className={`inline-block font-semibold ${
                          totalStock === 0 ? 'text-red-600' : totalStock <= 3 ? 'text-amber-600' : 'text-black'
                        }`}>
                          {totalStock} {totalStock === 1 ? 'unit' : 'units'}
                        </span>
                        <p className="text-[10px] text-neutral-400 uppercase">
                          Sizes: {variantSizes}
                        </p>
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(prod)}
                        disabled={actionLoading === prod.id}
                        className={`px-2.5 py-1 text-[10px] uppercase font-semibold tracking-wider rounded-xs transition ${
                          prod.status === 'published'
                            ? 'bg-black text-white hover:bg-neutral-800'
                            : prod.status === 'draft'
                            ? 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
                            : 'bg-red-100 text-red-800'
                        }`}
                        title="Click to toggle between Published and Draft"
                      >
                        {actionLoading === prod.id ? 'Updating...' : prod.status}
                      </button>
                    </td>

                    {/* Merchandising Badges */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {prod.is_featured && (
                          <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 text-black">
                            Featured
                          </span>
                        )}
                        {prod.is_new_arrival && (
                          <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 bg-neutral-100 border border-neutral-300 text-black">
                            New
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin-main/products/${prod.id}/edit`}
                          className="p-1.5 text-neutral-500 hover:text-black transition"
                          title="Edit product"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteOrArchive(prod)}
                          disabled={actionLoading === prod.id}
                          className="p-1.5 text-neutral-400 hover:text-red-600 transition"
                          title="Archive or Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
