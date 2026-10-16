'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  CalendarX2,
  Check,
  MessageSquareReply,
  Quote,
  Send,
  ShieldAlert,
  Stethoscope,
  UserRoundSearch,
  UserX,
  Timer,
} from 'lucide-react';
import type { PortalNotification } from '@/lib/api/doctorPortal';
import { timeAgo } from './ui';

const TYPE_UI: Record<string, { label: string; Icon: typeof Check; tone: string }> = {
  DOCTOR_REGISTRATION: { label: 'Doctor registration', Icon: Stethoscope, tone: 'bg-teal-50 text-teal-600' },
  DOCTOR_STATUS_UPDATED: { label: 'Doctor status', Icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600' },
  APPOINTMENT_BOOKED: { label: 'New appointment', Icon: CalendarCheck, tone: 'bg-blue-50 text-blue-600' },
  APPOINTMENT_STATUS_UPDATED: { label: 'Appointment update', Icon: CalendarClock, tone: 'bg-amber-50 text-amber-600' },
  APPOINTMENT_DECLINED: { label: 'Declined by doctor', Icon: CalendarX2, tone: 'bg-rose-50 text-rose-600' },
  APPOINTMENT_RESCHEDULED: { label: 'Rescheduled by doctor', Icon: CalendarClock, tone: 'bg-violet-50 text-violet-600' },
  APPOINTMENT_RESCHEDULE_FORWARDED: { label: 'Sent to patient', Icon: Send, tone: 'bg-slate-100 text-slate-600' },
  APPOINTMENT_PATIENT_RESPONSE: { label: 'Patient reply', Icon: MessageSquareReply, tone: 'bg-sky-50 text-sky-600' },
  APPOINTMENT_ALTERNATIVE_REQUESTED: { label: 'Patient wants another doctor', Icon: UserRoundSearch, tone: 'bg-rose-50 text-rose-600' },
  APPOINTMENT_ALTERNATIVE_RECOMMENDED: { label: 'Doctor recommended', Icon: Stethoscope, tone: 'bg-teal-50 text-teal-600' },
  PATIENT_NOT_JOINED_ALERT: { label: 'Patient not joined', Icon: Timer, tone: 'bg-amber-50 text-amber-600' },
  APPOINTMENT_NO_SHOW: { label: 'Patient no-show', Icon: UserX, tone: 'bg-rose-50 text-rose-600' },
};

export function notificationTypeUi(type: string) {
  return (
    TYPE_UI[type] ?? {
      label: type.startsWith('DOCTOR_') ? 'Doctor' : 'Appointment',
      Icon: ShieldAlert,
      tone: 'bg-slate-100 text-slate-600',
    }
  );
}

export function notificationHref(n: PortalNotification) {
  if (!n.link) return null;
  return n.link.kind === 'appointment' ? `/doctor-dashboard/appointments/${n.link.id}` : `/doctor-dashboard/doctors/${n.link.id}`;
}

/** One notification card (notifications page). */
export default function NotificationItem({
  n,
  onMarkRead,
  busy,
  actions,
}: {
  n: PortalNotification;
  onMarkRead?: (n: PortalNotification) => void;
  busy?: boolean;
  /** follow-up buttons (notify patient / recommend a doctor) */
  actions?: React.ReactNode;
}) {
  const ui = notificationTypeUi(n.type);
  const href = notificationHref(n);
  return (
    <li
      className={`flex gap-4 rounded-xl border px-4 py-4 shadow-sm transition sm:px-5 ${
        n.isRead ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/40'
      }`}
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ui.tone}`}>
        <ui.Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}
          <p className="text-sm font-semibold text-slate-900">{n.title}</p>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            {ui.label}
          </span>
        </div>
        {n.reason && n.appointment ? (
          <>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Doctor</dt>
                <dd className="text-slate-900">{n.appointment.doctorName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patient</dt>
                <dd className="text-slate-900">{n.appointment.patientName}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Appointment</dt>
                <dd className="font-mono text-xs leading-5 text-slate-900">{n.appointment.appointmentNum}</dd>
              </div>
            </dl>
            <blockquote className="mt-3 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-semibold text-slate-900">
                  {n.type === 'APPOINTMENT_ALTERNATIVE_REQUESTED' ? 'Patient' : 'Doctor'}&apos;s reason:{' '}
                </span>
                {n.reason}
              </span>
            </blockquote>
            {n.type === 'APPOINTMENT_RESCHEDULED' && (
              <p className="mt-2 text-xs text-slate-500">{n.message.replace(/ Reason: [\s\S]*$/, '')}</p>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600">{n.message}</p>
        )}
        {actions && <div className="mt-3">{actions}</div>}
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <time dateTime={n.createdAt} className="text-slate-400" title={new Date(n.createdAt).toLocaleString('en-GB')}>
            {timeAgo(n.createdAt)}
          </time>
          {href && (
            <Link href={href} className="font-semibold text-blue-700 hover:underline">
              {n.link?.kind === 'appointment' ? 'View appointment' : 'View doctor'} ➔
            </Link>
          )}
          {!n.isRead && onMarkRead && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onMarkRead(n)}
              className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" /> Mark as read
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
