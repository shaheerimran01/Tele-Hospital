'use client';

// The items of one category (or of a search): "All Items | Health Packages Only |
// Individual Tests Only", sorting, and "Show more".

import { useEffect, useState } from 'react';
import { CircleAlert, LoaderCircle, X } from 'lucide-react';
import { getLabItemsApi, type LabItem, type LabListResponse, type LabSort, type LabTypeFilter } from '@/app/lib/api/lab-tests';
import { PackageCard, TestCard } from './LabItemCards';
import { useLabCart } from './lab-cart';
import { openSelectLab } from './SelectLabModal';

const PAGE_SIZE = 24;

const TYPE_TABS: { value: LabTypeFilter; label: string; count: (c: LabListResponse['counts']) => number }[] = [
  { value: 'ALL', label: 'All Items', count: (c) => c.all },
  { value: 'PACKAGE', label: 'Health Packages Only', count: (c) => c.packages },
  { value: 'INDIVIDUAL_TEST', label: 'Individual Tests Only', count: (c) => c.tests },
];

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;


/** Items of one card (or a search), with the type filter, sorting and "Show more". */
export default function LabListing({
  title,
  group,
  search,
  type,
  onType,
  onClose,
  onOpenItem,
  plain = false,
}: {
  /** heading above the list (left out on a category page, which has its own) */
  title?: string;
  /** no frame: the list is the page's main content */
  plain?: boolean;
  group?: string;
  search?: string;
  type: LabTypeFilter;
  onType: (t: LabTypeFilter) => void;
  onClose?: () => void;
  onOpenItem: (item: LabItem) => void;
}) {
  const cart = useLabCart();
  const [sort, setSort] = useState<LabSort>('popular');
  const [data, setData] = useState<LabListResponse | null>(null);
  const [items, setItems] = useState<LabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // First page whenever the card, search, type or sort changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLabItemsApi({ group, search, type, sort, page: 1, pageSize: PAGE_SIZE })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setItems(d.items);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load lab tests.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [group, search, type, sort, reload]);

  const more = async () => {
    if (!data || data.page >= data.pages) return;
    setLoading(true);
    try {
      const next = await getLabItemsApi({ group, search, type, sort, page: data.page + 1, pageSize: PAGE_SIZE });
      setData(next);
      setItems((list) => [...list, ...next.items.filter((x) => !list.some((y) => y.id === x.id))]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more tests.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={plain ? '' : 'mt-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5'}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {title && <h3 className="text-base font-bold text-gray-900">{title}</h3>}
          {data && <p className="text-xs text-gray-500">{plural(data.total, 'item', 'items')} found</p>}
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-white hover:text-gray-800">
            <X className="h-3.5 w-3.5" /> Close
          </button>
        )}
      </div>

      {/* All Items | Health Packages Only | Individual Tests Only */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Item type" className="flex flex-wrap gap-1.5 rounded-xl bg-white p-1 ring-1 ring-gray-200">
          {TYPE_TABS.map((t) => {
            const n = data ? t.count(data.counts) : null;
            const active = type === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={n === 0 && !active}
                onClick={() => onType(t.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? 'bg-[#141b34] text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.label}
                {n != null && <span className={`ml-1 tabular-nums ${active ? 'text-white/70' : 'text-gray-400'}`}>({n})</span>}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as LabSort)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-800 outline-none focus:border-[#ff574d]"
          >
            <option value="popular">Popular</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" /> {error}
          <button type="button" onClick={() => setReload((n) => n + 1)} className="font-semibold underline">
            Try again
          </button>
        </div>
      ) : !data && loading ? (
        <p className="flex items-center gap-2 py-8 text-sm text-gray-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading tests…
        </p>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          {search ? `No tests or packages match "${search}". Try another name, such as CBC, HbA1c or X-Ray.` : 'No items here yet.'}
        </p>
      ) : (
        <>
          <ul className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-70' : ''}`}>
            {items.map((item) => (
              <li key={item.id} className="flex">
                <div className="flex w-full flex-col [&>article]:flex-1">
                  {item.itemType === 'PACKAGE' ? (
                    <PackageCard item={item} inCart={cart.has(item.id)} onOpen={() => onOpenItem(item)} onBook={() => openSelectLab(item)} />
                  ) : (
                    <TestCard item={item} inCart={cart.has(item.id)} onOpen={() => onOpenItem(item)} onBook={() => openSelectLab(item)} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {data && data.page < data.pages && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={more}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 hover:border-gray-400 disabled:opacity-60"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Show more ({data.total - items.length} left)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

