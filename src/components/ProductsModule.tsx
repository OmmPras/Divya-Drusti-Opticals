import { AlertTriangle, Edit3, PackagePlus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { apiRequest, formatCurrency } from '../lib/api';
import type { Product, UserRole } from '../types';

const CATEGORIES: Product['category'][] = [
  'Eyeglasses',
  'Spectacle Frames',
  'Spectacle Lenses',
  'Sunglasses',
  'Contact Lenses',
  'Optical Accessories',
  'Eye Medicines',
];

export function ProductsModule({ userRole, refreshSignal }: { userRole: UserRole; refreshSignal: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [formCategory, setFormCategory] = useState<Product['category']>('Spectacle Frames');
  const [brand, setBrand] = useState('');
  const [modelNo, setModelNo] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [gstPercent, setGstPercent] = useState('12');
  const [stockQty, setStockQty] = useState('10');
  const [reorderLevel, setReorderLevel] = useState('5');
  const [location, setLocation] = useState('Main Optical Shelf');
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNo, setBatchNo] = useState('');

  const [error, setError] = useState('');
  const isAdmin = userRole === 'ADMIN';

  const loadProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (category !== 'ALL') params.set('category', category);
      if (search.trim()) params.set('q', search.trim());
      if (lowStockOnly) params.set('lowStock', 'true');

      const res = await apiRequest<{ products: Product[] }>(`/api/products?${params.toString()}`);
      setProducts(res.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load optical inventory.');
    }
  };

  useEffect(() => {
    loadProducts();
  }, [category, search, lowStockOnly, refreshSignal]);

  const openCreate = () => {
    setEditingId(null);
    setSku('');
    setName('');
    setFormCategory('Spectacle Frames');
    setBrand('');
    setModelNo('');
    setUnitPrice('');
    setGstPercent('12');
    setStockQty('15');
    setReorderLevel('5');
    setLocation('Showcase A');
    setExpiryDate('');
    setBatchNo('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setSku(p.sku);
    setName(p.name);
    setFormCategory(p.category);
    setBrand(p.brand);
    setModelNo(p.model_no);
    setUnitPrice(String(p.unit_price));
    setGstPercent(String(p.gst_percent));
    setStockQty(String(p.quantity_in_stock));
    setReorderLevel(String(p.reorder_level));
    setLocation(p.location);
    setExpiryDate(p.expiry_date || '');
    setBatchNo(p.batch_no || '');
    setShowForm(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      sku: sku || undefined,
      name,
      category: formCategory,
      brand,
      model_no: modelNo,
      unit_price: Number(unitPrice),
      gst_percent: Number(gstPercent),
      quantity_in_stock: Number(stockQty),
      reorder_level: Number(reorderLevel),
      location,
      expiry_date: expiryDate,
      batch_no: batchNo,
    };

    try {
      if (editingId) {
        await apiRequest(`/api/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save product.');
    }
  };

  const handleArchive = async (id: number) => {
    try {
      await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove product.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Optical Products, Medicines & Inventory
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Frames, spectacle lenses, sunglasses, contact lenses, accessories, and ophthalmic medicines.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1E40AF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173bab] shrink-0"
          >
            <PackagePlus className="h-4 w-4" />
            Add Product / Medicine
          </button>
        )}
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showForm && isAdmin && (
        <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <h3 className="font-display text-base font-bold text-slate-900">
            {editingId ? 'Edit Product & Inventory' : 'Add Optical Product or Eye Medicine'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product / Medicine Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as Product['category'])}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                disabled={Boolean(editingId)}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Auto-generated if blank"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Unit Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">GST %</label>
              <input
                type="number"
                min="0"
                max="28"
                value={gstPercent}
                onChange={(e) => setGstPercent(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Quantity *</label>
              <input
                type="number"
                min="0"
                required
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reorder Alert Level</label>
              <input
                type="number"
                min="0"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shelf / Cabinet Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              />
            </div>
          </div>

          {(formCategory === 'Eye Medicines' || formCategory === 'Contact Lenses') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Batch Number</label>
                <input
                  type="text"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#1E40AF] px-4 py-2 text-xs font-semibold text-white"
            >
              Save Product
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU, frame, lens, medicine..."
                className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#1E40AF]"
              />
              Show Low Stock Only
            </label>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['ALL', ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat
                    ? 'bg-[#1E40AF] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Item Name & Brand</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3">Location</th>
                {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                    No optical products match the current filter.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.quantity_in_stock <= p.reorder_level;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-[#1E40AF] whitespace-nowrap">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">
                          {[p.brand, p.model_no, p.expiry_date ? `Exp: ${p.expiry_date}` : ''].filter(Boolean).join(' · ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(p.unit_price)}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums ${
                            isLow
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          }`}
                        >
                          {isLow && <AlertTriangle className="h-3 w-3" />}
                          {p.quantity_in_stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{p.location}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="inline-flex items-center gap-1 rounded border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleArchive(p.id)}
                            className="inline-flex items-center gap-1 rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
