'use client';

// "Select Diagnostic Partner" slide-over: approved labs offering one test or
// package, with their price, nearest branch distance and home sample collection.
// Choosing a lab pins its price in the lab cart and opens the checkout.
// Open it from anywhere with openSelectLab(item); <SelectLabHost /> (inside
// <LabCart />) renders it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown, CircleAlert, Crosshair, House, LoaderCircle, MapPin, X } from 'lucide-react';
import { apiFileUrl, formatKm, formatPkr, getLabsForTestApi, type LabPartner, type LabsForTestResponse } from '@/app/lib/api/lab-tests';
import { useLabCart, type CartableItem } from './lab-cart';

const OPEN_EVENT = 'lab-select:open';
const COORDS_KEY = 'tabibistan_user_coords';

export const openSelectLab = (item: CartableItem) => window.dispatchEvent(new CustomEvent<CartableItem>(OPEN_EVENT, { detail: item }));

type Coords = { lat: number; lng: number };

const readCoords = (): Coords | null => {
  try {
    const v = JSON.parse(sessionStorage.getItem(COORDS_KEY) ?? 'null');
    return v && typeof v.lat === 'number' && typeof v.lng === 'number' ? v : null;
  } catch {
    return null;
  }
};
const saveCoords = (c: Coords) => {
  try {
    sessionStorage.setItem(COORDS_KEY, JSON.stringify(c));
  } catch {
    // ignore
  }
};

