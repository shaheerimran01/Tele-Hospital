'use client';

import { use } from 'react';
import { Mail, Phone, Wallet } from 'lucide-react';
import { fetchPatient } from '@/lib/api/doctorPortal';
import { usePortalData } from '../../_components/portal-context';
import AppointmentsTable from '../../_components/AppointmentsTable';
import {
  Avatar,
  Card,
  EmptyState,
  ErrorState,
  formatDate,
  LoadingState,
  PageHeader,
  personName,
  pkr,
  relationLabel,
  Table,
} from '../../_components/ui';

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: patient, error, reload } = usePortalData(() => fetchPatient(id), [id]);

  if (!patient) {
    return (
      <>
        <PageHeader title="Patient Profile" back={{ href: '/doctor-dashboard/patients', label: 'All patients' }} />
        <Card padded={false}>{error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading patient…" />}</Card>
      </>
    );
  }

  const name = personName(patient);
  const upcoming = patient.appointments.filter((a) => ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status)).length;

  return (
    <>
      <PageHeader title="Patient Profile" back={{ href: '/doctor-dashboard/patients', label: 'All patients' }} />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={name} size="lg" />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-900">{name}</h2>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" /> {patient.phone || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" /> {patient.email || '—'}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">Joined {formatDate(patient.createdAt)}</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-3 text-center lg:w-[420px]">
            {[
              { label: 'Total bookings', value: patient._count.appointments },
              { label: 'Upcoming', value: upcoming },
              { label: 'Family members', value: patient.familyMembers.length },
            ].map((m) => (
              <div key={m.label} className="flex flex-col-reverse rounded-lg bg-slate-50 px-3 py-3">
                <dt className="text-xs text-slate-500">{m.label}</dt>
                <dd className="text-2xl font-bold tabular-nums text-slate-900">{m.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4 text-xs text-slate-500">
          <Wallet className="h-3.5 w-3.5" /> Paid so far: <span className="font-semibold text-slate-800">{pkr(patient.totalSpent)}</span>
        </p>
      </section>

      <Card
        title="Linked Family Members"
        subtitle="Relatives this patient can book consultations for"
        className="mt-6"
        padded={false}
      >
        {patient.familyMembers.length === 0 ? (
          <EmptyState title="No family members added" />
        ) : (
          <Table head={['Name', 'Relation', 'Gender', 'Age', 'Date of Birth', 'Added']}>
            {patient.familyMembers.map((m) => (
              <tr key={m.id} className="align-middle">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} size="sm" />
                    <span className="font-medium text-slate-900">{m.fullName}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    {relationLabel(m.relation)}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{m.gender}</td>
                <td className="px-5 py-3.5 tabular-nums text-slate-700">{m.age != null ? `${m.age} yrs` : '—'}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">
                  {m.dateOfBirth ? formatDate(m.dateOfBirth, { utc: true }) : '—'}
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">{formatDate(m.createdAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Card
        title="Complete Appointment History"
        subtitle={`${patient.appointments.length} ${patient.appointments.length === 1 ? 'appointment' : 'appointments'}`}
        className="mt-6"
        padded={false}
      >
        <AppointmentsTable
          rows={patient.appointments}
          columns={['id', 'patient', 'doctor', 'when', 'mode', 'status', 'fee', 'action']}
          empty={{ title: 'No appointments booked yet' }}
        />
      </Card>
    </>
  );
}
