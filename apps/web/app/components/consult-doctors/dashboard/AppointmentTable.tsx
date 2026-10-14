'use client';

import {
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCheck,
  Hourglass,
  Hospital,
  MessageSquareText,
  Phone,
  Video,
  X,
} from 'lucide-react';
import {
  formatTime,
  initials,
  relativeDay,
  type AppointmentStatus,
  type DashboardAppointment,
  type ServiceMode,
} from './dashboard-data';

export type AppointmentAction = 'approve' | 'complete' | 'reschedule' | 'decline';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<AppointmentStatus, { label: string; className: string; Icon: typeof Check }> = {
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#eaf6ee] text-[#2f6b45] ring-[#cfe6d6]', Icon: BadgeCheck },
  PENDING: { label: 'Pending', className: 'bg-[#fdf4e3] text-[#8a6416] ring-[#f0dfb8]', Icon: Hourglass },
  COMPLETED: { label: 'Completed', className: 'bg-[#eef0f6] text-[#3a4366] ring-[#dde1ec]', Icon: CheckCheck },
  DECLINED: { label: 'Declined', className: 'bg-[#fdf0f0] text-[#9a3030] ring-[#f2cccc]', Icon: X },
};

export function StatusBadge({ status, rescheduled }: { status: AppointmentStatus; rescheduled?: boolean }) {
  const { label, className, Icon } = STATUS_BADGE[status];
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
      >
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      {rescheduled && status === 'PENDING' && (
        <span className="text-[11px] font-medium text-[#8a6416]">New time proposed</span>
      )}
    </span>
  );
}

export function modeLabel(mode: ServiceMode, clinicName: string | null, short = false) {
  if (mode === 'VIDEO') return 'Video call';
  if (mode === 'TEXT') return 'Text appointment';
  if (short || !clinicName) return 'In-clinic';
  return `Clinic - ${clinicName}`;
}

export function ModeBadge({
  mode,
  clinicName,
  short = false,
}: {
  mode: ServiceMode;
  clinicName: string | null;
  short?: boolean;
}) {
  const style =
    mode === 'VIDEO'
      ? { className: 'bg-[#edf2fc] text-[#2c4f8f]', Icon: Video }
      : mode === 'TEXT'
        ? { className: 'bg-[#f3eefa] text-[#5b3f8c]', Icon: MessageSquareText }
        : { className: 'bg-[#f7f1e4] text-[#7b5d22]', Icon: Hospital };
  const label = modeLabel(mode, clinicName, short);
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${style.className}`}
      title={label}
    >
      <style.Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

function PatientCell({ a }: { a: DashboardAppointment }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ece1] text-sm font-semibold text-[#7b5d22]"
        aria-hidden
      >
        {initials(a.patientName)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#141b34]">
          {a.patientName}
          {a.patientType === 'FAMILY_MEMBER' && (
            <span className="ml-1.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-[#8a8d99]">
              Family
            </span>
          )}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6b6f80]">
          <Phone className="h-3 w-3" /> {a.patientPhone}
        </p>
      </div>
    </div>
  );
}

function WhenCell({ a, now }: { a: DashboardAppointment; now: Date }) {
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-semibold text-[#141b34]">{formatTime(a.scheduledAt)}</p>
      <p className="text-xs text-[#6b6f80]">{relativeDay(a.scheduledAt, now)}</p>
    </div>
  );
}

function ReasonCell({ a }: { a: DashboardAppointment }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm text-[#141b34]" title={a.symptoms.join(', ')}>
        {a.symptoms.join(', ') || '—'}
      </p>
      {a.description && (
        <p className="mt-0.5 line-clamp-1 text-xs text-[#6b6f80]" title={a.description}>
          {a.description}
        </p>
      )}
    </div>
  );
}

const btnBase =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b38a3a] focus-visible:ring-offset-1 disabled:opacity-50';

function Actions({
  a,
  onAction,
  stacked = false,
}: {
  a: DashboardAppointment;
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  /** table layout: main action on top, Reschedule + Decline underneath */
  stacked?: boolean;
}) {
  if (a.status === 'COMPLETED') {
    return <span className="block whitespace-nowrap text-xs text-[#8a8d99]">No action needed</span>;
  }
  return (
    <div className={stacked ? 'grid w-[208px] grid-cols-2 gap-1.5 [&>button:first-child]:col-span-2' : 'flex flex-wrap items-center gap-2'}>
      {a.status === 'CONFIRMED' ? (
        <button
          type="button"
          onClick={() => onAction('complete', a)}
          className={`${btnBase} bg-[#141b34] text-white hover:bg-[#232c4f]`}
        >
          <CheckCheck className="h-3.5 w-3.5" /> Mark completed
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAction('approve', a)}
          className={`${btnBase} bg-[#2f6b45] text-white hover:bg-[#275a3a]`}
        >
          <Check className="h-3.5 w-3.5" /> Approve
        </button>
      )}
      <button
        type="button"
        onClick={() => onAction('reschedule', a)}
        className={`${btnBase} border border-[#d9d3c6] bg-white text-[#141b34] hover:border-[#141b34]`}
      >
        <CalendarClock className="h-3.5 w-3.5" /> Reschedule
      </button>
      <button
        type="button"
        onClick={() => onAction('decline', a)}
        className={`${btnBase} border border-transparent text-[#b23a3a] hover:border-[#f2cccc] hover:bg-[#fdf2f2]`}
      >
        <X className="h-3.5 w-3.5" /> Decline
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table (desktop) + cards (mobile)
// ---------------------------------------------------------------------------

