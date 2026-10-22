'use client';

// /lab-tests/checkout?labPackageId=&selectedLabId=&selectedBranchId=
// Review of the lab cart at the chosen partner lab: fresh prices from the lab,
// branch choice, home sample collection or branch visit, and the total.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Building2, CircleAlert, House, LoaderCircle, MapPin, Trash2 } from 'lucide-react';
import { apiFileUrl, formatKm, formatPkr, getLabsForTestApi, type LabPartner } from '@/app/lib/api/lab-tests';
import { useLabCart } from './lab-cart';
import { checkoutHref } from './SelectLabModal';

const COORDS_KEY = 'tabibistan_user_coords';
const readCoords = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(COORDS_KEY) ?? 'null');
    return v && typeof v.lat === 'number' ? (v as { lat: number; lng: number }) : null;
  } catch {
    return null;
  }
};

type Fresh = Record<string, LabPartner | null>;

export default function LabCheckout() {
  const router = useRouter();
  const params = useSearchParams();
  const cart = useLabCart();
  const labId = params.get('selectedLabId') ?? '';
  const focusId = params.get('labPackageId') ?? '';
  const branchParam = params.get('selectedBranchId') ?? '';

  const items = useMemo(() => cart.items.filter((x) => x.laboratoryId === labId), [cart.items, labId]);
  const itemKey = items.map((x) => x.id).join(',');
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collection, setCollection] = useState<'home' | 'branch'>('home');

  // Latest price and details of each item at this lab
  useEffect(() => {
    if (!itemKey) return;
    let cancelled = false;
    setError(null);
    const coords = readCoords();
    Promise.all(
      itemKey.split(',').map((id) =>
        getLabsForTestApi(id, coords)
          .then((r) => [id, r.data.find((p) => p.laboratoryId === labId) ?? null] as const)
          .catch(() => [id, undefined] as const),
      ),
    ).then((rows) => {
      if (cancelled) return;
      if (rows.some(([, p]) => p === undefined)) setError('Could not refresh the latest prices. The prices below are from when you chose the lab.');
      const next: Fresh = {};
      rows.forEach(([id, p]) => {
        if (p !== undefined) next[id] = p;
      });
      setFresh(next);
      // keep the cart in line with the lab's current prices
      cart.update((x) => {
        const p = next[x.id];
        return x.laboratoryId === labId && p ? { ...x, price: p.offeredPrice, mrp: p.originalPrice, hasHomeSample: p.hasHomeSample, homeSampleFee: p.homeSampleFee, labName: p.labName } : x;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, labId]);

  const lab = fresh ? Object.values(fresh).find((p): p is LabPartner => !!p) ?? null : null;
  const branches = lab?.branches ?? [];
  const branch = branches.find((b) => b.id === branchParam) ?? branches.find((b) => b.id === items[0]?.branchId) ?? branches[0] ?? null;
  const homeAvailable = lab ? lab.hasHomeSample : items[0]?.hasHomeSample ?? false;
  const mode = homeAvailable ? collection : 'branch';
  const unavailable = items.filter((x) => fresh && fresh[x.id] === null);
  const bookable = items.filter((x) => !(fresh && fresh[x.id] === null));
  const subtotal = bookable.reduce((n, x) => n + x.price, 0);
  const savings = bookable.reduce((n, x) => n + Math.max(0, x.mrp - x.price), 0);
  const homeFee = mode === 'home' ? Math.round((lab?.homeSampleFee ?? items[0]?.homeSampleFee) ?? 0) : 0;
  const total = subtotal + homeFee;

  const chooseBranch = (id: string) => {
    const b = branches.find((x) => x.id === id);
    if (!b) return;
    cart.update((x) => (x.laboratoryId === labId ? { ...x, branchId: b.id, branchName: b.name } : x));
    router.replace(checkoutHref(focusId || items[0]?.id || '', labId, b.id), { scroll: false });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900">Your lab cart is empty</h1>
        <p className="mt-1 text-sm text-gray-600">Choose a test or health package and select a lab to continue.</p>
        <Link href="/lab-tests" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-[#ff574d] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e8453b]">
          <ArrowLeft className="h-4 w-4" /> Browse lab tests
        </Link>
      </div>
    );
  }

  const logo = apiFileUrl(lab?.logoUrl);
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/lab-tests" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-[#ff574d]">
        <ArrowLeft className="h-3.5 w-3.5" /> Continue browsing
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Checkout</h1>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {/* Lab */}
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5" aria-labelledby="lab-title">
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="" className="h-12 w-12 rounded-xl border border-gray-100 object-contain p-0.5" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff1ef] text-lg font-bold text-[#d9443b]">{items[0].labName.charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Diagnostic partner</p>
                <h2 id="lab-title" className="text-base font-bold text-gray-900">
                  {lab?.labName ?? items[0].labName}
                </h2>
              </div>
            </div>

            {!fresh ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Checking the latest prices…
              </p>
            ) : (
              <>
                {branches.length > 0 && (
                  <fieldset className="mt-4">
                    <legend className="mb-2 text-sm font-semibold text-gray-900">Branch</legend>
                    <div className="space-y-2">
                      {branches.map((b) => (
                        <label
                          key={b.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${branch?.id === b.id ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <input type="radio" name="branch" checked={branch?.id === b.id} onChange={() => chooseBranch(b.id)} className="mt-1 accent-[#ff574d]" />
                          <span className="min-w-0 text-sm">
                            <span className="font-semibold text-gray-900">{b.name}</span>
                            {b.distanceKm != null && <span className="text-gray-500"> · {formatKm(b.distanceKm)} away</span>}
                            <span className="mt-0.5 flex items-start gap-1 text-xs text-gray-600">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" /> {b.address}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                <fieldset className="mt-5">
                  <legend className="mb-2 text-sm font-semibold text-gray-900">Sample collection</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 ${!homeAvailable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${mode === 'home' ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200'}`}
                    >
                      <input type="radio" name="collection" disabled={!homeAvailable} checked={mode === 'home'} onChange={() => setCollection('home')} className="mt-1 accent-[#ff574d]" />
                      <span className="text-sm">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <House className="h-4 w-4" /> Home sample collection
                        </span>
                        <span className="text-xs text-gray-600">
                          {homeAvailable ? (homeFee || lab?.homeSampleFee ? `${formatPkr(lab?.homeSampleFee ?? 0)} collection fee` : 'Free') : 'Not offered by this lab'}
                        </span>
                      </span>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${mode === 'branch' ? 'border-[#ff574d] bg-[#fff6f5]' : 'border-gray-200'}`}>
                      <input type="radio" name="collection" checked={mode === 'branch'} onChange={() => setCollection('branch')} className="mt-1 accent-[#ff574d]" />
                      <span className="text-sm">
                        <span className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Building2 className="h-4 w-4" /> Visit the branch
                        </span>
                        <span className="text-xs text-gray-600">{branch ? branch.name : 'At the lab'}</span>
                      </span>
                    </label>
                  </div>
                </fieldset>
              </>
            )}
          </section>

          {/* Items */}
          <section className="rounded-2xl border border-gray-200 bg-white" aria-labelledby="items-title">
            <h2 id="items-title" className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900 sm:px-5">
              Tests &amp; packages ({items.length})
            </h2>
            <ul className="divide-y divide-gray-100">
              {items.map((x) => {
                const p = fresh?.[x.id];
                const gone = fresh && p === null;
                return (
                  <li key={x.id} className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${gone ? 'bg-rose-50/50' : ''} ${x.id === focusId ? 'bg-[#fff6f5]/60' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-gray-900">{x.title}</p>
                      <p className="text-xs text-gray-500">{x.itemType === 'PACKAGE' ? `Health package · ${x.totalTestsCount} tests` : 'Single test'}</p>
                      {p && p.unavailableTests.length > 0 && (
                        <p className="mt-1 text-xs text-amber-800">Not done at this lab: {p.unavailableTests.join(', ')}</p>
                      )}
                      {gone && <p className="mt-1 text-xs font-semibold text-rose-700">This lab no longer offers this. Remove it, or choose another lab for it.</p>}
                    </div>
                    {!gone && (
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold tabular-nums text-gray-900">{formatPkr(x.price)}</p>
                        {x.mrp > x.price && <p className="text-xs tabular-nums text-gray-400 line-through">{formatPkr(x.mrp)}</p>}
                      </div>
                    )}
                    <button type="button" onClick={() => cart.remove(x.id)} aria-label={`Remove ${x.title}`} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit space-y-3 rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 lg:sticky lg:top-24" aria-labelledby="summary-title">
          <h2 id="summary-title" className="text-sm font-semibold text-gray-900">
            Order summary
          </h2>
          {error && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Tests ({bookable.length})</dt>
              <dd className="tabular-nums text-gray-900">{formatPkr(subtotal + savings)}</dd>
            </div>
            {savings > 0 && (
              <div className="flex justify-between text-emerald-700">
                <dt>Lab discount</dt>
                <dd className="tabular-nums">−{formatPkr(savings)}</dd>
              </div>
            )}
            {mode === 'home' && (
              <div className="flex justify-between">
                <dt className="text-gray-600">Home collection</dt>
                <dd className="tabular-nums text-gray-900">{homeFee ? formatPkr(homeFee) : 'Free'}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPkr(total)}</dd>
            </div>
          </dl>
          {unavailable.length > 0 && <p className="text-xs text-rose-700">Remove the items this lab no longer offers to continue.</p>}
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-[#ff574d] px-4 py-3 text-sm font-semibold text-white opacity-60"
          >
            Confirm Booking
          </button>
          <p className="text-xs text-gray-500">
            Online booking confirmation is coming soon. Your lab, branch and prices are saved in your cart on this device.
          </p>
        </aside>
      </div>
    </div>
  );
}
