'use client';

import { useState } from 'react';
import { fetchDoctors, fileUrl, type DoctorStatus } from '@/lib/api/doctorPortal';
import { useDebounced, usePortalData } from '../_components/portal-context';
import {
  Avatar,
  Card,
  DoctorStatusBadge,
  EmptyState,
  ErrorState,
  FilterTabs,
  LoadingState,
  PageHeader,
  RowLink,
  SearchInput,
  Table,
} from '../_components/ui';

type StatusFilter = 'ALL' | DoctorStatus;

export default function DoctorsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const q = useDebounced(search.trim());
  const { data, error, loading, reload } = usePortalData(() => fetchDoctors({ search: q, status }), [q, status]);

  const counts = data?.statusCounts;
  const tabs: { value: StatusFilter; label: string; count?: number }[] = [
    { value: 'ALL', label: 'All', count: counts?.ALL },
    { value: 'PENDING', label: 'Pending', count: counts?.PENDING },
    { value: 'APPROVED', label: 'Approved', count: counts?.APPROVED },
    { value: 'REJECTED', label: 'Rejected', count: counts?.REJECTED },
  ];

  return (
    <>
      <PageHeader title="Doctors" subtitle="All registered doctors, their PMDC details and approval status." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, PMDC number or specialty" />
        <FilterTabs label="Filter by status" tabs={tabs} value={status} onChange={setStatus} />
      </div>

      <Card padded={false}>
        {!data ? (
          error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading doctors…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.doctors.length === 0 ? (
          <EmptyState
            title={q || status !== 'ALL' ? 'No doctors match your filters' : 'No doctors registered yet'}
            text={q ? 'Try a different name, PMDC number or specialty.' : undefined}
          />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table head={['Doctor', 'Specialities', 'Education & Experience', 'PMDC Number', 'Status', 'Action']}>
              {data.doctors.map((d) => (
                <tr key={d.id} className="align-middle hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <div className="flex min-w-[220px] items-center gap-3">
                      <Avatar name={d.fullName} src={d.profilePhotoUrl ? fileUrl(d.profilePhotoUrl) : null} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{d.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{d.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex max-w-[260px] flex-wrap gap-1">
                      {d.specialisations.slice(0, 3).map((s) => (
                        <span key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                          {s}
                        </span>
                      ))}
                      {d.specialisations.length > 3 && (
                        <span className="text-xs text-slate-400">+{d.specialisations.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="max-w-[240px] truncate text-slate-900" title={d.degrees}>
                      {d.degrees}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.experienceYears} {d.experienceYears === 1 ? 'year' : 'years'} experience
                      {d.education ? ` · ${d.education}` : ''}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-slate-700">{d.pmdcNumber}</td>
                  <td className="px-5 py-3.5">
                    <DoctorStatusBadge status={d.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <RowLink href={`/doctor-dashboard/doctors/${d.id}`}>View Profile</RowLink>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
