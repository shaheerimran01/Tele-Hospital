'use client';

// Lab Tests page body: search, and the 4 sections of category cards (from the
// LabPackage table, with live counts). Each card opens its own page,
// /lab-tests/<category>, with that category's packages and tests.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowRight, CircleAlert, LoaderCircle, ScanLine, Search, X } from 'lucide-react';
import { formatPkr, getLabCatalogApi, type LabCatalog as Catalog, type LabCategoryCard, type LabItem, type LabTypeFilter } from '@/app/lib/api/lab-tests';
import LabListing, { plural } from './LabListing';
import LabItemModal from './LabItemModal';
import LabCart from './LabCart';
import { useLabCart } from './lab-cart';
import { categoryStyle } from './lab-ui';

/** One row on wide screens, whatever the number of cards */
const GRID_COLS: Record<number, string> = {
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
  7: 'lg:grid-cols-4 xl:grid-cols-7',
};

/** /lab-tests/full-body (?type=PACKAGE) */
export const categoryHref = (key: string, type: LabTypeFilter = 'ALL') =>
  `/lab-tests/${encodeURIComponent(key)}${type !== 'ALL' ? `?type=${type}` : ''}`;

function CategoryCardLink({ card }: { card: LabCategoryCard }) {
  const { Icon, tone } = categoryStyle(card.key);
  return (
    <Link
      href={categoryHref(card.key)}
      className="group flex h-full w-full flex-col rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff574d]"
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </span>
      <span className="mt-3 text-sm font-bold leading-snug text-gray-900 group-hover:text-[#ff574d]">{card.label}</span>
      <span className="mt-0.5 line-clamp-2 text-xs text-gray-500">{card.description}</span>
      <span className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs font-semibold text-gray-700">
        <span>
          {plural(card.count, 'item', 'items')}
          {card.fromPrice != null && card.count > 0 && <span className="font-normal text-gray-500"> · from {formatPkr(card.fromPrice)}</span>}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-[#ff574d]" />
      </span>
    </Link>
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

export default function LabCatalog() {
  const router = useRouter();
  const cart = useLabCart();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<LabTypeFilter>('ALL');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<LabItem | null>(null);
  const [retry, setRetry] = useState(0);

  // Older links (/lab-tests?group=diabetes) go to the category's own page
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const group = p.get('group');
      const t = p.get('type');
      if (group) router.replace(categoryHref(group, t === 'PACKAGE' || t === 'INDIVIDUAL_TEST' ? t : 'ALL'));
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    getLabCatalogApi()
      .then((c) => !cancelled && setCatalog(c))
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

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            <LabListing
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
        catalog.sections.map((section, i) => (
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
                    <CategoryCardLink card={c} />
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
            </div>
          </section>
        ))
      )}

      {openItem && <LabItemModal item={openItem} inCart={cart.has(openItem.id)} onBook={(x) => cart.add(x)} onClose={() => setOpenItem(null)} />}
      <LabCart />
    </div>
  );
}
