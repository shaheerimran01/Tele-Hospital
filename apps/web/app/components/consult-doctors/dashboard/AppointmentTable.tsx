'use client';

import Link from 'next/link';
import {
  Ban,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCheck,
  Hospital,
  Hourglass,
  LoaderCircle,
  MessageSquareText,
  Phone,
  ShieldCheck,
  UserX,
  Video,
  X,
} from 'lucide-react';
import {
  displayTime,
  initials,
  relationLabel,
  relativeDay,
  type AppointmentStatus,
  type DashboardAppointment,
  type ServiceMode,
} from './dashboard-data';

export type AppointmentAction = 'approve' | 'complete' | 'reschedule' | 'decline' | 'accept-slot';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<AppointmentStatus, { label: string; className: string; Icon: typeof Check }> = {
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#eaf6ee] text-[#2f6b45] ring-[#cfe6d6]', Icon: BadgeCheck },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-[#eef2fb] text-[#2c4f8f] ring-[#d6e0f3]', Icon: CalendarClock },
  PENDING: { label: 'Pending', className: 'bg-[#fdf4e3] text-[#8a6416] ring-[#f0dfb8]', Icon: Hourglass },
  COMPLETED: { label: 'Completed', className: 'bg-[#eef0f6] text-[#3a4366] ring-[#dde1ec]', Icon: CheckCheck },
  CANCELLED: { label: 'Declined', className: 'bg-[#fdf0f0] text-[#9a3030] ring-[#f2cccc]', Icon: Ban },
  NO_SHOW: { label: 'No-show', className: 'bg-[#f3f1ec] text-[#5c5a52] ring-[#e2ded4]', Icon: UserX },
};

const TIME_REQUESTED_BADGE = {
  label: 'Time requested',
  className: 'bg-[#fdf4e3] text-[#8a6416] ring-[#f0dfb8]',
  Icon: CalendarClock,
};

export function StatusBadge({ status, timeRequested = false }: { status: AppointmentStatus; timeRequested?: boolean }) {
  const { label, className, Icon } = timeRequested ? TIME_REQUESTED_BADGE : STATUS_BADGE[status] ?? STATUS_BADGE.PENDING;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${className}`}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

export function modeLabel(mode: ServiceMode, clinicName: string | null | undefined, short = false) {
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
  clinicName: string | null | undefined;
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

export function PatientCell({ a }: { a: DashboardAppointment }) {
  const fm = a.familyMember;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1ece1] text-sm font-semibold text-[#7b5d22]"
        aria-hidden
      >
        {initials(a.patientName)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-[#141b34]" title={a.patientName}>
          {a.patientName}
        </p>
        {fm ? (
          <p className="truncate text-xs text-[#6b6f80]" title={a.bookedBy ? `Booked by ${a.bookedBy}` : undefined}>
            {relationLabel(fm.relation)}
            {fm.age != null ? ` · ${fm.age} yrs` : ''} · {fm.gender}
          </p>
        ) : null}
        {a.patientPhone && (
          <a href={`tel:${a.patientPhone}`} className="mt-0.5 flex items-center gap-1 text-xs text-[#6b6f80] hover:text-[#141b34]">
            <Phone className="h-3 w-3" /> {a.patientPhone}
          </a>
        )}
      </div>
    </div>
  );
}

function WhenCell({ a, today }: { a: DashboardAppointment; today: string }) {
  return (
    <div className="whitespace-nowrap">
      <p className="text-sm font-semibold text-[#141b34]">{displayTime(a.startTime)}</p>
      <p className="text-xs text-[#6b6f80]">{relativeDay(a.appointmentDate, today)}</p>
    </div>
  );
}

function ReasonCell({ a }: { a: DashboardAppointment }) {
  const reason = a.symptoms.join(', ');
  return (
    <div className="min-w-0">
      {a.assignedByAdmin && (
        <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#eef2fb] px-2 py-0.5 text-[11px] font-semibold text-[#2c4f8f] ring-1 ring-inset ring-[#d6e0f3]">
          <ShieldCheck className="h-3 w-3" /> Assigned by Admin
        </span>
      )}
      <p className="truncate text-sm text-[#141b34]" title={reason || undefined}>
        {reason || <span className="text-[#a9a59a]">Not provided</span>}
      </p>
      {a.assignedByAdmin && a.status === 'PENDING' ? (
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[#2c4f8f]">
          Tabibistan admin assigned this patient to you. Approve the proposed time or decline the request.
        </p>
      ) : a.patientRequestedSlot ? (
        <p className="mt-0.5 line-clamp-2 text-xs font-medium text-[#8a6416]" title={a.cancelReason ?? undefined}>
          The patient asked for this time.{' '}
          {a.cancelReason?.includes('Note: ') ? `Note: ${a.cancelReason.split('Note: ')[1]}` : 'Accept it or propose another time.'}
        </p>
      ) : (
        a.status === 'RESCHEDULED' &&
        a.cancelReason && (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium text-[#2c4f8f]" title={a.cancelReason}>
            Your note: {a.cancelReason}
          </p>
        )
      )}
      {(a.description || a.symptomDuration) && (
        <p className="mt-0.5 line-clamp-1 text-xs text-[#6b6f80]" title={a.description ?? undefined}>
          {a.symptomDuration ? `For ${a.symptomDuration.toLowerCase()}` : ''}
          {a.symptomDuration && a.description ? ' · ' : ''}
          {a.description}
        </p>
      )}
    </div>
  );
}

export const btnBase =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#b38a3a] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50';

function Actions({
  a,
  onAction,
  busy,
  stacked = false,
}: {
  a: DashboardAppointment;
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  /** the action currently running for this row */
  busy: AppointmentAction | null;
  stacked?: boolean;
}) {
  const canAct = a.status === 'PENDING' || a.status === 'CONFIRMED' || a.status === 'RESCHEDULED';
  // Finished online consultations: the summary (notes, chat, voice notes, files), same view as the patient's
  if (a.status === 'COMPLETED' && (a.serviceMode === 'VIDEO' || a.serviceMode === 'TEXT')) {
    return (
      <Link
        href={`/consultations/${encodeURIComponent(a.id)}?as=doctor`}
        className={`${btnBase} border border-[#dde1ec] bg-white text-[#3a4366] hover:bg-[#f4f5fa]`}
      >
        <CheckCheck className="h-3.5 w-3.5" /> View Summary
      </Link>
    );
  }
  if (!canAct) {
    return <span className="block whitespace-nowrap text-xs text-[#8a8d99]">No action needed</span>;
  }
  const primary: AppointmentAction = a.patientRequestedSlot ? 'accept-slot' : a.status === 'PENDING' ? 'approve' : 'complete';
  // Requests assigned by the admin are approved or declined (the admin arranges any other time)
  const adminRequest = a.assignedByAdmin === true && a.status === 'PENDING';
  const spin = (x: AppointmentAction, Icon: typeof Check) =>
    busy === x ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />;

  // Confirmed online consultations: open the video / chat room
  const online = a.status === 'CONFIRMED' && (a.serviceMode === 'VIDEO' || a.serviceMode === 'TEXT');

  return (
    <div
      className={
        stacked
          ? 'grid w-[208px] grid-cols-2 gap-1.5 [&>:first-child]:col-span-2'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      {online && (
        <Link
          href={`/consultations/${encodeURIComponent(a.id)}?as=doctor`}
          className={`${btnBase} bg-[#b38a3a] text-white hover:bg-[#9c7630]`}
        >
          {a.serviceMode === 'VIDEO' ? <Video className="h-3.5 w-3.5" /> : <MessageSquareText className="h-3.5 w-3.5" />}
          {a.serviceMode === 'VIDEO' ? 'Join Video Call' : 'Open Chat'}
        </Link>
      )}
      {primary === 'accept-slot' ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAction('accept-slot', a)}
          className={`${btnBase} bg-[#2f6b45] text-white hover:bg-[#275a3a]`}
        >
          {spin('accept-slot', Check)} Accept Slot
        </button>
      ) : primary === 'complete' ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAction('complete', a)}
          className={`${btnBase} bg-[#141b34] text-white hover:bg-[#232c4f]`}
        >
          {spin('complete', CheckCheck)} Mark completed
        </button>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAction('approve', a)}
          className={`${btnBase} bg-[#2f6b45] text-white hover:bg-[#275a3a]`}
        >
          {spin('approve', Check)} {adminRequest ? 'Approve / Confirm' : 'Approve'}
        </button>
      )}
      {!adminRequest && (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => onAction('reschedule', a)}
          className={`${btnBase} border border-[#d9d3c6] bg-white text-[#141b34] hover:border-[#141b34]`}
        >
          <CalendarClock className="h-3.5 w-3.5" /> Reschedule
        </button>
      )}
      <button
        type="button"
        disabled={busy !== null}
        onClick={() => onAction('decline', a)}
        className={`${btnBase} border border-transparent text-[#b23a3a] hover:border-[#f2cccc] hover:bg-[#fdf2f2]`}
      >
        {spin('decline', X)} Decline
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table (desktop) + cards (smaller screens)
// ---------------------------------------------------------------------------

