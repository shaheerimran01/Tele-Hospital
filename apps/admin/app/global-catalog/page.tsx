'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Bell,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  Settings,
  Building2,
  Globe,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Trash2,
  Link2,
  Loader2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import {
  deleteCatalogProduct,
  fetchGlobalCatalog,
  setProductPublication,
  adoptOfferIntoProduct,
} from '@/lib/api/globalCatalog';
import { GlobalCatalogItem, CatalogStatusFilter } from '@/types/globalCatalog';

const PAGE_SIZE = 25;

const STATUS_TABS: Array<{ key: CatalogStatusFilter; label: string }> = [
  { key: 'unpublished', label: 'Unpublished' },
  { key: 'published', label: 'Published' },
  { key: 'all', label: 'All' },
];

export default function GlobalCatalogAdminPage() {
  const [products, setProducts] = useState<GlobalCatalogItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, published: 0, unpublished: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<CatalogStatusFilter>('unpublished');
  const [offset, setOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);

    fetchGlobalCatalog({
      search: search.trim() || undefined,
      status,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        if (!active) return;
        setProducts(data.products);
        setCounts(data.counts);
        setTotalCount(data.totalCount);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load global catalog:', err);
        setProducts([]);
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Catalog load nahi ho sake.',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [search, status, offset, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (productId: string, action: () => Promise<{ message: string }>) => {
    setPendingId(productId);
    setMessage(null);

    try {
      const result = await action();
      setMessage({ type: 'success', text: result.message });
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Action fail ho gaya.',
      });
    } finally {
      setPendingId(null);
    }
  };

  const handleToggle = (item: GlobalCatalogItem) =>
    run(item.id, async () => {
      const result = await setProductPublication(item.id, !item.isPublished);

      // Follow the item: unpublishing drops it into the Unpublished list, publishing into
      // the Published one, so the click always shows where the product went.
      setOffset(0);
      setStatus(item.isPublished ? 'unpublished' : 'published');

      return { message: result.message };
    });

  const handleAdopt = (item: GlobalCatalogItem, offerId: string) =>
    run(item.id, async () => {
      const result = await adoptOfferIntoProduct(item.id, offerId);
      return { message: result.message };
    });

  const handleDelete = (item: GlobalCatalogItem) => {
    const linked = item.offerCount;
    const warning =
      linked > 0
        ? `${item.name} delete it? ${linked} and the linked items will also be deleted.`
        : `${item.name} delete it from the catalogue?`;

    if (typeof window !== 'undefined' && !window.confirm(warning)) return;

    void run(item.id, async () => {
      const result = await deleteCatalogProduct(item.id);
      return { message: result.message };
    });
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(Math.ceil(totalCount / PAGE_SIZE), 1);

  return (
    <div className="flex min-h-screen bg-slate-100">
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
          <Link href="/pharmacy-products" className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-[#1A3A5C]/50 rounded-lg text-sm transition">
            <Boxes className="w-5 h-5" />
            Pharmacy Products
          </Link>
          <Link href="/global-catalog" className="flex items-center gap-3 px-4 py-3 bg-[#1A3A5C] text-white rounded-lg font-medium text-sm">
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

      <main className="flex-1 p-8 overflow-x-auto">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              TABIBISTAN / GLOBAL CATALOG
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Global Catalog</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl">
              Only the admin changes the catalog. Pharmacy uploads appear here when the admin publishes or adopts them — "Not linked" rows are those uploads that normalize to the same product as this one.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setRefreshKey((key) => key + 1);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Catalog Items', value: counts.all, tone: 'text-slate-900' },
            { label: 'Published', value: counts.published, tone: 'text-emerald-600' },
            { label: 'Unpublished', value: counts.unpublished, tone: 'text-slate-500' },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </span>
              <p className={`mt-1 text-2xl font-bold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === 'all' ? counts.all : tab.key === 'published' ? counts.published : counts.unpublished;
            const activeTab = status === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setOffset(0);
                  setStatus(tab.key);
                }}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab
                    ? 'border-[#0F2942] bg-[#0F2942] text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setOffset(0);
                setSearch(event.target.value);
              }}
              placeholder="Search by name, brand, category, or normalized key"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-[#0F2942]"
            />
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
              message.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {message.type === 'success' ? (
              <Check className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Catalog load ho raha hai...
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Catalog khali hai. Pharmacy Products page se koi upload publish karein.
          </div>
        ) : (
          <div className="space-y-3">
            {products.map((item) => (
              <article
                key={item.id}
                className={`rounded-xl border bg-white p-4 shadow-sm ${
                  item.isPublished ? 'border-slate-200' : 'border-amber-300'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[260px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{item.name}</h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.isPublished
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {item.isPublished ? 'Published' : 'Unpublished'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {[item.brandName, item.genericName, item.category].filter(Boolean).join(' • ') ||
                        'No brand/category'}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">{item.normalizedKey}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      {item.pharmacyCount} pharmacy ({item.pharmacies.join(', ') || 'none'}) •{' '}
                      {item.totalStock} units • {item.availableOfferCount} available offer(s)
                      {item.pendingReviewCount > 0
                        ? ` • ${item.pendingReviewCount} pending review`
                        : ''}
                    </p>
                    {item.nameVariants.length > 0 && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Uploaded as: {item.nameVariants.join(' / ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={pendingId === item.id}
                      onClick={() => handleToggle(item)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        item.isPublished
                          ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          : 'bg-[#0F2942] text-white hover:bg-[#1A3A5C]'
                      }`}
                    >
                      {item.isPublished ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      {item.isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      disabled={pendingId === item.id}
                      onClick={() => handleDelete(item)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>

                {item.unlinkedMatchCount > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <Link2 className="w-4 h-4" />
                      {item.unlinkedMatchCount} upload is product ki tarah lagti hai par link nahi
                      hai
                    </p>
                    <ul className="mt-2 space-y-1">
                      {item.unlinkedMatches.map((offer) => (
                        <li
                          key={offer.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-xs text-slate-700"
                        >
                          <span>
                            <span className="font-semibold">{offer.name ?? 'Unnamed'}</span>{' '}
                            <span className="text-slate-500">
                              • {offer.pharmacyName} • stock {offer.stock}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={pendingId === item.id}
                            onClick={() => handleAdopt(item, offer.id)}
                            className="rounded-md bg-[#0F2942] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#1A3A5C] disabled:opacity-50"
                          >
                            Link to this product
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {totalPages} • {totalCount} item(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(offset - PAGE_SIZE, 0))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= totalCount}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}