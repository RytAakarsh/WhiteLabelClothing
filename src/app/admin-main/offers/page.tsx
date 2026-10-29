'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Offer, Product } from '@/lib/types';
import { Plus, Tag, Edit, X, Calendar, Check, AlertCircle } from 'lucide-react';

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(40);
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const fetchOffersAndProducts = async () => {
    setLoading(true);
    const { data: offersData } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, slug, base_price, status')
      .order('name');

    if (offersData) setOffers(offersData as any);
    if (productsData) setProducts(productsData as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchOffersAndProducts();
  }, []);

  const handleStartEdit = async (offer: Offer) => {
    setEditingId(offer.id);
    setName(offer.name);
    setDescription(offer.description || '');
    setDiscountType(offer.discount_type);
    setDiscountValue(offer.discount_value);
    setStartsAt(offer.starts_at ? offer.starts_at.slice(0, 10) : '');
    setEndsAt(offer.ends_at ? offer.ends_at.slice(0, 10) : '');
    setIsActive(offer.is_active);

    // Fetch associated product IDs
    const { data: opData } = await supabase
      .from('offer_products')
      .select('product_id')
      .eq('offer_id', offer.id);

    setSelectedProductIds(opData?.map((r: any) => r.product_id) || []);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let offerId = editingId;

      if (editingId) {
        await supabase
          .from('offers')
          .update({
            name: name.trim(),
            description: description.trim(),
            discount_type: discountType,
            discount_value: discountValue,
            starts_at: startsAt ? new Date(startsAt).toISOString() : null,
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
      } else {
        const { data: newOffer, error } = await supabase
          .from('offers')
          .insert({
            name: name.trim(),
            description: description.trim(),
            discount_type: discountType,
            discount_value: discountValue,
            starts_at: startsAt ? new Date(startsAt).toISOString() : null,
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
            is_active: isActive,
          })
          .select()
          .single();

        if (error) throw error;
        offerId = newOffer.id;
      }

      // Associate products
      if (offerId) {
        await supabase.from('offer_products').delete().eq('offer_id', offerId);
        if (selectedProductIds.length > 0) {
          await supabase.from('offer_products').insert(
            selectedProductIds.map((pId) => ({
              offer_id: offerId,
              product_id: pId,
            }))
          );
        }
      }

      setIsAdding(false);
      setEditingId(null);
      await fetchOffersAndProducts();
    } catch (e) {
      console.error('Error saving offer:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Promotions & Campaigns
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Offer Management
          </h1>
        </div>

        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setName('Winter Editorial Sale — 40% Off');
              setDescription('Up to 40% off on curated outerwear and fleece.');
              setDiscountType('percentage');
              setDiscountValue(40);
              setSelectedProductIds(products.map((p) => p.id));
            }}
            className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Campaign Offer</span>
          </button>
        )}
      </div>

      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
              {editingId ? 'Edit Campaign Offer' : 'Create Campaign Offer'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="text-neutral-400 hover:text-black"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Winter Sale — 40% Off"
                className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Discount Type & Value
              </label>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden uppercase"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Flat Off</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? 90 : 50000}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseInt(e.target.value, 10) || 0)}
                  className="w-24 px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
              Eligible Garments ({selectedProductIds.length} Selected)
            </label>
            <div className="max-h-40 overflow-y-auto border border-[#E5E5E5] p-3 space-y-2 bg-[#F7F7F7] text-xs">
              <label className="flex items-center gap-2 font-semibold pb-1 border-b border-[#E5E5E5]">
                <input
                  type="checkbox"
                  checked={selectedProductIds.length === products.length && products.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedProductIds(products.map((p) => p.id));
                    else setSelectedProductIds([]);
                  }}
                  className="accent-black"
                />
                <span>Select All Products ({products.length})</span>
              </label>
              {products.map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds([...selectedProductIds, p.id]);
                      } else {
                        setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                      }
                    }}
                    className="accent-black"
                  />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-black w-4 h-4"
              />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Active Campaign</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-white border border-[#E5E5E5] text-black text-xs uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-black text-white text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800"
            >
              {saving ? 'Saving...' : 'Save Campaign Offer'}
            </button>
          </div>
        </form>
      )}

      {/* Offers List */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Campaign Name</th>
              <th className="py-3 px-4">Discount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {offers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No promotional offers configured yet.
                </td>
              </tr>
            ) : (
              offers.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-semibold text-black">{o.name}</td>
                  <td className="py-3 px-4 font-mono font-bold">
                    {o.discount_type === 'percentage' ? `${o.discount_value}% OFF` : `₹${o.discount_value / 100} OFF`}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider ${
                      o.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {o.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleStartEdit(o)}
                      className="p-1.5 text-neutral-500 hover:text-black transition"
                    >
                      <Edit className="w-4 h-4" />
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