interface AppointmentTableProps {
  rows: DashboardAppointment[];
  today: string;
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  /** appointment id -> running action */
  busy: Record<string, AppointmentAction | undefined>;
  empty: { title: string; text: string };
  /** use "In-clinic" instead of the clinic name in the mode badge */
  shortMode?: boolean;
}

export default function AppointmentTable({ rows, today, onAction, busy, empty, shortMode = false }: AppointmentTableProps) {
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
              <tr key={a.id} className={`align-middle transition hover:bg-[#fbfaf6] ${busy[a.id] ? 'opacity-70' : ''}`}>
                <td className="px-6 py-4"><div className="w-[190px]"><PatientCell a={a} /></div></td>
                <td className="px-3 py-4"><WhenCell a={a} today={today} /></td>
                <td className="px-3 py-4"><div className="max-w-[190px]"><ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short={shortMode} /></div></td>
                <td className="w-full px-3 py-4"><div className="min-w-[150px] max-w-[340px]"><ReasonCell a={a} /></div></td>
                <td className="px-3 py-4"><StatusBadge status={a.status} timeRequested={a.patientRequestedSlot} /></td>
                <td className="py-4 pl-3 pr-5"><Actions a={a} onAction={onAction} busy={busy[a.id] ?? null} stacked /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-[#f1eee7] min-[1360px]:hidden">
        {rows.map((a) => (
          <li key={a.id} className={`space-y-3 px-4 py-4 sm:px-6 ${busy[a.id] ? 'opacity-70' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <PatientCell a={a} />
              <StatusBadge status={a.status} timeRequested={a.patientRequestedSlot} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm font-semibold text-[#141b34]">
                {displayTime(a.startTime)}{' '}
                <span className="font-normal text-[#6b6f80]">· {relativeDay(a.appointmentDate, today)}</span>
              </span>
              <ModeBadge mode={a.serviceMode} clinicName={a.clinic?.name} short={shortMode} />
            </div>
            <ReasonCell a={a} />
            <Actions a={a} onAction={onAction} busy={busy[a.id] ?? null} />
          </li>
        ))}
      </ul>
    </>
  );
}
