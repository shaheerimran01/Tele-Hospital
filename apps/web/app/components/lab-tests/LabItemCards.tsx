'use client';

// Cards for the lab listing: health packages (open the details modal) and
// individual tests. "Select Lab" opens the partner-lab picker (SelectLabModal).

import { Check, Clock, Droplet, FlaskConical, Sparkles, TestTube } from 'lucide-react';
import { formatPkr, type LabItem } from '@/app/lib/api/lab-tests';

export const openLabCart = () => window.dispatchEvent(new CustomEvent('lab-cart:open'));

/** "45% OFF", "Smart Report" ... or the discount when there is no badge */
function badgeOf(item: LabItem) {
  if (item.badgeText) return item.badgeText;
  if (item.discountPercent >= 5) return `${item.discountPercent}% OFF`;
  return null;
}

const genderLabel = (g: string | null) => (g === 'MALE' ? 'For men' : g === 'FEMALE' ? 'For women' : null);

/** Imaging items have no sample ("N/A (Scan)") */
const sampleLabel = (s: string | null) => (!s || /^n\/a/i.test(s) ? null : s);

/**
 * Patients pay the price of the lab they choose, so cards show the lowest
 * partner-lab price ("Prices from Rs. X") instead of one fixed price.
 */
export function Price({ item, size = 'md' }: { item: LabItem; size?: 'md' | 'lg' }) {
  const offer = item.labOffer;
  if (!offer || offer.labsCount === 0 || offer.fromPrice == null) {
    return <p className={`font-semibold text-gray-600 ${size === 'lg' ? 'text-base' : 'text-xs'}`}>Select a lab to view price</p>;
  }
  // return (
  //   <div>
  //     <p className={`text-gray-500 ${size === 'lg' ? 'text-sm' : 'text-[11px]'}`}>Prices from</p>
  //     <p className={`font-bold tabular-nums text-gray-900 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>{formatPkr(offer.fromPrice)}</p>
  //     <p className={`text-gray-500 ${size === 'lg' ? 'text-xs' : 'text-[11px]'}`}>{offer.labsCount === 1 ? 'at 1 verified lab' : `at ${offer.labsCount} verified labs`}</p>
  //   </div>
  // );
}

function Meta({ item }: { item: LabItem }) {
  const sample = sampleLabel(item.sampleRequired);
  return (
    <ul className="mt-3 space-y-1 text-xs text-gray-600">
      {item.reportTime && (
        <li className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" /> Report in {item.reportTime}
        </li>
      )}
      {sample && (
        <li className="flex items-center gap-1.5">
          <Droplet className="h-3.5 w-3.5 shrink-0 text-gray-400" /> {sample} sample
        </li>
      )}
      {item.preparation && !/no special preparation/i.test(item.preparation) && (
        <li className="flex items-start gap-1.5">
          <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="line-clamp-1" title={item.preparation}>
            {item.preparation}
          </span>
        </li>
      )}
    </ul>
  );
}

function BookButton({ inCart, onBook, label }: { inCart: boolean; onBook: () => void; label: string }) {
  return inCart ? (
    <button
      type="button"
      onClick={openLabCart}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
    >
      <Check className="h-4 w-4" /> In Cart
    </button>
  ) : (
    <button
      type="button"
      onClick={onBook}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ff574d] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#e8453b]"
    >
      <FlaskConical className="h-4 w-4" /> {label}
    </button>
  );
}

/** A health package: the whole card opens the details (tests are not booked one by one). */
export function PackageCard({ item, inCart, onOpen, onBook }: { item: LabItem; inCart: boolean; onOpen: () => void; onBook: () => void }) {
  const badge = badgeOf(item);
  const gender = genderLabel(item.targetGender);
  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-gray-300 hover:shadow-md">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#fff1ef] px-2 py-0.5 text-[11px] font-semibold text-[#d9443b]">
          <Sparkles className="h-3 w-3" /> Health Package
        </span>
        {badge && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{badge}</span>}
        {gender && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{gender}</span>}
      </div>
      <button type="button" onClick={onOpen} className="mt-2.5 text-left">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 hover:text-[#ff574d]">{item.title}</h3>
        <p className="mt-1 text-xs font-semibold text-[#d9443b]">Contains {item.totalTestsCount} tests</p>
        {item.testsPreview.length > 0 && (
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">
            Includes {item.testsPreview.join(', ')}
            {item.listedTestsCount > item.testsPreview.length ? ` and ${item.listedTestsCount - item.testsPreview.length} more` : ''}
          </p>
        )}
      </button>
      <Meta item={item} />
      <div className="mt-auto pt-4">
        <Price item={item} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400"
          >
            View Tests
          </button>
          <BookButton inCart={inCart} onBook={onBook} label="Select Lab" />
        </div>
      </div>
    </article>
  );
}

/** A single test or scan, booked on its own. */
export function TestCard({ item, inCart, onOpen, onBook }: { item: LabItem; inCart: boolean; onOpen: () => void; onBook: () => void }) {
  const badge = badgeOf(item);
  const gender = genderLabel(item.targetGender);
  return (
    <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-xs transition hover:border-gray-300 hover:shadow-md">
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
          <TestTube className="h-3 w-3" /> {sampleLabel(item.sampleRequired) ? 'Lab Test' : 'Scan / Imaging'}
        </span>
        {badge && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{badge}</span>}
        {gender && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{gender}</span>}
      </div>
      <button type="button" onClick={onOpen} className="mt-2.5 text-left">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900 hover:text-[#ff574d]">{item.title}</h3>
      </button>
      <Meta item={item} />
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <Price item={item} />
        <BookButton inCart={inCart} onBook={onBook} label="Select Lab" />
      </div>
    </article>
  );
}
