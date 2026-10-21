'use client';

// Lab dashboard: Test & Package Inventory. Every master catalog item with this
// lab's price, availability and switched-off sub-tests (LabPackagePrice).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircleAlert, CircleCheck, FlaskConical, LoaderCircle, Pencil, Search, Tag, X } from 'lucide-react';
import { formatPkr } from '@/app/lib/api/lab-tests';
import { getLabPricingApi, isUuid, updateLabPriceApi, type LabPricingItem, type LabPricingResponse } from '@/app/lib/api/lab-pricing';
import EditItemDrawer from './EditItemDrawer';
import Toggle from './Toggle';

const LAB_KEY = 'lab_dashboard_lab_id';
const PAGE = 40;

type TypeTab = 'ALL' | 'PACKAGE' | 'INDIVIDUAL_TEST';
type AvailTab = 'ALL' | 'AVAILABLE' | 'DISABLED';

const readStoredLab = () => {
  try {
    return localStorage.getItem(LAB_KEY);
  } catch {
    return null;
  }
};
const storeLab = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LAB_KEY, id);
    else localStorage.removeItem(LAB_KEY);
  } catch {
    // ignore
  }
};

const STATUS_STYLE = {
  APPROVED: { label: 'Verified', cls: 'bg-[#e8f3ec] text-[#2f7a4b]' },
  PENDING: { label: 'Verification pending', cls: 'bg-amber-50 text-amber-800' },
  REJECTED: { label: 'Not approved', cls: 'bg-red-50 text-red-700' },
} as const;

