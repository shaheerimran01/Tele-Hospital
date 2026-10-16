'use client';

// Hospitals directory: the hospitals patients see under "Browse Hospitals Near You".

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, MapPin, Pencil, Plus, ShieldPlus, Trash2, TriangleAlert, X } from 'lucide-react';
import {
  createHospital,
  deleteHospital,
  fetchHospitals,
  HOSPITAL_EMERGENCY_OPTIONS,
  updateHospital,
  type HospitalInput,
  type HospitalPage,
  type HospitalRecord,
} from '@/lib/api/hospitals';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, SearchInput, Table } from '../doctor-dashboard/_components/ui';

const PAGE_SIZE = 20;
const TYPE_SUGGESTIONS = ['Public/Teaching', 'Public', 'Private', 'Mission/Trust', 'Military', 'Semi-Government'];

const EMERGENCY_LABEL: Record<string, string> = {
  '24/7': '24/7',
  Available: 'Available',
  Daytime: 'Daytime',
};

function EmergencyBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  const tone =
    value === '24/7' ? 'bg-red-50 text-red-700 ring-red-200' : value === 'Daytime' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-orange-50 text-orange-700 ring-orange-200';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <ShieldPlus className="h-3 w-3" /> {EMERGENCY_LABEL[value] ?? value}
    </span>
  );
}

const mapLink = (lat: number, lng: number) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

// ---------------------------------------------------------------------------
// Add / edit form
// ---------------------------------------------------------------------------

type FormState = {
  name: string;
  city: string;
  type: string;
  address: string;
  contact: string;
  latitude: string;
  longitude: string;
  emergency: string;
  notes: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  city: '',
  type: '',
  address: '',
  contact: '',
  latitude: '',
  longitude: '',
  emergency: '24/7',
  notes: '',
  isActive: true,
};

const toForm = (h: HospitalRecord): FormState => ({
  name: h.name,
  city: h.city ?? '',
  type: h.type ?? '',
  address: h.address,
  contact: h.contact ?? '',
  latitude: h.latitude != null ? String(h.latitude) : '',
  longitude: h.longitude != null ? String(h.longitude) : '',
  emergency: h.emergency ?? '',
  notes: h.notes ?? '',
  isActive: h.isActive,
});

/** Checks the form; returns field errors or the API payload */
function validate(f: FormState): { errors: Partial<Record<keyof FormState, string>>; input?: HospitalInput } {
  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!f.name.trim()) errors.name = 'Hospital name is required.';
  if (!f.address.trim()) errors.address = 'Address is required.';
  const lat = f.latitude.trim() === '' ? null : Number(f.latitude);
  const lng = f.longitude.trim() === '' ? null : Number(f.longitude);
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) errors.latitude = 'Latitude must be a number between -90 and 90.';
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) errors.longitude = 'Longitude must be a number between -180 and 180.';
  if ((lat === null) !== (lng === null) && !errors.latitude && !errors.longitude) {
    errors[lat === null ? 'latitude' : 'longitude'] = 'Enter both latitude and longitude, or leave both empty.';
  }
  if (Object.keys(errors).length) return { errors };
  const text = (v: string) => v.trim() || null;
  return {
    errors,
    input: {
      name: f.name.trim(),
      city: text(f.city),
      type: text(f.type),
      address: f.address.trim(),
      contact: text(f.contact),
      latitude: lat,
      longitude: lng,
      emergency: (f.emergency || null) as HospitalInput['emergency'],
      notes: text(f.notes),
      isActive: f.isActive,
    },
  };
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-slate-700">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-rose-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

const inputClass = (error?: string) =>
  `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'
  }`;

