'use client';

// Package / test details: price, preparation, and for packages the included
// tests grouped into expandable panels. Sub-tests are information only: a
// package is booked as a whole.

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CircleAlert, Clock, Droplet, FlaskConical, LoaderCircle, Plus, UserRound, X } from 'lucide-react';
import { getLabItemApi, type LabItem, type LabItemDetails } from '@/app/lib/api/lab-tests';
import { openLabCart, Price } from './LabItemCards';

export default function LabItemModal({
  item,
  inCart,
  onBook,
  onClose,
}: {
  item: LabItem;
  inCart: boolean;
  onBook: (item: LabItem) => void;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<LabItemDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const dialogRef = useRef<HTMLDivElement>(null);
  const isPackage = item.itemType === 'PACKAGE';

  useEffect(() => {
    let cancelled = false;
    setDetails(null);
    setError(null);
    getLabItemApi(item.slug)
      .then((d) => !cancelled && setDetails(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the details.'));
    return () => {
      cancelled = true;
    };
  }, [item.slug]);

  // Escape closes; the page behind doesn't scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const groups = details?.testGroups ?? [];
  const allOpen = groups.length > 0 && groups.every((g) => open.has(g.name));
  const toggle = (name: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const sample = item.sampleRequired && !/^n\/a/i.test(item.sampleRequired) ? item.sampleRequired : null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lab-item-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d9443b]">{isPackage ? 'Health Package' : 'Individual Test'}</p>
            <h2 id="lab-item-title" className="mt-0.5 text-lg font-bold leading-snug text-gray-900">
              {item.title}
            </h2>
            {isPackage && <p className="mt-0.5 text-sm font-semibold text-gray-700">Contains {item.totalTestsCount} tests</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3">
            <Price item={item} size="lg" />
            {item.badgeText && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{item.badgeText}</span>}
          </div>

          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div className="flex gap-2.5">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-[#ff574d]" />
              <div>
                <dt className="text-xs font-semibold text-gray-500">Fasting &amp; preparation</dt>
                <dd className="text-gray-900">{item.preparation || 'No special preparation required'}</dd>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Droplet className="mt-0.5 h-4 w-4 shrink-0 text-[#ff574d]" />
              <div>
                <dt className="text-xs font-semibold text-gray-500">Sample</dt>
                <dd className="text-gray-900">{sample ?? 'No sample needed (imaging test)'}</dd>
              </div>
            </div>
            {item.reportTime && (
              <div className="flex gap-2.5">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#ff574d]" />
                <div>
                  <dt className="text-xs font-semibold text-gray-500">Report time</dt>
                  <dd className="text-gray-900">{item.reportTime}</dd>
                </div>
              </div>
            )}
            {item.targetGender && (
              <div className="flex gap-2.5">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#ff574d]" />
                <div>
                  <dt className="text-xs font-semibold text-gray-500">Suitable for</dt>
                  <dd className="text-gray-900">{item.targetGender === 'MALE' ? 'Men' : 'Women'}</dd>
                </div>
              </div>
            )}
          </dl>

          {error ? (
            <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          ) : !details ? (
            <p className="flex items-center gap-2 py-4 text-sm text-gray-500">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Loading details…
            </p>
          ) : (
            <>
              {isPackage && groups.length > 0 && (
                <section aria-labelledby="lab-included">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 id="lab-included" className="text-sm font-bold text-gray-900">
                      Tests included
                    </h3>
                    <button
                      type="button"
                      onClick={() => setOpen(allOpen ? new Set() : new Set(groups.map((g) => g.name)))}
                      className="text-xs font-semibold text-[#d9443b] hover:underline"
                    >
                      {allOpen ? 'Collapse all' : 'Expand all'}
                    </button>
                  </div>
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
                    {groups.map((g) => {
                      const expanded = open.has(g.name);
                      const id = `lab-group-${g.name.replace(/\W+/g, '-')}`;
                      return (
                        <li key={g.name}>
                          <button
                            type="button"
                            onClick={() => toggle(g.name)}
                            aria-expanded={expanded}
                            aria-controls={id}
                            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
                          >
                            <span className="text-sm font-semibold text-gray-900">
                              {g.name} <span className="font-normal text-gray-500">({g.count} {g.count === 1 ? 'test' : 'tests'})</span>
                            </span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          </button>
                          {expanded && (
                            <ul id={id} className="grid grid-cols-1 gap-x-4 gap-y-1.5 bg-gray-50/70 px-4 pb-3 pt-1 text-xs text-gray-700 sm:grid-cols-2">
                              {g.tests.map((t) => (
                                <li key={t} className="flex items-start gap-1.5">
                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gray-400" aria-hidden />
                                  {t}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {details.listedTestsCount < details.totalTestsCount && (
                    <p className="mt-2 text-xs text-gray-500">
                      {details.listedTestsCount} of the {details.totalTestsCount} tests in this package are listed by name.
                    </p>
                  )}
                </section>
              )}

              {(details.whyBooked || details.overview || details.whatItMeasures) && (
                <section className="space-y-2 text-sm text-gray-700">
                  <h3 className="text-sm font-bold text-gray-900">About this {isPackage ? 'package' : 'test'}</h3>
                  {details.whyBooked && <p>{details.whyBooked}</p>}
                  {details.whatItMeasures && <p>{details.whatItMeasures}</p>}
                  {details.overview && <p className="text-gray-500">{details.overview}</p>}
                </section>
              )}

              {details.aliases.length > 0 && (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-gray-700">Also known as: </span>
                  {details.aliases.join(', ')}
                </p>
              )}

              {details.faqs.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-bold text-gray-900">Frequently asked questions</h3>
                  {details.faqs.map((f) => (
                    <details key={f.question} className="group rounded-lg border border-gray-200 px-3 py-2">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900 marker:hidden">{f.question}</summary>
                      <p className="mt-1 text-sm text-gray-600">{f.answer}</p>
                    </details>
                  ))}
                </section>
              )}

              {details.notes && <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">{details.notes}</p>}
            </>
          )}
        </div>

        {/* Book the whole package / the test */}
        <div className="border-t border-gray-100 bg-white px-5 py-3">
          {inCart ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                openLabCart();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <Check className="h-4 w-4" /> Added to Cart · View Cart
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onBook(item)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff574d] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#e8453b]"
            >
              <Plus className="h-4 w-4" /> {isPackage ? 'Add to Cart / Book Package' : 'Add to Cart / Book Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
