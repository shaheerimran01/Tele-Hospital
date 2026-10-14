'use client';

import Link from 'next/link';
import type { AppointmentRow } from '@/lib/api/doctorPortal';
import {
  AppointmentStatusBadge,
  appointmentDay,
  displayTime,
  EmptyState,
  ModeBadge,
  PatientTypeBadge,
  PaymentBadge,
  pkr,
  RowLink,
  Table,
} from './ui';

type Column = 'id' | 'patient' | 'doctor' | 'mode' | 'when' | 'fee' | 'status' | 'action';

const HEADINGS: Record<Column, string> = {
  id: 'Appointment ID',
  patient: 'Patient',
  doctor: 'Doctor',
  mode: 'Consultation Mode',
  when: 'Date & Time',
  fee: 'Fee & Payment',
  status: 'Status',
  action: 'Action',
};

/** Appointment table shared by the overview, list, doctor and patient pages. */
export default function AppointmentsTable({
  rows,
  columns = ['id', 'patient', 'doctor', 'mode', 'when', 'status', 'action'],
  empty = { title: 'No appointments yet', text: 'Bookings made on the website will appear here.' },
  actionLabel = 'View',
}: {
  rows: AppointmentRow[];
  columns?: Column[];
  empty?: { title: string; text?: string };
  actionLabel?: string;
}) {
  if (rows.length === 0) return <EmptyState {...empty} />;

  return (
    <Table head={columns.map((c) => HEADINGS[c])}>
      {rows.map((a) => (
        <tr key={a.id} className="align-middle transition hover:bg-slate-50/70">
          {columns.map((c) => (
            <td key={c} className="px-5 py-3.5">
              {c === 'id' && (
                <Link href={`/doctor-dashboard/appointments/${a.id}`} className="font-mono text-xs font-semibold text-blue-700 hover:underline">
                  {a.appointmentNum}
                </Link>
              )}
              {c === 'patient' && (
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{a.patientName}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <PatientTypeBadge type={a.patientType} />
                    {a.user?.phone && <span className="text-xs text-slate-500">{a.user.phone}</span>}
                  </div>
                </div>
              )}
              {c === 'doctor' && (
                <div className="min-w-0">
                  <Link href={`/doctor-dashboard/doctors/${a.doctor.id}`} className="truncate font-medium text-slate-900 hover:text-blue-700">
                    {a.doctor.fullName}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{a.doctor.specialisations[0] ?? a.doctor.title}</p>
                </div>
              )}
              {c === 'mode' && <ModeBadge mode={a.serviceMode} />}
              {c === 'when' && (
                <div className="whitespace-nowrap">
                  <p className="font-medium text-slate-900">{appointmentDay(a.appointmentDate)}</p>
                  <p className="text-xs text-slate-500">
                    {displayTime(a.startTime)} – {displayTime(a.endTime)}
                  </p>
                </div>
              )}
              {c === 'fee' && (
                <div className="whitespace-nowrap">
                  <p className="font-medium text-slate-900">{pkr(a.fee)}</p>
                  <PaymentBadge status={a.paymentStatus} />
                </div>
              )}
              {c === 'status' && <AppointmentStatusBadge status={a.status} />}
              {c === 'action' && <RowLink href={`/doctor-dashboard/appointments/${a.id}`}>{actionLabel}</RowLink>}
            </td>
          ))}
        </tr>
      ))}
    </Table>
  );
}
