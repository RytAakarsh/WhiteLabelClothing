'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Category } from '@/lib/types';
import { Plus, Edit, Check, X, FolderTree, AlertCircle } from 'lucide-react';

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
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createClient();

  const fetchCategories = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (data) setCategories(data as any);
    setLoading(false);
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

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setSortOrder(cat.sort_order);
    setIsActive(cat.is_active);
    setIsAdding(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('categories')
          .update({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim(),
            sort_order: sortOrder,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('categories')
          .insert({
            name: name.trim(),
            slug: slug.trim(),
            description: description.trim(),
            sort_order: sortOrder,
            is_active: isActive,
          });

        if (error) throw error;
      }

      setIsAdding(false);
      setEditingId(null);
      setName('');
      setSlug('');
      setDescription('');
      await fetchCategories();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save category.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#E5E5E5]">
        <div>
          <span className="text-[10px] sm:text-xs uppercase tracking-widest text-neutral-400 font-semibold block mb-1">
            Taxonomy Architecture
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif uppercase tracking-wider text-black">
            Category Management
          </h1>
        </div>

        {!isAdding && !editingId && (
          <button
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
              setName('');
              setSlug('');
              setDescription('');
              setSortOrder(categories.length + 1);
              setIsActive(true);
            }}
            className="px-4 py-2 bg-black text-white text-xs uppercase tracking-widest font-semibold hover:bg-neutral-800 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Add / Edit Form */}
      {(isAdding || editingId) && (
        <form onSubmit={handleSave} className="bg-white border border-[#E5E5E5] p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#E5E5E5]">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-black">
              {editingId ? 'Edit Category' : 'Create New Category'}
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
                Category Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Luxury Knitwear"
                className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
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
                placeholder="luxury-knitwear"
                className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs font-mono focus:outline-hidden focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
              Editorial Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Architectural silhouettes engineered with tactile textures."
              className="w-full px-3 py-2 bg-[#F7F7F7] border border-[#E5E5E5] text-xs focus:outline-hidden focus:border-black"
            />
          </div>

          <div className="flex items-center gap-6 text-xs">
            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-black mb-1">
                Sort Priority
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-3 py-1.5 bg-[#F7F7F7] border border-[#E5E5E5] text-xs"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-4">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-black w-4 h-4"
              />
              <span className="font-semibold uppercase tracking-wider text-[11px]">Active in Storefront</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setEditingId(null);
              }}
              className="px-4 py-2 bg-white border border-[#E5E5E5] text-black text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-black text-white text-xs uppercase tracking-wider font-semibold hover:bg-neutral-800"
            >
              {saving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      {/* Categories Table */}
      <div className="bg-white border border-[#E5E5E5] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#E5E5E5] text-neutral-400 uppercase tracking-widest bg-[#F7F7F7]">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-neutral-400 uppercase tracking-widest text-xs">
                  Loading Categories...
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition">
                  <td className="py-3 px-4 font-semibold text-black">{c.name}</td>
                  <td className="py-3 px-4 font-mono text-neutral-500">/collections/{c.slug}</td>
                  <td className="py-3 px-4 text-neutral-500 max-w-xs truncate">{c.description || '—'}</td>
                  <td className="py-3 px-4 font-mono">{c.sort_order}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold tracking-wider ${
                      c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-600'
                    }`}>
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleStartEdit(c)}
                      className="p-1.5 text-neutral-500 hover:text-black transition"
                      title="Edit Category"
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
