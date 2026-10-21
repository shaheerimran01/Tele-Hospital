'use client';

// Lab Tests page body, laid out like the reference design:
//   hero (title, search, quick actions, "Find tests & packages for your needs" box | 2x2 trust tiles),
//   "Tests and packages for your health needs" (photo cards), the banners slot,
//   "Radiology tests, x-rays & scans" (photo cards), then "Routine Diagnostics & Specialized Care".
// Every card opens its own page, /lab-tests/<category>; "X Rays, Scans & More" opens /lab-tests/scans.
// Cards and counts come from the LabPackage table (GET /lab-tests/catalog).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, ChevronLeft, ChevronRight, CircleAlert, LoaderCircle, MessageCircle, Phone, Search, X, Zap } from 'lucide-react';
import { formatPkr, getLabCatalogApi, type LabCatalog as Catalog, type LabCategoryCard, type LabItem, type LabSection, type LabTypeFilter } from '@/app/lib/api/lab-tests';
import LabListing, { plural } from './LabListing';
import LabItemModal from './LabItemModal';
import LabCart from './LabCart';
import { useLabCart } from './lab-cart';
import { CARD_BACKDROP, CARD_PHOTO, HERO_TILES, categoryStyle } from './lab-ui';

/** /lab-tests/full-body (?type=PACKAGE) */
export const categoryHref = (key: string, type: LabTypeFilter = 'ALL') =>
  `/lab-tests/${encodeURIComponent(key)}${type !== 'ALL' ? `?type=${type}` : ''}`;

// Booking by phone / WhatsApp: shown only when the numbers are configured (apps/web .env)
const LAB_PHONE = (process.env.NEXT_PUBLIC_LAB_PHONE || '').trim();
const LAB_WHATSAPP = (process.env.NEXT_PUBLIC_LAB_WHATSAPP || '').replace(/[^\d]/g, '');
const WHATSAPP_TEXT = encodeURIComponent('Hello Tabibistan Labs, I would like to book a lab test.');

type CardLike = Pick<LabCategoryCard, 'key' | 'label' | 'count' | 'fromPrice'> & { description?: string };

const countText = (c: CardLike) => (c.count > 0 ? plural(c.count, 'item', 'items') : 'Coming soon');

