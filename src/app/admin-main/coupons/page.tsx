'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Trash2,
  Copy,
  AlertCircle,
  Clock,
  Sparkles,
  Truck,
  UserCheck,
  Calendar,
  Layers,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { Coupon } from '@/lib/types';

interface CouponFormState {
  id?: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number | '';
  max_discount_inr: number | '';
  min_order_inr: number | '';
  usage_limit: number | '';
  per_customer_limit: number | '';
  starts_at: string;
  expires_at: string;
  first_order_only: boolean;
  free_shipping: boolean;
  is_active: boolean;
}

const initialFormState: CouponFormState = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  max_discount_inr: 500,
  min_order_inr: 1000,
  usage_limit: '',
  per_customer_limit: 1,
  starts_at: new Date().toISOString().slice(0, 10),
  expires_at: '',
  first_order_only: false,
  free_shipping: false,
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [stats, setStats] = useState({
    total_coupons: 0,
    total_active: 0,
    total_redemptions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'expired'>('all');
  const [sortOrder, setSortOrder] = useState<'created_at_desc' | 'created_at_asc' | 'usage_desc'>('created_at_desc');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CouponFormState>(initialFormState);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sortOrder) params.set('sort', sortOrder);

      const res = await fetch(`/api/admin/coupons?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setCoupons(data.coupons || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to load coupons.' });
      }
    } catch (err) {
      console.error('Error fetching coupons:', err);
      setFeedbackMessage({ type: 'error', text: 'Network error while loading coupons.' });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sortOrder]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Handle open create modal
  const handleOpenCreate = () => {
    setEditingCoupon(null);
    setFormData(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle open edit modal
  const handleOpenEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      max_discount_inr: coupon.max_discount_paise ? coupon.max_discount_paise / 100 : '',
      min_order_inr: coupon.minimum_order_paise ? coupon.minimum_order_paise / 100 : '',
      usage_limit: coupon.usage_limit ?? '',
      per_customer_limit: coupon.per_customer_limit ?? '',
      starts_at: coupon.starts_at ? coupon.starts_at.slice(0, 10) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
      first_order_only: coupon.first_order_only,
      free_shipping: coupon.free_shipping,
      is_active: coupon.is_active,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle save (Create or Update)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const cleanCode = formData.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!cleanCode || cleanCode.length < 3) {
        setFormError('Coupon code must be at least 3 alphanumeric characters.');
        setSaving(false);
        return;
      }

      if (formData.discount_value === '' || Number(formData.discount_value) <= 0) {
        setFormError('Please enter a valid positive discount value.');
        setSaving(false);
        return;
      }

      if (formData.discount_type === 'percentage' && Number(formData.discount_value) > 100) {
        setFormError('Percentage discount cannot exceed 100%.');
        setSaving(false);
        return;
      }

      if (
        formData.discount_type === 'percentage' &&
        formData.max_discount_inr !== '' &&
        Number(formData.max_discount_inr) <= 0
      ) {
        setFormError('Maximum discount cap must be greater than zero.');
        setSaving(false);
        return;
      }

      if (formData.min_order_inr !== '' && Number(formData.min_order_inr) < 0) {
        setFormError('Minimum order value cannot be negative.');
        setSaving(false);
        return;
      }

      if (formData.usage_limit !== '' && Number(formData.usage_limit) <= 0) {
        setFormError('Global usage limit must be at least 1.');
        setSaving(false);
        return;
      }

      if (formData.per_customer_limit !== '' && Number(formData.per_customer_limit) <= 0) {
        setFormError('Per-customer limit must be at least 1.');
        setSaving(false);
        return;
      }

      if (formData.starts_at && formData.expires_at) {
        const start = new Date(formData.starts_at);
        const end = new Date(formData.expires_at);
        if (end < start) {
          setFormError('Expiration date must be later than or equal to the start date.');
          setSaving(false);
          return;
        }
      }

      const payload = {
        code: cleanCode,
        description: formData.description.trim(),
        discount_type: formData.discount_type,
        discount_value: Number(formData.discount_value),
        max_discount_paise:
          formData.discount_type === 'percentage' && formData.max_discount_inr !== ''
            ? Math.round(Number(formData.max_discount_inr) * 100)
            : null,
        minimum_order_paise:
          formData.min_order_inr !== '' ? Math.round(Number(formData.min_order_inr) * 100) : 0,
        usage_limit: formData.usage_limit !== '' ? parseInt(String(formData.usage_limit), 10) : null,
        per_customer_limit:
          formData.per_customer_limit !== '' ? parseInt(String(formData.per_customer_limit), 10) : null,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        first_order_only: formData.first_order_only,
        free_shipping: formData.free_shipping,
        is_active: formData.is_active,
      };

      const isEdit = Boolean(editingCoupon);
      const url = isEdit ? `/api/admin/coupons/${editingCoupon!.id}` : '/api/admin/coupons';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFormError(data.error || 'Failed to save coupon.');
        return;
      }

      setFeedbackMessage({
        type: 'success',
        text: isEdit ? `Coupon ${cleanCode} updated successfully.` : `Coupon ${cleanCode} created successfully.`,
      });

      setIsModalOpen(false);
      fetchCoupons();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const nextStatus = !coupon.is_active;
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, is_active: nextStatus } : c))
        );
        setFeedbackMessage({
          type: 'success',
          text: `Coupon ${coupon.code} is now ${nextStatus ? 'ACTIVE' : 'INACTIVE'}.`,
        });
        // Refresh stats
        fetchCoupons();
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch (err) {
      console.error('Error toggling coupon status:', err);
      setFeedbackMessage({ type: 'error', text: 'Failed to update status.' });
    }
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Coupon ${deleteTarget.code} has been archived.`,
        });
        setDeleteTarget(null);
        fetchCoupons();
      } else {
        setFeedbackMessage({ type: 'error', text: data.error || 'Failed to archive coupon.' });
      }
    } catch (err) {
      console.error('Error deleting coupon:', err);
      setFeedbackMessage({ type: 'error', text: 'Network error while deleting coupon.' });
    } finally {
      setDeleting(false);
    }
  };

  // Copy code helper
  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Format currency
  const formatInr = (paise: number) => {
    return `₹${(paise / 100).toLocaleString('en-IN')}`;
  };

  // Helper to check expiration
  const isExpired = (coupon: Coupon) => {
    return Boolean(coupon.expires_at && new Date(coupon.expires_at) < new Date());
  };

  return (
    <div className="space-y-6 max-w-7xl pb-12">
      {/* Top Banner / Feedback Message */}
      {feedbackMessage && (
        <div
          className={`p-4 text-xs font-semibold uppercase tracking-wider flex items-center justify-between border ${
            feedbackMessage.type === 'success'
              ? 'bg-black text-white border-black'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="hover:opacity-75 transition"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Marketing & Promotions
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black flex items-center gap-3">
            <span>Coupons & Vouchers</span>
            <span className="text-xs font-sans tracking-widest font-normal text-neutral-400 bg-neutral-100 px-2 py-0.5 border border-neutral-200">
              {stats.total_coupons} TOTAL
            </span>
          </h1>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-5 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon</span>
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E5E5] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Total Coupons
            </span>
            <Ticket className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-serif text-black mt-2 font-medium">{stats.total_coupons}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">
            Configured promotions
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Active Coupons
            </span>
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-serif text-black mt-2 font-medium">{stats.total_active}</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-600 mt-1">
            Currently redeemable
          </p>
        </div>

        <div className="bg-white border border-[#E5E5E5] p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
              Total Redemptions
            </span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-serif text-black mt-2 font-medium">{stats.total_redemptions}</p>
          <p className="text-[10px] uppercase tracking-wider text-neutral-400 mt-1">
            Orders discounted
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-[#E5E5E5] p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH BY COUPON CODE (E.G. WELCOME10)..."
            className="w-full pl-9 pr-4 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider focus:outline-hidden focus:border-black transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex border border-[#E5E5E5] bg-[#F7F7F7] p-0.5 text-xs font-semibold">
            {(['all', 'active', 'inactive', 'expired'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 uppercase tracking-wider transition ${
                  statusFilter === tab
                    ? 'bg-black text-white shadow-xs'
                    : 'text-neutral-500 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs uppercase tracking-wider text-neutral-700 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="created_at_desc">Newest First</option>
              <option value="created_at_asc">Oldest First</option>
              <option value="usage_desc">Most Used</option>
            </select>
          </div>

          <button
            onClick={() => fetchCoupons()}
            className="p-2 border border-[#E5E5E5] bg-[#F7F7F7] text-neutral-600 hover:text-black hover:border-black transition"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs uppercase tracking-widest text-neutral-500 font-semibold">
              Loading Coupons...
            </p>
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto text-neutral-400">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-black">
                No coupons found
              </p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                {search || statusFilter !== 'all'
                  ? 'No coupon codes match your active search and filter criteria.'
                  : 'Get started by creating your first promotional coupon or discount voucher.'}
              </p>
            </div>
            {!search && statusFilter === 'all' && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Coupon</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F7F7F7] text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">
                  <th className="py-3 px-4">Coupon Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min Order</th>
                  <th className="py-3 px-4">Redemptions / Limit</th>
                  <th className="py-3 px-4">Validity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5]">
                {coupons.map((coupon) => {
                  const expired = isExpired(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-neutral-50 transition">
                      {/* Code */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-black tracking-wider bg-neutral-100 px-2 py-1 border border-neutral-300">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(coupon.code, coupon.id)}
                            className="text-neutral-400 hover:text-black transition"
                            title="Copy code"
                          >
                            {copiedId === coupon.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        {coupon.description && (
                          <p className="text-[11px] text-neutral-500 mt-1 max-w-xs truncate">
                            {coupon.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {coupon.first_order_only && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 border border-neutral-200">
                              <UserCheck className="w-2.5 h-2.5" /> First Order
                            </span>
                          )}
                          {coupon.free_shipping && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-semibold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 border border-neutral-200">
                              <Truck className="w-2.5 h-2.5" /> Free Shipping
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Discount Value */}
                      <td className="py-4 px-4 font-semibold text-black">
                        {coupon.discount_type === 'percentage' ? (
                          <div>
                            <span className="text-sm font-serif">{coupon.discount_value}% OFF</span>
                            {coupon.max_discount_paise && (
                              <p className="text-[10px] text-neutral-500 font-normal">
                                Cap: {formatInr(coupon.max_discount_paise)}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-sm font-serif">₹{coupon.discount_value} FLAT OFF</span>
                          </div>
                        )}
                      </td>

                      {/* Min Order */}
                      <td className="py-4 px-4 text-neutral-700">
                        {coupon.minimum_order_paise > 0 ? (
                          <span className="font-semibold text-black">
                            {formatInr(coupon.minimum_order_paise)}
                          </span>
                        ) : (
                          <span className="text-neutral-400">No minimum</span>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-black">{coupon.usage_count || 0}</span>
                          <span className="text-neutral-400">/</span>
                          <span className="text-neutral-600">
                            {coupon.usage_limit ? coupon.usage_limit : '∞'}
                          </span>
                        </div>
                        {coupon.per_customer_limit && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            {coupon.per_customer_limit} per customer
                          </p>
                        )}
                      </td>

                      {/* Validity */}
                      <td className="py-4 px-4 text-[11px] text-neutral-600">
                        {coupon.expires_at ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-black">
                              Until {new Date(coupon.expires_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                            {expired && (
                              <span className="inline-block text-[9px] uppercase tracking-wider text-red-600 font-semibold">
                                Expired
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500">No expiration</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {expired ? (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-neutral-100 text-neutral-500 border border-neutral-300">
                            Expired
                          </span>
                        ) : coupon.is_active ? (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold bg-neutral-100 text-neutral-500 border border-neutral-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            disabled={expired}
                            className={`px-2 py-1 text-[10px] uppercase tracking-wider font-semibold border transition ${
                              coupon.is_active
                                ? 'border-neutral-300 text-neutral-600 hover:border-black hover:text-black'
                                : 'border-black bg-black text-white hover:bg-neutral-800'
                            } ${expired ? 'opacity-40 cursor-not-allowed' : ''}`}
                            title={coupon.is_active ? 'Deactivate coupon' : 'Activate coupon'}
                          >
                            {coupon.is_active ? 'Pause' : 'Activate'}
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(coupon)}
                            className="p-1.5 border border-[#E5E5E5] text-neutral-600 hover:text-black hover:border-black transition"
                            title="Edit coupon"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(coupon)}
                            className="p-1.5 border border-[#E5E5E5] text-neutral-400 hover:text-red-600 hover:border-red-300 transition"
                            title="Archive coupon"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-2xl my-8 p-6 shadow-2xl relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5]">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block">
                  {editingCoupon ? 'Modify Parameters' : 'New Promotion'}
                </span>
                <h2 className="text-xl font-serif uppercase tracking-wider text-black mt-0.5">
                  {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create Promotional Coupon'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-black transition p-1"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveCoupon} className="mt-5 space-y-5">
              {/* Row 1: Code and Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingCoupon)}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      })
                    }
                    placeholder="E.G. FESTIVE20"
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono font-bold tracking-wider uppercase focus:outline-hidden focus:border-black disabled:bg-neutral-100 disabled:text-neutral-500"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Uppercase alphanumeric string. No spaces.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Internal Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="E.G. 20% off for holiday launch"
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                  />
                </div>
              </div>

              {/* Row 2: Discount Type, Value, Max Cap */}
              <div className="p-4 bg-[#F7F7F7] border border-[#E5E5E5] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_type: e.target.value as 'percentage' | 'fixed',
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E5E5E5] text-xs uppercase tracking-wider font-semibold focus:outline-hidden"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Flat Off (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                      {formData.discount_type === 'percentage' ? 'Percentage (%) *' : 'Amount (₹) *'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={formData.discount_type === 'percentage' ? 100 : 50000}
                      value={formData.discount_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-[#E5E5E5] text-xs font-semibold focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                      Max Cap (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      disabled={formData.discount_type === 'fixed'}
                      value={formData.max_discount_inr}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          max_discount_inr: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      placeholder={formData.discount_type === 'percentage' ? 'E.G. 500' : 'N/A for fixed'}
                      className="w-full px-3 py-2 bg-white border border-[#E5E5E5] text-xs font-semibold focus:outline-hidden disabled:bg-neutral-100 disabled:text-neutral-400"
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">
                      {formData.discount_type === 'percentage'
                        ? 'Upper discount ceiling in ₹'
                        : 'Ignored for flat discounts'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Minimum Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_order_inr}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_order_inr: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="0 for no minimum"
                    className="w-full sm:w-1/2 px-3 py-2 bg-white border border-[#E5E5E5] text-xs font-semibold focus:outline-hidden"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Garment subtotal must meet or exceed this amount before discount is applied.
                  </p>
                </div>
              </div>

              {/* Row 3: Limits & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Global Usage Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.usage_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usage_limit: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="Leave blank for unlimited"
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Total times this coupon can be redeemed storewide.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Per-Customer Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.per_customer_limit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        per_customer_limit: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="1"
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Redemption cap per individual verified user account.
                  </p>
                </div>
              </div>

              {/* Row 4: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Valid From
                  </label>
                  <input
                    type="date"
                    value={formData.starts_at}
                    onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Valid Until (Expiry)
                  </label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    Leave blank for permanent validity without expiration.
                  </p>
                </div>
              </div>

              {/* Row 5: Flags & Checkboxes */}
              <div className="pt-2 border-t border-[#E5E5E5] space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.first_order_only}
                    onChange={(e) =>
                      setFormData({ ...formData, first_order_only: e.target.checked })
                    }
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-xs font-semibold text-black">
                    First Order Only (Valid solely for customers with 0 completed orders)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.free_shipping}
                    onChange={(e) =>
                      setFormData({ ...formData, free_shipping: e.target.checked })
                    }
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-xs font-semibold text-black">
                    Free Delivery (Waives standard ₹99 per-item delivery charge)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 accent-black"
                  />
                  <span className="text-xs font-semibold text-black">
                    Active (Ready to be redeemed at checkout immediately)
                  </span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E5E5] text-xs uppercase tracking-widest font-semibold text-neutral-600 hover:text-black hover:border-black transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{editingCoupon ? 'Save Changes' : 'Create Coupon'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-serif uppercase tracking-wider text-black">
                Archive Coupon?
              </h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Are you sure you want to archive coupon <strong className="font-mono text-black">{deleteTarget.code}</strong>? It will no longer be redeemable at checkout. Existing orders and redemption history will remain intact.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#E5E5E5] text-xs uppercase tracking-widest font-semibold text-neutral-600 hover:text-black hover:border-black transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-5 py-2 bg-red-600 text-white text-xs uppercase tracking-widest font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Archive Coupon</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
