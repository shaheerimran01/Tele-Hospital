'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAppointments, type AppointmentStatus, type ServiceMode } from '@/lib/api/doctorPortal';
import { useDebounced, usePortalData } from '../_components/portal-context';
import AppointmentsTable from '../_components/AppointmentsTable';
import { Card, ErrorState, FilterTabs, LoadingState, PageHeader, SearchInput } from '../_components/ui';

type StatusFilter = 'ALL' | AppointmentStatus;
type ModeFilter = 'ALL' | ServiceMode;

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const MODE_OPTIONS: { value: ModeFilter; label: string }[] = [
  { value: 'ALL', label: 'All modes' },
  { value: 'IN_CLINIC', label: 'In-Clinic' },
  { value: 'VIDEO', label: 'Video Call' },
  { value: 'TEXT', label: 'Text Consult' },
];

function AppointmentsInner() {
  const params = useSearchParams();
  const initialStatus = (params.get('status')?.toUpperCase() ?? 'ALL') as StatusFilter;
  const [status, setStatus] = useState<StatusFilter>(
    STATUS_TABS.some((t) => t.value === initialStatus) ? initialStatus : 'ALL',
  );
  const [mode, setMode] = useState<ModeFilter>('ALL');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());

  const { data, error, loading, reload } = usePortalData(
    () => fetchAppointments({ status, serviceMode: mode, search: q }),
    [status, mode, q],
  );

  const sc = data?.statusCounts ?? {};
  const all = Object.values(sc).reduce((s, n) => s + (n ?? 0), 0);
  const tabs = STATUS_TABS.map((t) => ({ ...t, count: data ? (t.value === 'ALL' ? all : sc[t.value] ?? 0) : undefined }));

  return (
    <>
      <PageHeader
        title="Appointments"
        subtitle={data ? `${data.total.toLocaleString('en-PK')} ${data.total === 1 ? 'appointment' : 'appointments'} match your filters` : 'All consultation bookings.'}
      />

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <FilterTabs label="Filter by status" tabs={tabs} value={status} onChange={setStatus} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search ID, patient, doctor or phone" />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ModeFilter)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {MODE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <Card padded={false}>
        {!data ? (
          error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading appointments…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <AppointmentsTable
              rows={data.appointments}
              columns={['id', 'patient', 'doctor', 'when', 'mode', 'fee', 'status', 'action']}
              actionLabel="View Details"
              empty={{
                title: status === 'ALL' && mode === 'ALL' && !q ? 'No appointments yet' : 'No appointments match your filters',
                text: status === 'ALL' && mode === 'ALL' && !q ? 'Bookings made on the website will appear here.' : undefined,
              }}
            />
            {data.total > data.appointments.length && (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Showing the latest {data.appointments.length} of {data.total.toLocaleString('en-PK')}. Use filters to narrow the list.
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}

export default function AppointmentsPage() {
  // useSearchParams (?status=) needs a Suspense boundary
  return (
    <Suspense fallback={<LoadingState text="Loading appointments…" />}>
      <AppointmentsInner />
    </Suspense>
  );
}