export default function ManageTests({ labId: propLabId }: { labId?: string } = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const [labId, setLabId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<LabPricingResponse | null>(null);
  const [error, setError] = useState<{ message: string; status: number } | null>(null);
  const [retry, setRetry] = useState(0);

  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeTab>('ALL');
  const [group, setGroup] = useState('');
  const [avail, setAvail] = useState<AvailTab>('ALL');
  const [shown, setShown] = useState(PAGE);
  const [editing, setEditing] = useState<LabPricingItem | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  // Lab from ?labId= (or ?laboratoryId=), or prompt screen when not passed in URL
  useEffect(() => {
    const fromUrl = propLabId || params.get('labId') || params.get('laboratoryId');
    const id = fromUrl && isUuid(fromUrl) ? fromUrl : null;
    if (fromUrl && isUuid(fromUrl)) storeLab(fromUrl);
    setLabId(id);
    setReady(true);
  }, [params, propLabId]);

  useEffect(() => {
    if (!labId) return;
    let cancelled = false;
    setError(null);
    setData(null);
    getLabPricingApi(labId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError({ message: e.message, status: e.status ?? 0 }));
    return () => {
      cancelled = true;
    };
  }, [labId, retry]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => setShown(PAGE), [query, type, group, avail]);

  const items = data?.items ?? [];
  const replaceItem = useCallback((next: LabPricingItem) => setData((d) => (d ? { ...d, items: d.items.map((i) => (i.id === next.id ? next : i)) } : d)), []);

  // Summary from the current state, so it follows edits immediately
  const summary = useMemo(
    () => ({
      total: items.length,
      packages: items.filter((i) => i.itemType === 'PACKAGE').length,
      tests: items.filter((i) => i.itemType === 'INDIVIDUAL_TEST').length,
      available: items.filter((i) => i.isAvailable && i.isActiveInCatalog).length,
      disabled: items.filter((i) => !i.isAvailable).length,
      custom: items.filter((i) => i.hasCustomPrice).length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((i) => {
      if (type !== 'ALL' && i.itemType !== type) return false;
      if (group && i.group !== group) return false;
      if (avail === 'AVAILABLE' && !i.isAvailable) return false;
      if (avail === 'DISABLED' && i.isAvailable) return false;
      if (!words.length) return true;
      const hay = [i.title, i.code ?? '', ...i.aliases].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [items, query, type, group, avail]);

  const typeCounts = useMemo(() => {
    const base = items.filter((i) => (!group || i.group === group) && (avail === 'ALL' || (avail === 'AVAILABLE') === i.isAvailable));
    return { ALL: base.length, PACKAGE: base.filter((i) => i.itemType === 'PACKAGE').length, INDIVIDUAL_TEST: base.filter((i) => i.itemType === 'INDIVIDUAL_TEST').length };
  }, [items, group, avail]);

  // Quick on/off from the list (optimistic, rolled back on error)
  const quickToggle = async (item: LabPricingItem, next: boolean) => {
    if (!labId || busy.has(item.id)) return;
    setBusy((s) => new Set(s).add(item.id));
    replaceItem({ ...item, isAvailable: next });
    try {
      replaceItem(await updateLabPriceApi(item.id, { laboratoryId: labId, isAvailable: next }));
      setToast({ text: `${item.title} is now ${next ? 'available' : 'unavailable'}.`, tone: 'ok' });
    } catch (e) {
      replaceItem(item);
      setToast({ text: e instanceof Error ? e.message : 'Could not update availability.', tone: 'error' });
    } finally {
      setBusy((s) => {
        const n = new Set(s);
        n.delete(item.id);
        return n;
      });
    }
  };

  const switchLab = () => {
    storeLab(null);
    setLabId(null);
    setData(null);
    router.replace('/lab-dashboard/manage-tests');
  };

  if (!ready) return null;
  if (!labId) return <LabIdPrompt onOpen={(id) => router.replace(`/lab-dashboard/manage-tests?labId=${id}`)} />;

  const status = data ? STATUS_STYLE[data.laboratory.verificationStatus] : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6b6f80]">
            <span className="uppercase tracking-wider">Lab Dashboard</span>
            {data && (
              <>
                <span>·</span>
                <span className="text-[#141b34]">{data.laboratory.name}</span>
                {status && <span className={`rounded-full px-2 py-0.5 text-[11px] ${status.cls}`}>{status.label}</span>}
              </>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#141b34] sm:text-3xl">Test & Package Inventory</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b6f80]">Set your lab&apos;s prices, switch items on or off, and choose which tests in each package you perform.</p>
        </div>
        <button type="button" onClick={switchLab} className="rounded-lg border border-[#d9d3c6] bg-white px-3 py-2 text-xs font-semibold text-[#3a3f52] hover:bg-[#faf9f6]">
          Switch lab
        </button>
      </div>

      {error ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" />
          {error.status === 404 ? 'No laboratory was found with this ID.' : error.message}
          {error.status === 404 ? (
            <button type="button" onClick={switchLab} className="font-semibold underline">
              Enter another ID
            </button>
          ) : (
            <button type="button" onClick={() => setRetry((n) => n + 1)} className="font-semibold underline">
              Try again
            </button>
          )}
        </div>
      ) : !data ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-[#6b6f80]">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the catalog…
        </p>
      ) : (
        <>
          {data.laboratory.verificationStatus !== 'APPROVED' && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {data.laboratory.verificationStatus === 'PENDING'
                ? 'Your lab is waiting for verification. You can prepare prices now; patients see them once your lab is approved.'
                : 'Your lab registration was not approved, so patients cannot book here. Contact Tabibistan support for details.'}
            </p>
          )}

          {/* Summary */}
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile label="Master catalog" value={summary.total} note={`${summary.packages} packages · ${summary.tests} single tests`} />
            <SummaryTile label="Active & available" value={summary.available} note="Bookable at your lab" tone="ok" />
            <SummaryTile label="Custom priced" value={summary.custom} note="Using your own price" tone="info" />
            <SummaryTile label="Switched off" value={summary.disabled} note="Not bookable at your lab" tone="muted" />
          </div>

          {/* Search & filters */}
          <div className="mt-5 space-y-3 rounded-2xl border border-[#e7e2d8] bg-white p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a8d99]" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, code or other name, e.g. CBC"
                  aria-label="Search tests and packages"
                  className="w-full rounded-lg border border-[#d9d3c6] py-2.5 pl-9 pr-3 text-sm text-[#141b34] outline-none placeholder:text-gray-400 focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#6b6f80] lg:w-72">
                <span className="shrink-0">Category</span>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full min-w-0 rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm text-[#141b34] outline-none focus:border-[#141b34]"
                >
                  <option value="">All categories</option>
                  {data.groups.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label} ({g.count})
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Segmented
                label="Item type"
                value={type}
                onChange={setType}
                options={[
                  { value: 'ALL', label: `All Items (${typeCounts.ALL})` },
                  { value: 'PACKAGE', label: `Health Packages (${typeCounts.PACKAGE})` },
                  { value: 'INDIVIDUAL_TEST', label: `Single Tests (${typeCounts.INDIVIDUAL_TEST})` },
                ]}
              />
              <Segmented
                label="Availability"
                value={avail}
                onChange={setAvail}
                options={[
                  { value: 'ALL', label: 'All' },
                  { value: 'AVAILABLE', label: 'Available Only' },
                  { value: 'DISABLED', label: 'Disabled' },
                ]}
              />
            </div>
          </div>

          {/* List */}
          <p className="mt-4 text-xs text-[#6b6f80]" aria-live="polite">
            Showing {Math.min(shown, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
          </p>
          {filtered.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-[#d9d3c6] bg-white px-4 py-10 text-center text-sm text-[#6b6f80]">
              No items match these filters.
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setType('ALL');
                  setGroup('');
                  setAvail('ALL');
                }}
                className="ml-1 font-semibold text-[#141b34] underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-2 overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white">
              <div className="hidden grid-cols-[minmax(0,1fr)_150px_170px_90px_190px] gap-4 border-b border-[#ece9e2] bg-[#faf9f6] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8a8d99] lg:grid">
                <span>Item</span>
                <span>Category</span>
                <span>Price</span>
                <span>Available</span>
                <span>
                  <span className="sr-only">Actions</span>
                </span>
              </div>
              <ul className="divide-y divide-[#f0ede6]">
                {filtered.slice(0, shown).map((i) => (
                  <ItemRow key={i.id} item={i} busy={busy.has(i.id)} onToggle={(v) => quickToggle(i, v)} onEdit={() => setEditing(i)} />
                ))}
              </ul>
            </div>
          )}
          {shown < filtered.length && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="rounded-xl border border-[#d9d3c6] bg-white px-5 py-2.5 text-sm font-semibold text-[#141b34] hover:bg-[#faf9f6]"
              >
                Show more ({filtered.length - shown} left)
              </button>
            </div>
          )}
        </>
      )}

      {editing && labId && (
        <EditItemDrawer
          key={editing.id}
          item={editing}
          laboratoryId={labId}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            replaceItem(saved);
            setEditing(null);
            setToast({ text: `Saved changes to ${saved.title}.`, tone: 'ok' });
          }}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-5 left-1/2 z-[95] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl px-4 py-3 text-sm shadow-lg ${
            toast.tone === 'ok' ? 'bg-[#141b34] text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.tone === 'ok' ? <CircleCheck className="h-4 w-4 shrink-0" /> : <CircleAlert className="h-4 w-4 shrink-0" />}
          <span className="min-w-0 truncate">{toast.text}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="ml-1 rounded p-0.5 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, note, tone }: { label: string; value: number; note: string; tone?: 'ok' | 'info' | 'muted' }) {
  const color = tone === 'ok' ? 'text-[#2f7a4b]' : tone === 'info' ? 'text-indigo-700' : tone === 'muted' ? 'text-[#6b6f80]' : 'text-[#141b34]';
  return (
    <div className="rounded-2xl border border-[#e7e2d8] bg-white px-4 py-3">
      <p className="text-xs font-medium text-[#6b6f80]">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[11px] text-[#8a8d99]">{note}</p>
    </div>
  );
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-xl bg-[#f3f1ec] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            value === o.value ? 'bg-white text-[#141b34] shadow-sm' : 'text-[#6b6f80] hover:text-[#141b34]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ItemRow({ item, busy, onToggle, onEdit }: { item: LabPricingItem; busy: boolean; onToggle: (v: boolean) => void; onEdit: () => void }) {
  const off = !item.isAvailable;
  const masterPrice = item.master.discountPrice ?? item.master.basePrice;
  const testsLabel =
    item.itemType === 'PACKAGE'
      ? `${item.totalTestsCount} tests${item.disabledSubTests.length ? ` · ${item.disabledSubTests.length} off` : ''}`
      : 'Single test';
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_150px_170px_90px_190px]">
      {/* Item */}
      <div className={`min-w-0 transition ${off ? 'opacity-50' : ''}`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.itemType === 'PACKAGE' ? 'bg-indigo-50 text-indigo-700' : 'bg-sky-50 text-sky-700'}`}
          >
            {item.itemType === 'PACKAGE' ? 'Package' : 'Test'}
          </span>
          {item.badgeText && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{item.badgeText}</span>}
          {!item.isActiveInCatalog && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Hidden by Tabibistan</span>}
        </div>
        <p className="mt-1 text-sm font-semibold leading-snug text-[#141b34]">{item.title}</p>
        <p className="text-xs text-[#8a8d99]">
          {item.code && <>{item.code} · </>}
          {testsLabel}
          <span className="lg:hidden"> · {item.groupLabel}</span>
        </p>
      </div>

      {/* Category (wide screens) */}
      <p className={`hidden text-xs text-[#3a3f52] lg:block ${off ? 'opacity-50' : ''}`}>{item.groupLabel ?? item.category ?? '—'}</p>

      {/* Price */}
      <div className={`col-start-1 row-start-2 lg:col-start-auto lg:row-start-auto ${off ? 'opacity-50' : ''}`}>
        <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm">
          <span className="font-bold tabular-nums text-[#141b34]">{formatPkr(item.effective.price)}</span>
          {item.effective.basePrice > item.effective.price && <span className="text-xs tabular-nums text-[#8a8d99] line-through">{formatPkr(item.effective.basePrice)}</span>}
        </p>
        {item.hasCustomPrice ? (
          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            <Tag className="h-3 w-3" /> Lab price · master {formatPkr(masterPrice)}
          </p>
        ) : (
          <p className="text-[11px] text-[#8a8d99]">Master price</p>
        )}
      </div>

      {/* Availability */}
      <div className="col-start-2 row-span-2 row-start-1 flex flex-col items-end gap-2 lg:col-start-auto lg:row-span-1 lg:row-start-auto lg:flex-row lg:items-center lg:justify-start">
        <div className="flex items-center gap-2">
          <Toggle checked={item.isAvailable} onChange={onToggle} disabled={busy} label={`${item.title} available`} />
          <span className={`hidden text-xs sm:inline ${off ? 'text-[#8a8d99]' : 'text-[#2f7a4b]'}`}>{off ? 'Off' : 'On'}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-[#d9d3c6] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#141b34] hover:bg-[#faf9f6] lg:hidden"
        >
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      {/* Edit (wide screens) */}
      <button
        type="button"
        onClick={onEdit}
        className="hidden items-center gap-1.5 justify-self-end whitespace-nowrap rounded-lg border border-[#d9d3c6] bg-white px-3 py-2 text-xs font-semibold text-[#141b34] hover:bg-[#faf9f6] lg:inline-flex"
      >
        <Pencil className="h-3.5 w-3.5" /> Edit Price & Availability
      </button>
    </li>
  );
}

function LabIdPrompt({ onOpen }: { onOpen: (id: string) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <div className="rounded-2xl border border-[#e7e2d8] bg-white p-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#141b34] text-white">
          <FlaskConical className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-[#141b34]">Open your lab dashboard</h1>
        <p className="mt-1 text-sm text-[#6b6f80]">Enter your laboratory ID to manage your tests, packages and prices.</p>
        <form
          className="mt-4 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isUuid(value)) {
              setError('Enter a valid laboratory ID, e.g. 3f2a9c1e-…');
              return;
            }
            onOpen(value.trim());
          }}
        >
          <label htmlFor="lab-id" className="text-xs font-medium text-[#3a3f52]">
            Laboratory ID
          </label>
          <input
            id="lab-id"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            autoComplete="off"
            className="w-full rounded-lg border border-[#d9d3c6] px-3 py-2.5 font-mono text-sm outline-none focus:border-[#141b34] focus:ring-2 focus:ring-[#141b34]/10"
          />
          {error && (
            <p className="text-xs text-red-600" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="w-full rounded-xl bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f]">
            Open dashboard
          </button>
        </form>
      </div>
    </div>
  );
}
