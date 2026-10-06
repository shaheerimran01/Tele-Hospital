'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  Bell,
  ShoppingBag,
  Package,
  Users,
  Settings,
  Building2,
  Search,
  RotateCw,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Boxes,
  Globe,
} from 'lucide-react';
import Link from 'next/link';
import { fetchPharmacies } from '@/lib/api/pharmacies';
import { PharmacyItem } from '@/types/pharmacy';
import {
  fetchAdminPharmacyProducts,
  syncPharmacyProductsToCatalog,
} from '@/lib/api/pharmacyProducts';
import {
  AdminPharmacyProductCounts,
  AdminPharmacyProductItem,
  ProductTypeFilter,
} from '@/types/pharmacyProduct';

const PAGE_SIZE = 25;

const EMPTY_COUNTS: AdminPharmacyProductCounts = {
  all: 0,
  unique: 0,
  similar: 0,
  synced: 0,
pending: 0,
  local: 0,
  linked: 0,
};

type TabMeta = { key: ProductTypeFilter; label: string };

const TABS: TabMeta[] = [
  { key: 'all', label: 'All Products' },
  { key: 'unique', label: 'Unique Products' },
  { key: 'similar', label: 'Similar Products' },
  { key: 'local', label: 'Local Only' },
  { key: 'linked', label: 'Linked' },
];