function HospitalFormModal({
  hospital,
  onClose,
  onSaved,
}: {
  /** null: add a new hospital */
  hospital: HospitalRecord | null;
  onClose: () => void;
  onSaved: (h: HospitalRecord, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(hospital ? toForm(hospital) : EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  /** Pasting "33.6767, 73.0679" (e.g. from Google Maps) into latitude fills both boxes */
  const pasteCoordinates = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const m = /^\s*(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(e.clipboardData.getData('text'));
    if (!m) return;
    e.preventDefault();
    setForm((f) => ({ ...f, latitude: m[1], longitude: m[2] }));
    setErrors((er) => ({ ...er, latitude: undefined, longitude: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors: found, input } = validate(form);
    setErrors(found);
    if (!input) return;
    setBusy(true);
    setApiError(null);
    try {
      const saved = hospital ? await updateHospital(hospital.id, input) : await createHospital(input);
      onSaved(saved, !hospital);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not save the hospital.');
      setBusy(false);
    }
  };

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const hasPin = form.latitude.trim() !== '' && form.longitude.trim() !== '' && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} aria-hidden />
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-label={hospital ? 'Edit hospital' : 'Add new hospital'}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{hospital ? 'Edit Hospital' : 'Add New Hospital'}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {hospital ? `Update the details of ${hospital.name}.` : 'Patients see active hospitals under "Browse Hospitals Near You".'}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="h-name" label="Hospital Name" required error={errors.name}>
              <input id="h-name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={200} placeholder="e.g. Shifa International Hospital" className={inputClass(errors.name)} autoFocus />
            </Field>
          </div>
          <Field id="h-city" label="City / Area">
            <input id="h-city" value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={120} placeholder="e.g. Islamabad, H-8" className={inputClass()} />
          </Field>
          <Field id="h-type" label="Type" hint="Pick a suggestion or type your own.">
            <input id="h-type" list="h-type-options" value={form.type} onChange={(e) => set('type', e.target.value)} maxLength={60} placeholder="e.g. Private" className={inputClass()} />
            <datalist id="h-type-options">
              {TYPE_SUGGESTIONS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <div className="sm:col-span-2">
            <Field id="h-address" label="Address" required error={errors.address}>
              <textarea id="h-address" value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={500} rows={2} placeholder="Street, sector / area, city" className={`${inputClass(errors.address)} resize-y`} />
            </Field>
          </div>
          <Field id="h-contact" label="Contact">
            <input id="h-contact" value={form.contact} onChange={(e) => set('contact', e.target.value)} maxLength={60} placeholder="e.g. 051-8463000" className={inputClass()} />
          </Field>
          <Field id="h-emergency" label="Emergency">
            <select id="h-emergency" value={form.emergency} onChange={(e) => set('emergency', e.target.value)} className={inputClass()}>
              {HOSPITAL_EMERGENCY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o === '24/7' ? '24/7' : o}
                </option>
              ))}
              <option value="">Not specified</option>
            </select>
          </Field>
          <Field id="h-lat" label="Latitude" error={errors.latitude} hint='Tip: paste "33.6767, 73.0679" from a map to fill both.'>
            <input id="h-lat" inputMode="decimal" value={form.latitude} onChange={(e) => set('latitude', e.target.value)} onPaste={pasteCoordinates} placeholder="e.g. 33.6767" className={inputClass(errors.latitude)} />
          </Field>
          <Field id="h-lng" label="Longitude" error={errors.longitude}>
            <input id="h-lng" inputMode="decimal" value={form.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder="e.g. 73.0679" className={inputClass(errors.longitude)} />
          </Field>
          {hasPin && (
            <a href={mapLink(lat, lng)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline sm:col-span-2">
              <MapPin className="h-3.5 w-3.5" /> Check this location on the map <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {!hasPin && (
            <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 sm:col-span-2">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Without coordinates, patients see this hospital without a distance, at the end of the list.
            </p>
          )}
          <div className="sm:col-span-2">
            <Field id="h-notes" label="Notes" hint="Shown to patients on the hospital card (e.g. departments, visiting hours).">
              <textarea id="h-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} maxLength={2000} rows={2} className={`${inputClass()} resize-y`} />
            </Field>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            Show this hospital to patients
          </label>
        </div>

        <div className="border-t border-slate-100 px-6 py-4">
          {apiError && (
            <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {apiError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {hospital ? 'Save Changes' : 'Add Hospital'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

function DeleteDialog({ hospital, onClose, onDeleted }: { hospital: HospitalRecord; onClose: () => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteHospital(hospital.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete the hospital.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} aria-hidden />
      <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <Trash2 className="h-5 w-5" />
        </span>
        <h2 id="delete-title" className="mt-4 text-base font-semibold text-slate-900">
          Delete hospital?
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold text-slate-900">{hospital.name}</span>? Patients will no longer see it. This cannot be undone.
        </p>
        {(hospital.linkedDoctors?.length ?? 0) > 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {hospital.linkedDoctors!.length} registered doctor{hospital.linkedDoctors!.length === 1 ? ' is' : 's are'} shown at this hospital. Their own profiles and clinics are not affected.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete Hospital
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HospitalsAdminPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HospitalPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [editing, setEditing] = useState<HospitalRecord | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HospitalRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Search as you type (waits for a short pause)
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHospitals({ search: query, page, pageSize: PAGE_SIZE })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load hospitals.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, page, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const range = useMemo(() => {
    if (!data || data.total === 0) return null;
    const from = (data.page - 1) * data.pageSize + 1;
    return { from, to: from + data.items.length - 1 };
  }, [data]);

  return (
    <>
      <PageHeader
        title="Hospitals"
        subtitle="The hospitals directory patients see under “Browse Hospitals Near You”, sorted by distance."
        action={
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" /> Add New Hospital
          </button>
        }
      />

      <Card
        padded={false}
        title={data ? `${data.total} hospital${data.total === 1 ? '' : 's'}${query ? ` matching “${query}”` : ''}` : 'Hospitals'}
        action={<SearchInput value={search} onChange={setSearch} placeholder="Search by hospital name or city" />}
      >
        {error && !data ? (
          <ErrorState message={error} onRetry={reload} />
        ) : !data ? (
          <LoadingState text="Loading hospitals…" />
        ) : data.items.length === 0 ? (
          <EmptyState
            title={query ? 'No hospitals match your search' : 'No hospitals yet'}
            text={query ? 'Try another name or city.' : 'Add the first hospital with “Add New Hospital”.'}
          />
        ) : (
          <div className={loading ? 'opacity-60' : ''}>
            <Table head={['Hospital Name', 'City / Area', 'Type', 'Address', 'Contact', 'Emergency', 'Coordinates (Lat/Lng)', 'Actions']}>
              {data.items.map((h) => (
                <tr key={h.id} className="align-top hover:bg-slate-50/60">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-slate-900">{h.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {!h.isActive && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Hidden from patients</span>}
                      {(h.linkedDoctors?.length ?? 0) > 0 && (
                        <span
                          className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700"
                          title={h.linkedDoctors!.map((d) => d.fullName).join(', ')}
                        >
                          {h.linkedDoctors!.length} registered doctor{h.linkedDoctors!.length === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{h.city ?? <span className="text-slate-400">—</span>}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{h.type ?? <span className="text-slate-400">—</span>}</td>
                  <td className="max-w-[260px] px-5 py-3 text-slate-700">
                    <p className="line-clamp-2" title={h.address}>
                      {h.address}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-slate-700">{h.contact ?? <span className="text-slate-400">—</span>}</td>
                  <td className="px-5 py-3">
                    <EmergencyBadge value={h.emergency} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-600">
                    {h.latitude != null && h.longitude != null ? (
                      <a href={mapLink(h.latitude, h.longitude)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-blue-700 hover:underline">
                        {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="font-sans text-amber-700">Not set</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditing(h)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        aria-label={`Edit ${h.name}`}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(h)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-50"
                        aria-label={`Delete ${h.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <span>{range ? `Showing ${range.from}–${range.to} of ${data.total}` : ''}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={data.page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </button>
                <span className="font-semibold text-slate-700">
                  Page {data.page} of {data.pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={data.page >= data.pages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {editing && (
        <HospitalFormModal
          hospital={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(h, created) => {
            setEditing(null);
            setToast(created ? `${h.name} was added.` : `${h.name} was updated.`);
            reload();
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          hospital={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setToast(`${deleting.name} was deleted.`);
            setDeleting(null);
            reload();
          }}
        />
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex justify-center px-4" aria-live="polite">
        {toast && <div className="pointer-events-auto rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-2xl">{toast}</div>}
      </div>
    </>
  );
}
