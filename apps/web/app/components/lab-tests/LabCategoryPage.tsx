'use client';

// /lab-tests/<category>: one category's packages and tests on its own page,
// with the other categories of the same section one tap away.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ChevronRight, CircleAlert, LoaderCircle } from 'lucide-react';
import { formatPkr, getLabCatalogApi, type LabCatalog, type LabItem, type LabTypeFilter } from '@/app/lib/api/lab-tests';
import LabListing, { plural } from './LabListing';
import LabItemModal from './LabItemModal';
import LabCart from './LabCart';
import { useLabCart } from './lab-cart';
import { categoryStyle } from './lab-ui';
import { categoryHref } from './LabCatalog';

const readType = (t: string | null): LabTypeFilter => (t === 'PACKAGE' || t === 'INDIVIDUAL_TEST' ? t : 'ALL');

export default function LabCategoryPage({ group }: { group: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useLabCart();
  const [catalog, setCatalog] = useState<LabCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [openItem, setOpenItem] = useState<LabItem | null>(null);
  const type = readType(params.get('type'));
  const activePill = useRef<HTMLAnchorElement>(null);

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

  const section = catalog?.sections.find((s) => s.cards.some((c) => c.key === group));
  const card = section?.cards.find((c) => c.key === group);
  const { Icon, tone } = categoryStyle(group);

  // The type filter is part of the address, so the page can be shared or reloaded
  const setType = (t: LabTypeFilter) => router.replace(categoryHref(group, t), { scroll: false });

  useEffect(() => {
    if (!card) return;
    document.title = `${card.label} - Lab Tests - Tabibistan`;
    // On phones the category row scrolls sideways: show the current one
    activePill.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [card]);

  return (
    <div className="bg-white">
      <div className="border-b border-gray-100 bg-gradient-to-b from-[#fff6f5] to-white">
        <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-gray-500">
            <Link href="/lab-tests" className="font-medium hover:text-[#ff574d]">
              Lab Tests
            </Link>
            {section && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link href={`/lab-tests#${section.id}`} className="hover:text-[#ff574d]">
                  {section.title}
                </Link>
              </>
            )}
            {card && (
              <>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="font-semibold text-gray-800" aria-current="page">
                  {card.label}
                </span>
              </>
            )}
          </nav>

          {error ? (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              <CircleAlert className="h-4 w-4 shrink-0" /> {error}
              <button type="button" onClick={() => setRetry((n) => n + 1)} className="font-semibold underline">
                Try again
              </button>
            </div>
          ) : !catalog ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-gray-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading…
            </p>
          ) : !card || !section ? (
            <div className="mt-6 space-y-3">
              <h1 className="text-2xl font-bold text-gray-900">This category was not found</h1>
              <Link href="/lab-tests" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#d9443b] hover:underline">
                <ArrowLeft className="h-4 w-4" /> Back to all lab tests
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-4 flex items-start gap-4">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                  <Icon className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{card.label}</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    {[
                      card.description,
                      [card.packages > 0 && plural(card.packages, 'health package', 'health packages'), card.tests > 0 && plural(card.tests, 'individual test', 'individual tests')]
                        .filter(Boolean)
                        .join(' and '),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    {card.fromPrice != null && card.count > 0 && <> · from {formatPkr(card.fromPrice)}</>}
                  </p>
                </div>
              </div>

              {/* The other categories of this section */}
              {section.cards.length > 1 && (
                <div className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                  <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap" aria-label={section.title}>
                    {section.cards.map((c) => (
                      <li key={c.key}>
                        <Link
                          href={categoryHref(c.key)}
                          ref={c.key === group ? activePill : undefined}
                          aria-current={c.key === group ? 'page' : undefined}
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            c.key === group ? 'border-[#ff574d] bg-[#fff1ef] text-[#d9443b]' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          {c.label}
                          <span className={c.key === group ? 'text-[#d9443b]/70' : 'text-gray-400'}>({c.count})</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {card && (
        <div className="mx-auto max-w-[1360px] px-4 py-6 sm:px-6">
          <LabListing key={group} group={group} type={type} onType={setType} onOpenItem={setOpenItem} plain />
        </div>
      )}

      {openItem && <LabItemModal item={openItem} inCart={cart.has(openItem.id)} onBook={(x) => cart.add(x)} onClose={() => setOpenItem(null)} />}
      <LabCart />
    </div>
  );
}