export default function PharmacyProductsAdminPage() {
  const [products, setProducts] = useState<AdminPharmacyProductItem[]>([]);
  const [counts, setCounts] = useState<AdminPharmacyProductCounts>(EMPTY_COUNTS);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [type, setType] = useState<ProductTypeFilter>('all');
  const [pharmacyId, setPharmacyId] = useState<string>('');
  const [searchQuery, setSearch] = useState<string>('');
  const [offset, setOffset] = useState<number>(0);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filters + refreshKey drive the single fetch effect below.
useEffect(() => {
    let active = true;

    fetchAdminPharmacyProducts({
      type,
      pharmacyId: pharmacyId || undefined,
      search: searchQuery.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        if (!active) return;

        setProducts(data.products);
        setCounts(data.counts);
        setTotalCount(data.totalCount);
        setSelectedIds([]);
      })
      .catch((err) => {
        if (!active) return;

        console.error('Failed to load pharmacy products:', err);
        setProducts([]);
        setCounts(EMPTY_COUNTS);
        setTotalCount(0);
        setStatusMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Pharmacy products load nahi ho sake.',
        });
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [type, pharmacyId, searchQuery, offset, refreshKey]);

  useEffect(() => {
    let active = true;

    fetchPharmacies()
      .then((data) => {
        if (!active) return;
        setPharmacies(data);
      })
      .catch((err) => {
        if (!active) return;

        console.error('Failed to load pharmacies:', err);
        setPharmacies([]);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleFilterChange = (
    next: Partial<{ type: ProductTypeFilter; pharmacyId: string; search: string; offset: number }>,
  ) => {
    setLoading(true);

    if (next.type !== undefined) setType(next.type);
    if (next.pharmacyId !== undefined) setPharmacyId(next.pharmacyId);
    if (next.search !== undefined) setSearch(next.search);
    if (next.offset !== undefined) setOffset(next.offset);
  };

  const handleRefresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  const uniqueVisibleIds = useMemo(
    () =>
      products
        .filter((item) => item.matchStatus === 'UNIQUE' && item.approvalStatus !== 'APPROVED')
        .map((item) => item.id),
    [products],
  );

  const selectedVisibleCount = products.filter((item) => selectedIds.includes(item.id)).length;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((current) => current !== id) : [...prev, id],
    );
  };

  const handleToggleAll = () => {
    const selectableIds = products
      .filter((item) => item.approvalStatus !== 'APPROVED')
      .map((item) => item.id);

    const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

    setSelectedIds(allSelected ? [] : selectableIds);
  };

  const handlePush = async (ids: string[]) => {
    if (ids.length === 0) return;

    const uniqueCount = ids.length;
    if (!window.confirm(`${uniqueCount} product(s) added in the global catalog. Are you sure you want to push?`)) {
      return;
    }

    try {
      setSyncing(true);
      const result = await syncPharmacyProductsToCatalog(ids);
      setStatusMessage({
        type: result.stats.errorCount > 0 ? 'error' : 'success',
        text: `${result.message}${result.stats.errorCount > 0 ? ` (${result.stats.errorCount} failed)` : ''}`,
      });
      handleRefresh();
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Catalog push fail ho gaya.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'PH';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F2942] text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2 p-6 font-bold text-xl tracking-wide">
          <span className="text-2xl font-black text-white">+</span> TABIIISTAN
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/notifications" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Bell className="w-5 h-5" />
            Notifications
          </Link>
          <Link href="/orders" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <ShoppingBag className="w-5 h-5" />
            Orders
          </Link>
          <Link href="/products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Package className="w-5 h-5" />
            Products
          </Link>
          <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
            <Boxes className="w-5 h-5" />
            Pharmacy Products
          </Link>
          <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Globe className="w-5 h-5" />
            Global Catalog
          </Link>
          <Link href="/users" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Users className="w-5 h-5" />
            Users
          </Link>
          <Link href="/pharmacies" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Building2 className="w-5 h-5" />
            Pharmacies
          </Link>
          <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-x-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TABIBISTAN / PHARMACY PRODUCTS
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Pharmacy Products</h1>
            <p className="text-xs text-slate-500 mt-1">
              Seller uploads yahan review hoti hain. Rows same product ki cluster me group hoti
              hain (brand + core name + volume), aur global catalog me kuch bhi tab jaata hai
              jab admin push kare.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePush(uniqueVisibleIds)}
              disabled={syncing || uniqueVisibleIds.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A3A5C] hover:bg-[#24507C] text-white text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              Push Unique to Global Catalog
            </button>

            <button
              type="button"
              onClick={() => handlePush(selectedIds)}
              disabled={syncing || selectedVisibleCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50"
            >
              Push Selected ({selectedVisibleCount})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name or SKU..."
              value={searchQuery}
              onChange={(e) => handleFilterChange({ search: e.target.value, offset: 0 })}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3A5C] shadow-2xs"
            />
          </div>

          <select
            value={pharmacyId}
            onChange={(e) => handleFilterChange({ pharmacyId: e.target.value, offset: 0 })}
            className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1A3A5C] shadow-2xs"
          >
            <option value="">All Pharmacies</option>
            {pharmacies.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh"
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-2xs transition cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#1A3A5C]' : ''}`} />
          </button>

          <span className="text-[11px] font-semibold text-slate-500 ml-auto">
            {totalCount} record(s) | {counts.unique} unique product(s) |{' '}
            {counts.similar} duplicate(s) | {counts.synced} synced
          </span>
        </div>

        {/* Type Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
          {TABS.map((tab) => {
            const active = type === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange({ type: tab.key, offset: 0 })}
                className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
                  active
                    ? 'border-[#1A3A5C] text-[#1A3A5C]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-[10px] font-bold text-slate-400">
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {statusMessage && (
          <div
            className={`mb-4 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      onChange={handleToggleAll}
                      className="w-4 h-4 rounded border-slate-300 text-[#1A3A5C]"
                      title="Select all on this page"
                    />
                  </th>
                  <th className="py-3.5 px-4">Pharmacy Name</th>
                  <th className="py-3.5 px-4">Product Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Stock</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Pharmacy products load ho rahe hain...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Koi pharmacy product record nahi mila.
                    </td>
                  </tr>
                ) : (
                  products.map((item) => {
                    const isApproved = item.approvalStatus === 'APPROVED';
                    const selectable = !isApproved;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            disabled={!selectable}
                            onChange={() => handleToggle(item.id)}
                            className="w-4 h-4 rounded border-slate-300 text-[#1A3A5C] disabled:opacity-40"
                          />
                        </td>

                        {/* Pharmacy */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#1A3A5C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {getInitials(item.pharmacyName)}
                            </div>
                            <span className="font-bold text-slate-900">{item.pharmacyName}</span>
                          </div>
                        </td>

                        {/* Product */}
                        <td className="py-4 px-4 max-w-xs">
                          <span className="font-bold text-slate-900 block truncate">
                            {item.product.name}
                          </span>
                          <span
                            className="text-[10px] text-slate-400 font-mono block truncate"
                            title="Normalized matching key"
                          >
                            key: {item.normalizedKey || '-'}
                          </span>
                          {item.duplicateOf && (
                            <span className="text-[10px] text-amber-600 block truncate">
                              Duplicate of {item.duplicateOf.name} ({item.duplicateOf.pharmacyName})
                            </span>
                          )}
                          {item.catalogMatch && (
                            <span className="text-[10px] text-blue-600 block truncate">
                              {item.catalogMatch.exact ? 'In catalog: ' : 'Catalog match: '}
                              {item.catalogMatch.name}
                            </span>
                          )}
                          {item.sku && (
                            <span className="text-[10px] text-slate-400 font-mono">{item.sku}</span>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                          {item.product.category}
                        </td>

                        {/* Brand */}
                        <td className="py-4 px-4 text-slate-700 whitespace-nowrap">
                          {item.product.brandName}
                        </td>

                        {/* Price */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-blue-700">Rs {item.price}</span>
                          {item.mrp !== null && item.mrp !== item.price && (
                            <span className="block text-[10px] text-slate-400 line-through">
                              Rs {item.mrp}
                            </span>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4 text-slate-700 whitespace-nowrap">{item.stock}</td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.matchStatus === 'UNIQUE'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.matchStatus === 'UNIQUE' ? 'Unique' : 'Similar'}
                          </span>
                          <span
                            className={`block mt-1 text-[10px] font-bold ${
                              isApproved ? 'text-blue-600' : 'text-slate-400'
                            }`}
                          >
                            {isApproved ? 'In Global Catalog' : 'Awaiting Approval'}
                          </span>
                          {item.groupSize > 1 && (
                            <span className="block mt-1 text-[10px] font-semibold text-slate-500">
                              {item.groupSize} uploads in this cluster
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isApproved || syncing}
                            onClick={() => handlePush([item.id])}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg transition border border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            {isApproved ? 'Synced' : 'Push'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => handleFilterChange({ offset: Math.max(offset - PAGE_SIZE, 0) })}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= totalCount || loading}
              onClick={() => handleFilterChange({ offset: offset + PAGE_SIZE })}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}