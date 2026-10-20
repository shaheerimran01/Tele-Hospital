'use client';

// Lab Tests page body: search, the 4 sections of category cards (from the
// LabPackage table, with live counts) and the listing of the chosen card with the
// "All Items | Health Packages Only | Individual Tests Only" filter.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDown,
  Baby,
  Bone,
  CircleAlert,
  Droplet,
  Droplets,
  FlaskConical,
  HeartPulse,
  LoaderCircle,
  Mars,
  Microscope,
  Radiation,
  Ribbon,
  Scan,
  ScanLine,
  Search,
  ShieldPlus,
  Sun,
  TestTubes,
  Thermometer,
  Venus,
  Waves,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  formatPkr,
  getLabCatalogApi,
  getLabItemsApi,
  type LabCatalog as Catalog,
  type LabCategoryCard,
  type LabItem,
  type LabListResponse,
  type LabSort,
  type LabTypeFilter,
} from '@/app/lib/api/lab-tests';
import { PackageCard, TestCard } from './LabItemCards';
import LabItemModal from './LabItemModal';
import LabCart from './LabCart';
import { useLabCart } from './lab-cart';

const PAGE_SIZE = 24;
/** One row on wide screens, whatever the number of cards */
const GRID_COLS: Record<number, string> = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-4 xl:grid-cols-7',
};
const DEFAULT_GROUP = 'full-body';

const CARD_STYLE: Record<string, { Icon: LucideIcon; tone: string }> = {
  'full-body': { Icon: Activity, tone: 'bg-emerald-50 text-emerald-600' },
  'fever-infection': { Icon: Thermometer, tone: 'bg-orange-50 text-orange-600' },
  diabetes: { Icon: Droplet, tone: 'bg-rose-50 text-rose-600' },
  vitamins: { Icon: Sun, tone: 'bg-amber-50 text-amber-600' },
  men: { Icon: Mars, tone: 'bg-sky-50 text-sky-600' },
  women: { Icon: Venus, tone: 'bg-pink-50 text-pink-600' },
  'liver-kidney': { Icon: FlaskConical, tone: 'bg-teal-50 text-teal-600' },
  thyroid: { Icon: ShieldPlus, tone: 'bg-indigo-50 text-indigo-600' },
  hormones: { Icon: Baby, tone: 'bg-fuchsia-50 text-fuchsia-600' },
  allergy: { Icon: Wind, tone: 'bg-cyan-50 text-cyan-600' },
  'ct-scan': { Icon: Scan, tone: 'bg-blue-50 text-blue-600' },
  ecg: { Icon: HeartPulse, tone: 'bg-red-50 text-red-600' },
  'x-ray': { Icon: Bone, tone: 'bg-slate-100 text-slate-700' },
  ultrasound: { Icon: Waves, tone: 'bg-sky-50 text-sky-600' },
  mri: { Icon: ScanLine, tone: 'bg-violet-50 text-violet-600' },
  echo: { Icon: HeartPulse, tone: 'bg-rose-50 text-rose-600' },
  radiology: { Icon: Radiation, tone: 'bg-yellow-50 text-yellow-700' },
  blood: { Icon: Droplets, tone: 'bg-red-50 text-red-600' },
  'urine-stool': { Icon: TestTubes, tone: 'bg-lime-50 text-lime-700' },
  heart: { Icon: HeartPulse, tone: 'bg-rose-50 text-rose-600' },
  cancer: { Icon: Ribbon, tone: 'bg-purple-50 text-purple-600' },
  pathology: { Icon: Microscope, tone: 'bg-gray-100 text-gray-700' },
};

