'use client';

import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import { fetchPatients } from '@/lib/api/doctorPortal';
import { useDebounced, usePortalData } from '../_components/portal-context';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  PageHeader,
  personName,
  RowLink,
  SearchInput,
  Table,
} from '../_components/ui';

export default function PatientsPage() {
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const { data, error, loading, reload } = usePortalData(() => fetchPatients({ search: q }), [q]);

  return (
    <>
      <PageHeader
        title="Patients"
        subtitle={data ? `${data.total.toLocaleString('en-PK')} registered ${data.total === 1 ? 'account' : 'accounts'}` : 'All registered patient accounts.'}
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, phone or email" />
      </div>

      <Card padded={false}>
        {!data ? (
          error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading patients…" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.patients.length === 0 ? (
          <EmptyState title={q ? 'No patients match your search' : 'No patients yet'} />
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : ''}>
            <Table head={['Patient', 'Contact', 'Family Members', 'Total Appointments', 'Joined', 'Action']}>
              {data.patients.map((p) => {
                const name = personName(p);
                return (
                  <tr key={p.id} className="align-middle hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex min-w-[180px] items-center gap-3">
                        <Avatar name={name} />
                        <span className="truncate font-semibold text-slate-900">{name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {p.phone || '—'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> {p.email || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-900">{p._count.familyMembers}</td>
                    <td className="px-5 py-3.5 tabular-nums text-slate-900">{p._count.appointments}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{formatDate(p.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <RowLink href={`/doctor-dashboard/patients/${p.id}`}>View Patient Details</RowLink>
                    </td>
                  </tr>
                );
              })}
            </Table>
            {data.total > data.patients.length && (
              <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
                Showing the latest {data.patients.length} of {data.total.toLocaleString('en-PK')}. Use search to find others.
              </p>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
