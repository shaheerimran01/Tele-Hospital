'use client';

import Link from 'next/link';
import { BadgeCheck, CalendarCheck, CalendarClock, Check, ShieldAlert, Stethoscope } from 'lucide-react';
import type { PortalNotification } from '@/lib/api/doctorPortal';
import { timeAgo } from './ui';

const TYPE_UI: Record<string, { label: string; Icon: typeof Check; tone: string }> = {
  DOCTOR_REGISTRATION: { label: 'Doctor registration', Icon: Stethoscope, tone: 'bg-teal-50 text-teal-600' },
  DOCTOR_STATUS_UPDATED: { label: 'Doctor status', Icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600' },
  APPOINTMENT_BOOKED: { label: 'New appointment', Icon: CalendarCheck, tone: 'bg-blue-50 text-blue-600' },
  APPOINTMENT_STATUS_UPDATED: { label: 'Appointment update', Icon: CalendarClock, tone: 'bg-amber-50 text-amber-600' },
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
}: {
  n: PortalNotification;
  onMarkRead?: (n: PortalNotification) => void;
  busy?: boolean;
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
        <p className="mt-1 text-sm text-slate-600">{n.message}</p>
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
