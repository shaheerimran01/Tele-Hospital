'use client';

// Slide-over to edit one catalog item for this lab: price override, overall
// availability and (multi-test packages only) which sub-tests the lab offers.

import { useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, LoaderCircle, RotateCcw, Search, X } from 'lucide-react';
import { formatPkr } from '@/app/lib/api/lab-tests';
import { updateLabPriceApi, type LabPricingItem } from '@/app/lib/api/lab-pricing';
import Toggle from './Toggle';

const MAX_PRICE = 10_000_000;

interface Props {
  item: LabPricingItem;
  laboratoryId: string;
  onClose: () => void;
  onSaved: (item: LabPricingItem) => void;
}

const parsePrice = (s: string): number | null | 'invalid' => {
  const t = s.replace(/[,\s]/g, '');
  if (!t) return null;
  if (!/^\d+$/.test(t)) return 'invalid';
  const n = Number(t);
  return n >= 1 && n <= MAX_PRICE ? n : 'invalid';
};

export default function EditItemDrawer({ item, laboratoryId, onClose, onSaved }: Props) {
  const [base, setBase] = useState(item.custom.basePrice != null ? String(item.custom.basePrice) : '');
  const [discount, setDiscount] = useState(item.custom.discountPrice != null ? String(item.custom.discountPrice) : '');
  const [available, setAvailable] = useState(item.isAvailable);
  const [disabled, setDisabled] = useState<Set<string>>(() => new Set(item.disabledSubTests));
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isMulti = item.subTests.length > 1;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, saving]);

  // Validation (whole rupees; discount needs a base and cannot exceed it)
  const b = parsePrice(base);
  const d = parsePrice(discount);
  const priceError =
    b === 'invalid'
      ? 'Base price must be a whole number between 1 and 10,000,000.'
      : d === 'invalid'
        ? 'Discounted price must be a whole number between 1 and 10,000,000.'
        : b == null && d != null
          ? 'Enter a base price to set a discounted price.'
          : b != null && d != null && d > b
            ? 'Discounted price cannot be higher than the base price.'
            : null;
  const allOff = isMulti && disabled.size >= item.subTests.length;

  const preview =
    b != null && b !== 'invalid' && d !== 'invalid'
      ? { base: b, price: d ?? b }
      : b == null && d == null
        ? { base: item.master.basePrice, price: item.master.discountPrice ?? item.master.basePrice }
        : null;
  const previewPercent = preview && preview.base > preview.price ? Math.round(((preview.base - preview.price) / preview.base) * 100) : 0;

  const dirty =
    (b === 'invalid' ? -1 : b) !== item.custom.basePrice ||
    (d === 'invalid' ? -1 : d === b ? null : d) !== item.custom.discountPrice ||
    available !== item.isAvailable ||
    disabled.size !== item.disabledSubTests.length ||
    item.disabledSubTests.some((n) => !disabled.has(n));

  const visibleTests = useMemo(() => {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    return words.length ? item.subTests.filter((t) => words.every((w) => t.toLowerCase().includes(w))) : item.subTests;
  }, [filter, item.subTests]);

  const toggleTest = (name: string, on: boolean) =>
    setDisabled((prev) => {
      const next = new Set(prev);
      if (on) next.delete(name);
      else next.add(name);
      return next;
    });

  const save = async () => {
    if (priceError || allOff || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateLabPriceApi(item.id, {
        laboratoryId,
        customBasePrice: b as number | null,
        customDiscountPrice: d as number | null,
        isAvailable: available,
        ...(isMulti ? { disabledSubTests: item.subTests.filter((t) => disabled.has(t)) } : {}),
      });
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the changes.');
      setSaving(false);
    }
  };

  const onCount = item.subTests.length - disabled.size;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/40" onClick={() => !saving && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-item-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start gap-3 border-b border-[#ece9e2] px-5 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  item.itemType === 'PACKAGE' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'
                }`}
              >
                {item.itemType === 'PACKAGE' ? 'Health Package' : 'Single Test'}
              </span>
              {item.groupLabel && <span className="text-xs text-[#6b6f80]">{item.groupLabel}</span>}
              {item.code && <span className="text-xs text-[#8a8d99]">· {item.code}</span>}
            </div>
            <h2 id="edit-item-title" className="mt-1 text-base font-semibold leading-snug text-[#141b34]">
              {item.title}
            </h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-full p-1.5 text-[#8a8d99] hover:bg-[#f3f1ec]">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Section 1: pricing & availability */}
          <section aria-labelledby="pricing-title">
            <div className="flex items-center justify-between gap-2">
              <h3 id="pricing-title" className="text-sm font-semibold text-[#141b34]">
                Pricing for your lab
              </h3>
              {(base || discount) && (
                <button
                  type="button"
                  onClick={() => {
                    setBase('');
                    setDiscount('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#3a3f52] hover:underline"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Use master price
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#6b6f80]">
              Master price: {formatPkr(item.master.basePrice)}
              {item.master.discountPrice != null && item.master.discountPrice < item.master.basePrice && <> · discounted {formatPkr(item.master.discountPrice)}</>}.
              Leave both fields empty to use it.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#3a3f52]">Base Price (PKR)</span>
                <input
                  inputMode="numeric"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder={String(Math.round(item.master.basePrice))}
                  aria-invalid={b === 'invalid'}
                  className="w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm tabular-nums text-[#141b34] outline-none placeholder:text-gray-400 focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[#3a3f52]">
                  Discounted Price (PKR) <span className="font-normal text-[#8a8d99]">optional</span>
                </span>
                <input
                  inputMode="numeric"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder={b != null && b !== 'invalid' ? 'No discount' : String(Math.round(item.master.discountPrice ?? item.master.basePrice))}
                  aria-invalid={d === 'invalid'}
                  className="w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm tabular-nums text-[#141b34] outline-none placeholder:text-gray-400 focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10"
                />
              </label>
            </div>
            {priceError ? (
              <p className="mt-2 text-xs text-red-600" role="alert">
                {priceError}
              </p>
            ) : (
              preview && (
                <p className="mt-2 text-xs text-[#3a3f52]">
                  Patients pay <span className="font-semibold text-[#141b34]">{formatPkr(preview.price)}</span>
                  {previewPercent > 0 && (
                    <>
                      {' '}
                      <span className="text-[#8a8d99] line-through">{formatPkr(preview.base)}</span> · {previewPercent}% off
                    </>
                  )}
                  {b == null && d == null && <span className="text-[#8a8d99]"> (master price)</span>}
                </p>
              )
            )}

            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#ece9e2] bg-[#faf9f6] px-4 py-3">
              <div>
                <p className="text-sm font-medium text-[#141b34]">{available ? 'Available for Booking' : 'Temporarily Unavailable'}</p>
                <p className="text-xs text-[#6b6f80]">
                  {available ? 'Patients can book this at your lab.' : 'Hidden from bookings at your lab until you switch it back on.'}
                </p>
              </div>
              <Toggle checked={available} onChange={setAvailable} label="Overall availability" />
            </div>
          </section>

          {/* Section 2: sub-tests (multi-test packages only) */}
          {isMulti && (
            <section aria-labelledby="subtests-title">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 id="subtests-title" className="text-sm font-semibold text-[#141b34]">
                  Included tests
                </h3>
                <span className="text-xs text-[#6b6f80]">
                  {onCount} of {item.subTests.length} on
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[#6b6f80]">Switch off any test your lab does not perform. Tests in a package are not priced separately.</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.subTests.length > 8 && (
                  <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8d99]" />
                    <input
                      type="search"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      placeholder="Find a test"
                      aria-label="Find a test in this package"
                      className="w-full rounded-lg border border-[#d9d3c6] py-2 pl-8 pr-3 text-sm outline-none focus:border-[#141b34]"
                    />
                  </div>
                )}
                {disabled.size > 0 && (
                  <button type="button" onClick={() => setDisabled(new Set())} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#3a3f52] hover:bg-[#f3f1ec]">
                    Switch all on
                  </button>
                )}
              </div>

              <ul className="mt-2 divide-y divide-[#f0ede6] rounded-xl border border-[#ece9e2]">
                {visibleTests.map((t) => {
                  const on = !disabled.has(t);
                  return (
                    <li key={t} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className={`min-w-0 text-sm ${on ? 'text-[#141b34]' : 'text-[#8a8d99] line-through'}`}>{t}</span>
                      <Toggle size="sm" checked={on} onChange={(v) => toggleTest(t, v)} label={`${t} ${on ? 'on' : 'off'}`} />
                    </li>
                  );
                })}
                {visibleTests.length === 0 && <li className="px-3 py-3 text-xs text-[#8a8d99]">No test matches “{filter}”.</li>}
              </ul>
              {allOff && (
                <p className="mt-2 text-xs text-red-600" role="alert">
                  Keep at least one test on, or switch off the whole package above.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Actions */}
        <footer className="border-t border-[#ece9e2] px-5 py-4">
          {error && (
            <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#3a3f52] hover:bg-[#f3f1ec]">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || !!priceError || allOff || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#141b34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <LoaderCircle className="h-4 w-4 animate-spin" />} Save Changes
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