/** Mount once per page (LabCart does it) */
export function SelectLabHost() {
  const [item, setItem] = useState<CartableItem | null>(null);
  useEffect(() => {
    const open = (e: Event) => setItem((e as CustomEvent<CartableItem>).detail);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  return item ? <SelectLabModal key={item.id} item={item} onClose={() => setItem(null)} /> : null;
}

export function checkoutHref(labPackageId: string, labId: string, branchId: string) {
  const q = new URLSearchParams({ labPackageId, selectedLabId: labId, selectedBranchId: branchId });
  return `/lab-tests/checkout?${q.toString()}`;
}

export default function SelectLabModal({ item, onClose }: { item: CartableItem; onClose: () => void }) {
  const router = useRouter();
  const cart = useLabCart();
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [data, setData] = useState<LabsForTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmFor, setConfirmFor] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(
    (near: Coords | null) => {
      setError(null);
      getLabsForTestApi(item.id, near)
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : 'Could not load partner labs.'));
    },
    [item.id],
  );

  // Use the location given earlier in this visit; otherwise list by price until the patient shares it
  useEffect(() => {
    const saved = readCoords();
    setCoords(saved);
    load(saved);
  }, [load]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setLocationNote('Your browser does not share location, so labs are listed by price.');
      return;
    }
    setLocating(true);
    setLocationNote(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        const next = { lat: c.latitude, lng: c.longitude };
        saveCoords(next);
        setCoords(next);
        setLocating(false);
        load(next);
      },
      (err) => {
        setLocating(false);
        setLocationNote(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied, so labs are listed by price. You can allow it in your browser settings.'
            : 'Could not get your location, so labs are listed by price.',
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const choose = (p: LabPartner) => {
    if (cart.lab && cart.lab.id !== p.laboratoryId && cart.items.some((x) => x.id !== item.id) && confirmFor !== p.laboratoryId) {
      setConfirmFor(p.laboratoryId);
      return;
    }
    cart.addWithLab(item, p);
    onClose();
    router.push(checkoutHref(item.id, p.laboratoryId, p.nearestBranch.id));
  };

  const otherLabItems = cart.lab ? cart.items.filter((x) => x.laboratoryId === cart.lab!.id && x.id !== item.id).length : 0;

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-lab-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-lg flex-col bg-[#f8f8f9] shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-gray-200 bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id="select-lab-title" className="text-lg font-bold text-gray-900">
              Select Diagnostic Partner
            </h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-gray-600">{data?.item.title ?? item.title}</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Location */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-5 py-2.5 text-xs">
          {coords ? (
            <span className="flex items-center gap-1.5 text-gray-700">
              <MapPin className="h-3.5 w-3.5 text-[#ff574d]" /> Nearest labs first, from your location
            </span>
          ) : (
            <span className="text-gray-600">Share your location to see the nearest labs first.</span>
          )}
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-semibold text-gray-800 hover:border-gray-400 disabled:opacity-60"
          >
            {locating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            {coords ? 'Update location' : 'Use my location'}
          </button>
          {locationNote && <p className="w-full text-amber-700">{locationNote}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {error ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              <CircleAlert className="h-4 w-4 shrink-0" /> {error}
              <button type="button" onClick={() => load(coords)} className="font-semibold underline">
                Try again
              </button>
            </div>
          ) : !data ? (
            <p className="flex items-center gap-2 py-10 text-sm text-gray-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Finding partner labs…
            </p>
          ) : data.data.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center">
              <Building2 className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm font-semibold text-gray-900">No partner lab offers this yet</p>
              <p className="mt-1 text-xs text-gray-500">We&apos;re adding verified labs across Pakistan. Please check again soon.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-gray-500" aria-live="polite">
                {data.data.length === 1 ? '1 verified lab offers this' : `${data.data.length} verified labs offer this`} ·{' '}
                {data.sortedBy === 'distance' ? 'nearest first' : 'lowest price first'}
              </p>
              <ul className="space-y-3">
                {data.data.map((p) => (
                  <PartnerCard
                    key={p.laboratoryId}
                    partner={p}
                    current={cart.items.find((x) => x.id === item.id)?.laboratoryId === p.laboratoryId}
                    confirm={confirmFor === p.laboratoryId ? { labName: cart.lab?.name ?? 'another lab', count: otherLabItems } : null}
                    onCancelConfirm={() => setConfirmFor(null)}
                    onSelect={() => choose(p)}
                  />
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function PartnerCard({
  partner: p,
  current,
  confirm,
  onCancelConfirm,
  onSelect,
}: {
  partner: LabPartner;
  current: boolean;
  confirm: { labName: string; count: number } | null;
  onCancelConfirm: () => void;
  onSelect: () => void;
}) {
  const [showMissing, setShowMissing] = useState(false);
  const logo = apiFileUrl(p.logoUrl);
  const km = p.nearestBranch.distanceKm;
  return (
    <li className={`rounded-2xl border bg-white p-4 shadow-xs ${current ? 'border-[#ff574d]' : 'border-gray-200'}`}>
      <div className="flex items-start gap-3">
        {logo ? (
          <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-gray-100 object-contain p-0.5" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff1ef] text-base font-bold text-[#d9443b]">{p.labName.charAt(0).toUpperCase()}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-gray-900">{p.labName}</p>
          <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-600">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="min-w-0">
              {km != null && <span className="font-semibold text-gray-800">{formatKm(km)} away · </span>}
              {p.nearestBranch.name}
              <span className="block truncate text-gray-500" title={p.nearestBranch.address}>
                {p.nearestBranch.address}
              </span>
            </span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums text-gray-900">{formatPkr(p.offeredPrice)}</p>
          {p.originalPrice > p.offeredPrice && (
            <p className="text-xs tabular-nums">
              <span className="text-gray-400 line-through">{formatPkr(p.originalPrice)}</span> <span className="font-semibold text-emerald-600">{p.discountPercent}% off</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {p.hasHomeSample ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <House className="h-3 w-3" /> Home Sample Available{p.homeSampleFee ? ` · ${formatPkr(p.homeSampleFee)}` : ' · Free'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
            <Building2 className="h-3 w-3" /> In-Lab Test Only
          </span>
        )}
        {p.branches.length > 1 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">{p.branches.length} branches</span>}
        {p.unavailableTests.length > 0 && (
          <button
            type="button"
            onClick={() => setShowMissing((v) => !v)}
            className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800"
            aria-expanded={showMissing}
          >
            {p.unavailableTests.length} {p.unavailableTests.length === 1 ? 'test' : 'tests'} not done here <ChevronDown className={`h-3 w-3 transition ${showMissing ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {showMissing && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">Not included at this lab: {p.unavailableTests.join(', ')}.</p>}

      {confirm ? (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900" role="alert">
          Your cart has {confirm.count === 1 ? '1 test' : `${confirm.count} tests`} from {confirm.labName}. Tests are booked at one lab, so choosing {p.labName} will
          replace them.
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onCancelConfirm} className="rounded-lg px-3 py-1.5 font-semibold text-gray-700 hover:bg-amber-100">
              Keep my cart
            </button>
            <button type="button" onClick={onSelect} className="rounded-lg bg-[#ff574d] px-3 py-1.5 font-semibold text-white hover:bg-[#e8453b]">
              Replace and continue
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSelect}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#ff574d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e8453b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff574d]/40 focus-visible:ring-offset-2"
        >
          {current ? 'Continue with this lab' : `Select ${p.labName}`}
        </button>
      )}
    </li>
  );
}