const TYPE_TABS: { value: LabTypeFilter; label: string; count: (c: LabListResponse['counts']) => number }[] = [
  { value: 'ALL', label: 'All Items', count: (c) => c.all },
  { value: 'PACKAGE', label: 'Health Packages Only', count: (c) => c.packages },
  { value: 'INDIVIDUAL_TEST', label: 'Individual Tests Only', count: (c) => c.tests },
];

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "?group=diabetes&type=PACKAGE" so a listing can be shared or reloaded */
function readUrl() {
  if (typeof window === 'undefined') return { group: null as string | null, type: 'ALL' as LabTypeFilter };
  const p = new URLSearchParams(window.location.search);
  const t = p.get('type');
  return { group: p.get('group'), type: (t === 'PACKAGE' || t === 'INDIVIDUAL_TEST' ? t : 'ALL') as LabTypeFilter };
}
function writeUrl(group: string | null, type: LabTypeFilter) {
  try {
    const url = new URL(window.location.href);
    if (group) url.searchParams.set('group', group);
    else url.searchParams.delete('group');
    if (type !== 'ALL') url.searchParams.set('type', type);
    else url.searchParams.delete('type');
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // not important
  }
}

// ---------------------------------------------------------------------------

function CategoryCardButton({ card, active, onClick }: { card: LabCategoryCard; active: boolean; onClick: () => void }) {
  const style = CARD_STYLE[card.key] ?? { Icon: FlaskConical, tone: 'bg-gray-100 text-gray-700' };
  const Icon = style.Icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`group flex h-full w-full flex-col rounded-2xl border p-4 text-left transition ${
        active ? 'border-[#ff574d] bg-[#fff6f5] ring-1 ring-[#ff574d]' : 'border-gray-200 bg-white hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.tone}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className={`mt-3 text-sm font-bold leading-snug ${active ? 'text-[#d9443b]' : 'text-gray-900 group-hover:text-[#ff574d]'}`}>{card.label}</span>
      <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">{card.description}</span>
      <span className="mt-auto pt-3 text-xs font-semibold text-gray-700">
        {plural(card.count, 'item', 'items')}
        {card.fromPrice != null && card.count > 0 && <span className="font-normal text-gray-500"> · from {formatPkr(card.fromPrice)}</span>}
      </span>
    </button>
  );
}

function ShortcutCard({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full flex-col rounded-2xl border border-dashed border-sky-300 bg-gradient-to-br from-sky-50 to-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
        <ScanLine className="h-6 w-6" />
      </span>
      <span className="mt-3 text-sm font-bold leading-snug text-gray-900 group-hover:text-sky-700">{label}</span>
      <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">{description}</span>
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-sky-700">
        See radiology tests <ArrowDown className="h-3.5 w-3.5 transition group-hover:translate-y-0.5" />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------

/** Items of one card (or a search), with the type filter, sorting and "Show more". */
function Listing({
  title,
  group,
  search,
  type,
  onType,
  onClose,
  onOpenItem,
}: {
  title: string;
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
    <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">{title}</h3>
          {data && <p className="text-xs text-gray-500">{plural(data.total, 'item', 'items')} shown below</p>}
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
                    <PackageCard item={item} inCart={cart.has(item.id)} onOpen={() => onOpenItem(item)} onBook={() => cart.add(item)} />
                  ) : (
                    <TestCard item={item} inCart={cart.has(item.id)} onOpen={() => onOpenItem(item)} onBook={() => cart.add(item)} />
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

// ---------------------------------------------------------------------------

export default function LabCatalog() {
  const cart = useLabCart();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ sectionId: string; key: string } | null>(null);
  const [type, setType] = useState<LabTypeFilter>('ALL');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<LabItem | null>(null);
  const panelRefs = useRef(new Map<string, HTMLDivElement>());
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getLabCatalogApi()
      .then((c) => {
        if (cancelled) return;
        setCatalog(c);
        // Start with the card in the link (?group=), else Full Body Packages
        const url = readUrl();
        const pick = c.sections.find((s) => s.cards.some((x) => x.key === url.group)) ? url.group : DEFAULT_GROUP;
        const section = c.sections.find((s) => s.cards.some((x) => x.key === pick));
        if (section && pick) {
          setActive({ sectionId: section.id, key: pick });
          setType(url.type);
          if (url.group) window.setTimeout(() => panelRefs.current.get(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
        }
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load lab tests.'));
    return () => {
      cancelled = true;
    };
  }, [retry]);

  // Search as you type (after a short pause)
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  const choose = useCallback((sectionId: string, key: string) => {
    setActive((a) => (a?.key === key ? null : { sectionId, key }));
    setType('ALL');
    window.setTimeout(() => panelRefs.current.get(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }, []);

  useEffect(() => {
    writeUrl(active?.key ?? null, type);
  }, [active, type]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const cardOf = (key: string) => catalog?.sections.flatMap((s) => s.cards).find((c) => c.key === key);

  return (
    <div className="bg-white">
      {/* Hero + search */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-[#fff6f5] to-white">
        <div className="mx-auto max-w-[1360px] px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl">
            Book lab tests online from trusted and certified labs
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            {catalog
              ? `${catalog.totals.packages} health packages and ${catalog.totals.tests} individual tests, including X-rays and scans.`
              : 'Health packages, individual tests, X-rays and scans.'}
          </p>
          <div className="mt-5 flex h-12 max-w-2xl items-center rounded-full border border-gray-200 bg-white pl-4 pr-1.5 shadow-sm focus-within:border-[#ff574d] focus-within:ring-2 focus-within:ring-[#ff574d]/15">
            <Search className="h-4 w-4 shrink-0 text-gray-400" />
            <label htmlFor="lab-search" className="sr-only">
              Search tests or packages
            </label>
            <input
              id="lab-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tests or packages, e.g. HbA1c, CBC, X-Ray"
              className="h-full w-full bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {search && (
            <Listing
              key={`search-${search}`}
              title={`Results for "${search}"`}
              search={search}
              type={type}
              onType={setType}
              onClose={() => setQuery('')}
              onOpenItem={setOpenItem}
            />
          )}
        </div>
      </section>

      {error ? (
        <div className="mx-auto max-w-[1360px] px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
            <CircleAlert className="h-4 w-4 shrink-0" /> {error}
            <button type="button" onClick={() => setRetry((n) => n + 1)} className="font-semibold underline">
              Try again
            </button>
          </div>
        </div>
      ) : !catalog ? (
        <p className="mx-auto flex max-w-[1360px] items-center gap-2 px-4 py-10 text-sm text-gray-500 sm:px-6">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading tests and packages…
        </p>
      ) : (
        catalog.sections.map((section, i) => {
          const isActive = active?.sectionId === section.id;
          const card = isActive ? cardOf(active!.key) : undefined;
          return (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-title`}
              className={`scroll-mt-20 py-8 ${i % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'}`}
            >
              <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
                <h2 id={`${section.id}-title`} className="mb-5 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
                  {section.title}
                </h2>
                <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${GRID_COLS[Math.min(7, section.cards.length + (section.shortcut ? 1 : 0))] ?? GRID_COLS[7]}`}>
                  {section.cards.map((c, idx) => (
                    <div key={c.key} className="contents">
                      <CategoryCardButton card={c} active={active?.key === c.key} onClick={() => choose(section.id, c.key)} />
                      {/* "X Rays, Scans & More" sits second in Section 1 and jumps to the radiology section */}
                      {idx === 0 && section.shortcut && (
                        <ShortcutCard
                          label={section.shortcut.label}
                          description={section.shortcut.description}
                          onClick={() => scrollTo(section.shortcut!.targetSectionId)}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div
                  ref={(el) => {
                    if (el) panelRefs.current.set(section.id, el);
                    else panelRefs.current.delete(section.id);
                  }}
                  className="scroll-mt-20"
                >
                  {isActive && card && (
                    <Listing
                      key={card.key}
                      title={card.label}
                      group={card.key}
                      type={type}
                      onType={setType}
                      onClose={() => setActive(null)}
                      onOpenItem={setOpenItem}
                    />
                  )}
                </div>
              </div>
            </section>
          );
        })
      )}

      {openItem && <LabItemModal item={openItem} inCart={cart.has(openItem.id)} onBook={(x) => cart.add(x)} onClose={() => setOpenItem(null)} />}
      <LabCart />
    </div>
  );
}
