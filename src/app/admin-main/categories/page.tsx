'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Category } from '@/lib/types';
import {
  Plus,
  Edit,
  Trash2,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Layers,
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [imagePath, setImagePath] = useState<string | null>(null);

  // Image Upload state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Actions state
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
      } else {
        throw new Error(data.error || 'Failed to fetch categories');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingId) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
    }
  };

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setImagePath(null);
    setImagePreview(null);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setImagePath(cat.image_path || null);
    setImagePreview(cat.image_path || null);
    setIsAdding(false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload JPG, PNG, WEBP, or AVIF.');
      return;
    }

    // Validate file size: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please compress image before upload.');
      return;
    }

    setErrorMsg(null);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'categories');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload category cover image.');
      }

      setImagePath(data.url);
      setImagePreview(data.url);
      setSuccessMsg('Cover image uploaded successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Image upload failed. Please try again.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImagePath(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        image_path: imagePath || null,
        sort_order: sortOrder,
        is_active: isActive,
      };

      if (editingId) {
        payload.id = editingId;
      }

      const res = await fetch('/api/admin/categories', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save category.');
      }

      setSuccessMsg(editingId ? 'Category updated successfully.' : 'New category created successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);

      setIsAdding(false);
      setEditingId(null);
      setName('');
      setSlug('');
      setDescription('');
      setImagePath(null);
      setImagePreview(null);
      await fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(cat.id);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/admin/categories?id=${encodeURIComponent(cat.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete category.');
      }

      setSuccessMsg(`Category "${cat.name}" deleted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting category.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Taxonomy & Cover Visuals
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Category Management
          </h1>
        </div>

        {!isAdding && !editingId && (
          <button
            onClick={handleStartAdd}
            className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Add / Edit Category Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white border border-[#E5E5E5] p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-[#E5E5E5]">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-black flex items-center gap-2">
              <Layers className="w-4 h-4" />
              <span>{editingId ? 'Edit Category' : 'Create New Category'}</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="p-1 text-neutral-400 hover:text-black transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Form Details */}
            <div className="md:col-span-7 space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Premium Sweatshirts"
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="sweatshirts"
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono focus:outline-hidden focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                  Editorial Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ultra-luxe heavyweight cotton fleece engineered for supreme comfort and enduring silhouette."
                  className="w-full px-3.5 py-2.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                    Display Order (Sort Priority)
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="accent-black w-4 h-4"
                    />
                    <span className="font-semibold uppercase tracking-wider text-[11px] text-black">
                      Active on Storefront
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Cover Image Upload & Preview */}
            <div className="md:col-span-5 space-y-3">
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black">
                Category Cover Image (Homepage Showcase)
              </label>

              {/* Cover Image Preview Box */}
              <div className="relative w-full aspect-4/3 bg-[#F7F7F7] border border-[#E5E5E5] overflow-hidden flex items-center justify-center group">
                {imagePreview ? (
                  <>
                    <Image
                      src={imagePreview}
                      alt={name || 'Category cover'}
                      fill
                      className="object-cover object-center transition duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-black text-[10px] uppercase font-semibold tracking-wider hover:bg-neutral-200 transition"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-3 py-1.5 bg-red-600 text-white text-[10px] uppercase font-semibold tracking-wider hover:bg-red-700 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <ImageIcon className="w-10 h-10 text-neutral-300 mx-auto" />
                    <p className="text-[11px] uppercase tracking-wider text-neutral-400">
                      No cover image assigned
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      Recommended: 1200×900px JPG, PNG or WebP
                    </p>
                  </div>
                )}

                {uploadingImage && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-2xs flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-black" />
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-black">
                      Uploading to Storage...
                    </span>
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-[#F7F7F7] border border-[#E5E5E5] hover:border-black text-xs uppercase tracking-wider font-medium text-black flex items-center justify-center gap-2 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{imagePreview ? 'Replace Cover Image' : 'Upload Cover Image'}</span>
                </button>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="py-2.5 px-3 border border-[#E5E5E5] text-neutral-500 hover:text-red-600 hover:border-red-300 transition text-xs"
                    title="Remove Image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="px-5 py-2.5 bg-white border border-[#E5E5E5] text-black text-xs uppercase tracking-wider hover:bg-neutral-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="px-6 py-2.5 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{saving ? 'Persisting...' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Categories Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Cover</th>
              <th className="py-3 px-4">Category Name</th>
              <th className="py-3 px-4">Storefront Route</th>
              <th className="py-3 px-4">Editorial Description</th>
              <th className="py-3 px-4 text-center">Order</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  Loading Categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  No categories defined. Click &ldquo;Add Category&rdquo; to begin.
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition">
                  {/* Cover Image Thumbnail */}
                  <td className="py-3 px-4">
                    <div className="relative w-14 h-11 bg-[#F7F7F7] border border-[#E5E5E5] overflow-hidden flex items-center justify-center shrink-0">
                      {c.image_path ? (
                        <Image
                          src={c.image_path}
                          alt={c.name}
                          fill
                          className="object-cover object-center"
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-neutral-300" />
                      )}
                    </div>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-4 font-semibold text-black whitespace-nowrap">
                    {c.name}
                  </td>

                  {/* Route */}
                  <td className="py-3 px-4 font-mono text-neutral-500 whitespace-nowrap">
                    /collections/{c.slug}
                  </td>

                  {/* Description */}
                  <td className="py-3 px-4 text-neutral-500 max-w-xs truncate">
                    {c.description || '—'}
                  </td>

                  {/* Order */}
                  <td className="py-3 px-4 font-mono text-center">
                    {c.sort_order}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider ${
                      c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleStartEdit(c)}
                        className="p-1.5 text-neutral-500 hover:text-black transition"
                        title="Edit Category & Cover"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={deletingId === c.id}
                        className="p-1.5 text-neutral-400 hover:text-red-600 transition"
                        title="Delete Category"
                      >
                        {deletingId === c.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
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