interface AppointmentTableProps {
  rows: DashboardAppointment[];
  now: Date;
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  empty: { title: string; text: string };
  /** use "In-clinic" instead of the clinic name in the mode badge */
  shortMode?: boolean;
}

export default function AppointmentTable({ rows, now, onAction, empty, shortMode = false }: AppointmentTableProps) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-sm font-semibold text-[#141b34]">{empty.title}</p>
        <p className="mt-1 text-sm text-[#6b6f80]">{empty.text}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto min-[1360px]:block">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#efece5] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a8d99]">
              <th scope="col" className="px-6 py-3">Patient</th>
              <th scope="col" className="whitespace-nowrap px-3 py-3">Time &amp; date</th>
              <th scope="col" className="px-3 py-3">Consultation</th>
              <th scope="col" className="px-3 py-3">Reason for visit</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="py-3 pl-3 pr-5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1eee7]">
            {rows.map((a) => (
              <tr key={a.id} className="align-middle transition hover:bg-[#fbfaf6]">
                <td className="px-6 py-4"><div className="w-[180px]"><PatientCell a={a} /></div></td>
                <td className="px-3 py-4"><WhenCell a={a} now={now} /></td>
                <td className="px-3 py-4"><div className="max-w-[190px]"><ModeBadge mode={a.serviceMode} clinicName={a.clinicName} short={shortMode} /></div></td>
                <td className="w-full px-3 py-4"><div className="min-w-[160px] max-w-[340px]"><ReasonCell a={a} /></div></td>
                <td className="px-3 py-4"><StatusBadge status={a.status} rescheduled={a.rescheduled} /></td>
                <td className="py-4 pl-3 pr-5"><Actions a={a} onAction={onAction} stacked /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablet / mobile cards */}
      <ul className="divide-y divide-[#f1eee7] min-[1360px]:hidden">
        {rows.map((a) => (
          <li key={a.id} className="space-y-3 px-4 py-4 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <PatientCell a={a} />
              <StatusBadge status={a.status} rescheduled={a.rescheduled} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm font-semibold text-[#141b34]">
                {formatTime(a.scheduledAt)}{' '}
                <span className="font-normal text-[#6b6f80]">· {relativeDay(a.scheduledAt, now)}</span>
              </span>
              <ModeBadge mode={a.serviceMode} clinicName={a.clinicName} short={shortMode} />
            </div>
            <ReasonCell a={a} />
            <Actions a={a} onAction={onAction} />
          </li>
        ))}
      </ul>
    </>
  );
}
