'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Category } from '@/lib/types';
import { Upload, X, Check, ArrowLeft, Plus, Trash2, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface ProductFormProps {
  initialProduct?: any;
  categories: Category[];
}

export default function ProductForm({ initialProduct, categories }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!initialProduct?.id;

  // Basic info
  const [name, setName] = useState(initialProduct?.name || '');
  const [slug, setSlug] = useState(initialProduct?.slug || '');
  const [sku, setSku] = useState(initialProduct?.sku || '');
  const [categoryId, setCategoryId] = useState(initialProduct?.category_id || categories[0]?.id || '');
  const [shortDesc, setShortDesc] = useState(initialProduct?.short_description || '');
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>(initialProduct?.status || 'draft');

  // Pricing (in Rupees for UI input)
  const [sellingPrice, setSellingPrice] = useState(
    initialProduct?.base_price ? (initialProduct.base_price / 100).toString() : '2999'
  );
  const [comparePrice, setComparePrice] = useState(
    initialProduct?.compare_at_price ? (initialProduct.compare_at_price / 100).toString() : ''
  );

  // Merchandising
  const [isFeatured, setIsFeatured] = useState(initialProduct?.is_featured || false);
  const [isNewArrival, setIsNewArrival] = useState(initialProduct?.is_new_arrival || false);
  const [isBestSeller, setIsBestSeller] = useState(initialProduct?.is_best_seller || false);
  const [isOfferEligible, setIsOfferEligible] = useState(initialProduct?.is_offer_eligible !== false);
  const [sortOrder, setSortOrder] = useState(initialProduct?.sort_order || 0);

  // Images (Max 5)
  const [images, setImages] = useState<{ storage_path: string; is_primary: boolean }[]>(
    initialProduct?.images?.map((img: any) => ({
      storage_path: img.storage_path,
      is_primary: img.is_primary,
    })) || []
  );
  const [uploadingImage, setUploadingImage] = useState(false);

  // Variants (M, L, XL for sweatshirts; L, XL, XXL for jackets)
  const [variants, setVariants] = useState<any[]>(
    initialProduct?.variants?.map((v: any) => ({
      id: v.id,
      size: v.size,
      sku: v.sku || '',
      stock_quantity: v.stock_quantity.toString(),
      price_adjustment: (v.price_adjustment / 100).toString(),
      is_active: v.is_active,
    })) || [
      { size: 'M', sku: '', stock_quantity: '10', price_adjustment: '0', is_active: true },
      { size: 'L', sku: '', stock_quantity: '10', price_adjustment: '0', is_active: true },
      { size: 'XL', sku: '', stock_quantity: '10', price_adjustment: '0', is_active: true },
    ]
  );

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate slug from name if creating
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Image Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 5) {
      setErrorMsg('You can upload a maximum of 5 images per product.');
      return;
    }

    setUploadingImage(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload image.');
      }

      setImages((prev) => [
        ...prev,
        { storage_path: data.url, is_primary: prev.length === 0 },
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading file.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        is_primary: i === index,
      }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some((img) => img.is_primary)) {
        updated[0].is_primary = true;
      }
      return updated;
    });
  };

  // Variant Helpers
  const handleVariantChange = (index: number, field: string, val: any) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: val } : v))
    );
  };

  const handleAddSizeVariant = (size: string) => {
    if (variants.some((v) => v.size === size)) return;
    setVariants((prev) => [
      ...prev,
      { size, sku: `${sku}-${size}`, stock_quantity: '10', price_adjustment: '0', is_active: true },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  // Quick Preset Sizes for Sweatshirts vs Jackets
  const applyPresetSizes = (categoryType: 'sweatshirt' | 'jacket') => {
    if (categoryType === 'sweatshirt') {
      setVariants([
        { size: 'M', sku: `${sku}-M`, stock_quantity: '10', price_adjustment: '0', is_active: true },
        { size: 'L', sku: `${sku}-L`, stock_quantity: '10', price_adjustment: '0', is_active: true },
        { size: 'XL', sku: `${sku}-XL`, stock_quantity: '10', price_adjustment: '0', is_active: true },
      ]);
    } else {
      setVariants([
        { size: 'L', sku: `${sku}-L`, stock_quantity: '10', price_adjustment: '0', is_active: true },
        { size: 'XL', sku: `${sku}-XL`, stock_quantity: '10', price_adjustment: '0', is_active: true },
        { size: 'XXL', sku: `${sku}-XXL`, stock_quantity: '10', price_adjustment: '0', is_active: true },
      ]);
    }
  };

  // Form Submit (Draft or Published)
  const handleSubmit = async (targetStatus?: 'draft' | 'published') => {
    const finalStatus = targetStatus || status;
    setSaving(true);
    setErrorMsg(null);

    // Convert Rupees into paise
    const basePricePaise = Math.round(parseFloat(sellingPrice || '0') * 100);
    const comparePricePaise = comparePrice ? Math.round(parseFloat(comparePrice) * 100) : null;

    const payload = {
      id: initialProduct?.id,
      name: name.trim(),
      slug: slug.trim(),
      sku: sku.trim(),
      category_id: categoryId,
      short_description: shortDesc.trim(),
      description: description.trim(),
      status: finalStatus,
      base_price: basePricePaise,
      compare_at_price: comparePricePaise,
      is_featured: isFeatured,
      is_new_arrival: isNewArrival,
      is_best_seller: isBestSeller,
      is_offer_eligible: isOfferEligible,
      sort_order: parseInt(sortOrder.toString(), 10) || 0,
      images,
      variants: variants.map((v) => ({
        id: v.id,
        size: v.size,
        sku: v.sku,
        stock_quantity: parseInt(v.stock_quantity.toString(), 10) || 0,
        price_adjustment: Math.round(parseFloat(v.price_adjustment || '0') * 100),
        is_active: v.is_active,
      })),
    };

    try {
      const endpoint = '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product in database.');
      }

      router.push('/admin-main/products');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin-main/products"
            className="p-2 border border-[#E5E5E5] bg-white hover:bg-neutral-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-neutral-400 font-semibold block">
              {isEditing ? 'Editing Record' : 'New Catalog Entry'}
            </span>
            <h1 className="text-xl sm:text-2xl font-serif uppercase tracking-wider text-black">
              {isEditing ? name || 'Edit Product' : 'Create Product'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('draft')}
            className="px-4 py-2 bg-white border border-black text-black text-xs uppercase tracking-widest font-semibold hover:bg-neutral-100 transition"
          >
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit('published')}
            className="px-5 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition"
          >
            {saving ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Fields */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. Basic Information */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
              1. Basic Information
            </h2>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Heavyweight Monolith Hoodie — Edition 01"
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="heavyweight-monolith-hoodie"
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Master SKU
                </label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="WLC-SW-01"
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono focus:outline-hidden focus:border-black"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Category *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                >
                  <option value="draft">Draft (Hidden from storefront)</option>
                  <option value="published">Published (Live for purchase)</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Short Silhouette Summary
              </label>
              <input
                type="text"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                placeholder="450 GSM French terry with double-needle tailoring."
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Full Description & Craftsmanship Details
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed fabric composition, weight, and silhouette notes..."
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black leading-relaxed"
              />
            </div>
          </div>

          {/* 2. Images (Supabase Storage) */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
                  2. Product Images ({images.length}/5)
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Upload up to 5 high-resolution photography assets directly to Supabase Storage.
                </p>
              </div>
            </div>

            {/* Upload Area */}
            {images.length < 5 && (
              <label className="border-2 border-dashed border-[#E5E5E5] hover:border-black p-6 flex flex-col items-center justify-center cursor-pointer bg-[#F7F7F7] transition">
                <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider text-black">
                  {uploadingImage ? 'Uploading to Supabase Storage...' : 'Upload Garment Image'}
                </span>
                <span className="text-[10px] text-neutral-400 mt-1">JPEG, PNG, WEBP up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploadingImage}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {/* Images Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative aspect-3/4 bg-[#F7F7F7] border overflow-hidden group ${
                      img.is_primary ? 'border-black ring-2 ring-black' : 'border-[#E5E5E5]'
                    }`}
                  >
                    <Image
                      src={img.storage_path}
                      alt="Garment image preview"
                      fill
                      className="object-contain p-1"
                    />

                    {img.is_primary && (
                      <span className="absolute top-1 left-1 bg-black text-white text-[9px] uppercase tracking-widest font-semibold px-1.5 py-0.5">
                        Primary
                      </span>
                    )}

                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      {!img.is_primary && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className="px-2 py-1 bg-white text-black text-[9px] uppercase font-semibold tracking-wider hover:bg-neutral-200"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="px-2 py-1 bg-red-600 text-white text-[9px] uppercase font-semibold tracking-wider hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Variants & Stock */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-[#E5E5E5] gap-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
                  3. Size Variants & Inventory
                </h2>
                <p className="text-[11px] text-neutral-500">
                  Manage inventory independently per size variant.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPresetSizes('sweatshirt')}
                  className="px-2.5 py-1 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black uppercase text-[10px] font-semibold"
                >
                  Preset: M, L, XL
                </button>
                <button
                  type="button"
                  onClick={() => applyPresetSizes('jacket')}
                  className="px-2.5 py-1 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black uppercase text-[10px] font-semibold"
                >
                  Preset: L, XL, XXL
                </button>
              </div>
            </div>

            {/* Variants Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest">
                    <th className="py-2 px-2">Size</th>
                    <th className="py-2 px-2">Variant SKU</th>
                    <th className="py-2 px-2">Stock Units</th>
                    <th className="py-2 px-2">Active</th>
                    <th className="py-2 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {variants.map((v, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 font-semibold">{v.size}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={v.sku}
                          onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                          placeholder={`${sku}-${v.size}`}
                          className="px-2 py-1 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono w-28"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          min="0"
                          value={v.stock_quantity}
                          onChange={(e) => handleVariantChange(idx, 'stock_quantity', e.target.value)}
                          className="px-2 py-1 bg-[#F7F7F7] border border-[#E5E5E5] text-xs w-20 font-semibold"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={v.is_active}
                          onChange={(e) => handleVariantChange(idx, 'is_active', e.target.checked)}
                          className="accent-black"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          className="text-neutral-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Quick add custom size */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-[11px] text-neutral-500 uppercase tracking-wider">Add size:</span>
              {['S', 'M', 'L', 'XL', 'XXL'].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleAddSizeVariant(sz)}
                  className="px-2 py-1 bg-white border border-[#E5E5E5] hover:border-black text-[10px] font-semibold uppercase"
                >
                  +{sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pricing & Merchandising */}
        <div className="lg:col-span-4 space-y-8">
          {/* Pricing Box */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
              Pricing (INR)
            </h2>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="1"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="2999"
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-semibold focus:outline-hidden focus:border-black"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Stored internally in paise (₹1 = 100 paise)</p>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Original Compare-At Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={comparePrice}
                onChange={(e) => setComparePrice(e.target.value)}
                placeholder="4999"
                className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Leave empty if no discount is active</p>
            </div>
          </div>

          {/* Merchandising Box */}
          <div className="bg-white border border-[#E5E5E5] p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black pb-2 border-b border-[#E5E5E5]">
              Merchandising & Flags
            </h2>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span className="font-medium text-black">Feature on Homepage</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span className="font-medium text-black">Mark as New Arrival</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(e) => setIsBestSeller(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span className="font-medium text-black">Best Seller Designation</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOfferEligible}
                  onChange={(e) => setIsOfferEligible(e.target.checked)}
                  className="accent-black w-4 h-4"
                />
                <span className="font-medium text-black">Eligible for Promotional Offers</span>
              </label>
            </div>

            <div className="pt-2">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Display Sort Priority
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs"
              />
              <p className="text-[10px] text-neutral-400 mt-1">Lower numbers appear first</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