/** Photo with a fallback to the category icon when the image cannot load */
function CardPhoto({ cardKey, alt, className }: { cardKey: string; alt: string; className: string }) {
  const [failed, setFailed] = useState(false);
  const src = CARD_PHOTO[cardKey];
  const { Icon, tone } = categoryStyle(cardKey);
  if (!src || failed) {
    return (
      <span className={`flex items-center justify-center ${tone} ${className}`}>
        <Icon className="h-10 w-10" />
      </span>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** Small tile in the hero box: name on the left, icon on the right */
function NeedTile({ card }: { card: CardLike }) {
  const { Icon, tone } = categoryStyle(card.key);
  return (
    <Link
      href={categoryHref(card.key)}
      className="group flex h-full min-h-[72px] flex-col-reverse items-start justify-end gap-2 rounded-xl sm:flex-row sm:items-center sm:justify-between border border-gray-200 bg-white p-3 transition hover:border-[#ff574d]/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff574d]"
    >
      <span className="min-w-0 sm:flex-1">
        <span className="block text-xs font-semibold leading-snug text-gray-900 group-hover:text-[#d9443b] sm:text-sm">{card.label}</span>
        <span className="mt-0.5 block text-[11px] text-gray-500">{countText(card)}</span>
      </span>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${tone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </Link>
  );
}

/** Photo card with the name under it (health needs and radiology rows) */
function PhotoCard({ card, backdrop }: { card: CardLike; backdrop: string }) {
  return (
    <Link
      href={categoryHref(card.key)}
      className="group flex w-[44%] shrink-0 snap-start flex-col items-center focus:outline-none sm:w-[30%] lg:w-auto"
    >
      <span
        className={`block aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-b ${backdrop} p-1.5 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-[#ff574d]`}
      >
        <CardPhoto cardKey={card.key} alt={card.label} className="h-full w-full rounded-xl" />
      </span>
      <span className="mt-2 text-center text-xs font-semibold text-gray-800 group-hover:text-[#d9443b] sm:text-sm">{card.label}</span>
      <span className="text-center text-[11px] text-gray-500">
        {countText(card)}
        {card.fromPrice != null && card.count > 0 && <> · from {formatPkr(card.fromPrice)}</>}
      </span>
    </Link>
  );
}

/** A row of photo cards: scrolls sideways on phones (with arrows), one row on wide screens */
function PhotoRow({ section, backdrop, action }: { section: LabSection; backdrop: (key: string) => string; action?: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: 'smooth' });
  const cols = section.cards.length >= 7 ? 'lg:grid-cols-7' : 'lg:grid-cols-6';
  return (
    <section id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20 py-7">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={`${section.id}-title`} className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {section.title}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            <span className="flex gap-1.5 lg:hidden">
              <button type="button" onClick={() => move(-1)} aria-label="Scroll left" className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => move(1)} aria-label="Scroll right" className="rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-50">
                <ChevronRight className="h-4 w-4" />
              </button>
            </span>
          </div>
        </div>
        <div ref={row} className={`-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 lg:mx-0 lg:grid lg:overflow-visible lg:px-0 ${cols}`}>
          {section.cards.map((c) => (
            <PhotoCard key={c.key} card={c} backdrop={backdrop(c.key)} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Icon card (Routine Diagnostics & Specialized Care) */
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
          {countText(card)}
          {card.fromPrice != null && card.count > 0 && <span className="font-normal text-gray-500"> · from {formatPkr(card.fromPrice)}</span>}
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-[#ff574d]" />
      </span>
    </Link>
  );
}

export default function LabCatalog({ banners }: { banners?: ReactNode }) {
  const router = useRouter();
  const cart = useLabCart();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<LabTypeFilter>('ALL');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [openItem, setOpenItem] = useState<LabItem | null>(null);
  const [retry, setRetry] = useState(0);
  const searchBox = useRef<HTMLInputElement>(null);

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

  const needs = catalog?.sections.find((s) => s.id === 'needs') ?? catalog?.sections[0];
  const others = catalog?.sections.filter((s) => s !== needs) ?? [];
  // Hero box: Full Body + "X Rays, Scans & More" on the first row, the rest below
  const needTiles: CardLike[] = needs ? [needs.cards[0], ...(needs.shortcut ? [needs.shortcut] : []), ...needs.cards.slice(1)].filter(Boolean) : [];
  const scansKey = catalog?.sections.map((s) => s.shortcut).find(Boolean)?.key;

  const quickOrder = () => {
    searchBox.current?.focus();
    searchBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const renderSection = (section: LabSection) => {
    if (section.id === 'health-needs') {
      return <PhotoRow key={section.id} section={section} backdrop={(k) => CARD_BACKDROP[k] ?? 'from-gray-100 to-gray-200'} />;
    }
    if (section.id === 'radiology-section') {
      return (
        <PhotoRow
          key={section.id}
          section={section}
          backdrop={() => 'from-[#ffe4dc] to-[#ff9f8a]'}
          action={
            scansKey && (
              <Link href={categoryHref(scansKey)} className="hidden items-center gap-1 text-sm font-semibold text-[#d9443b] hover:underline sm:inline-flex">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            )
          }
        />
      );
    }
    return (
      <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-20 bg-gray-50/60 py-8">
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
          <h2 id={`${section.id}-title`} className="mb-5 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {section.cards.map((c) => (
              <CategoryCardLink key={c.key} card={c} />
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1360px] grid-cols-1 gap-6 px-4 pb-4 pt-6 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:pt-8">
          <div className="min-w-0 lg:col-span-7">
            <h1 className="max-w-xl text-[28px] font-extrabold leading-tight tracking-tight text-gray-900 sm:text-4xl">
              Book lab tests online from trusted and certified labs
            </h1>

            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query.trim());
              }}
              className="mt-5 flex h-12 items-center rounded-full border border-gray-200 bg-white pl-4 pr-1 shadow-sm focus-within:border-[#ff574d] focus-within:ring-2 focus-within:ring-[#ff574d]/15"
            >
              <label htmlFor="lab-search" className="sr-only">
                Search tests or packages
              </label>
              <input
                ref={searchBox}
                id="lab-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tests or full body checkups"
                className="h-full w-full bg-transparent pr-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="rounded-full p-2 text-gray-400 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              )}
              <button type="submit" aria-label="Search" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff574d] text-white shadow-sm hover:bg-[#e8453b]">
                <Search className="h-4 w-4" />
              </button>
            </form>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {LAB_PHONE && (
                <a href={`tel:${LAB_PHONE.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2 rounded-lg bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100">
                  <Phone className="h-4 w-4" /> Book via Phone Call
                </a>
              )}
              <button type="button" onClick={quickOrder} className="inline-flex items-center gap-2 rounded-lg bg-pink-50 px-3.5 py-2 text-xs font-semibold text-pink-800 hover:bg-pink-100">
                <Zap className="h-4 w-4" /> Quick Order
              </button>
              {LAB_WHATSAPP && (
                <a
                  href={`https://wa.me/${LAB_WHATSAPP}?text=${WHATSAPP_TEXT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-4 w-4" /> Book via WhatsApp
                </a>
              )}
            </div>

            {/* Find tests & packages for your needs */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/60 p-3.5 sm:p-4">
              <h2 id="needs-title" className="mb-3 text-sm font-bold text-gray-900">
                {needs?.title ?? 'Find tests & packages for your needs'}
              </h2>
              {error ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                  <CircleAlert className="h-4 w-4 shrink-0" /> {error}
                  <button type="button" onClick={() => setRetry((n) => n + 1)} className="font-semibold underline">
                    Try again
                  </button>
                </div>
              ) : !catalog ? (
                <p className="flex items-center gap-2 py-6 text-sm text-gray-500">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Loading tests and packages…
                </p>
              ) : (
                <div id={needs?.id} aria-labelledby="needs-title" className="grid grid-cols-6 gap-2.5">
                  {needTiles.map((c, i) => (
                    <div key={c.key} className={i < 2 ? 'col-span-3' : 'col-span-2'}>
                      <NeedTile card={c} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3 lg:col-span-5">
          {/* Trust tiles */}
          <div className="hidden grid-cols-2 gap-3 sm:grid lg:gap-3.5">
            {HERO_TILES.map((t) => (
              <div key={t.title} className="relative aspect-[4/3.3] overflow-hidden rounded-2xl bg-gray-800 shadow-sm">
                <img src={t.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3.5">
                  <p className="text-sm font-bold leading-tight text-white">{t.title}</p>
                  <p className="mt-0.5 text-[11px] text-gray-200">{t.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* For laboratories: registration */}
          <div className="flex flex-col gap-3 rounded-2xl border border-[#e7e2d8] bg-[#f6f4ef] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141b34] text-white">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900">Own a diagnostic lab?</p>
                <p className="text-xs text-gray-600">List your lab and branches on Tabibistan and receive test bookings.</p>
              </div>
            </div>
            <Link
              href="/lab-login"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#232c4f] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#141b34]/40 focus-visible:ring-offset-2"
            >
              Register Your Lab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          </div>
        </div>

        {search && (
          <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
            <LabListing
              key={`search-${search}`}
              title={`Results for "${search}"`}
              search={search}
              type={type}
              onType={setType}
              onClose={() => setQuery('')}
              onOpenItem={setOpenItem}
            />
          </div>
        )}
      </section>

      {/* Health needs, banners, radiology, routine */}
      {others.map((section, i) => (
        <div key={section.id}>
          {renderSection(section)}
          {i === 0 && banners}
        </div>
      ))}
      {!catalog && banners}

      {openItem && <LabItemModal item={openItem} inCart={cart.has(openItem.id)} onBook={(x) => cart.add(x)} onClose={() => setOpenItem(null)} />}
      <LabCart />
    </div>
  );
}
