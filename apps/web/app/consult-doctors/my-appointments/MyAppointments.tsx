'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  CalendarDays,
  CalendarX2,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  FileText,
  Hourglass,
  LoaderCircle,
  Lock,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Video,
} from 'lucide-react';
import { openPatientLogin, readPatientSession, type PatientSession } from '@/app/lib/patient-session';
import { getMyAppointmentsApi, type Appointment, type AppointmentStatus } from '@/app/lib/api/appointments';
import { fileUrl } from '@/app/lib/api/consultations';
import {
  displayDate,
  displayTime,
  formatPkr,
  MODE_LABELS,
  toIsoDate,
} from '../book-appointment/components/booking-model';

const STATUS_UI: Record<AppointmentStatus, { label: string; className: string; Icon: typeof Hourglass }> = {
  PENDING: { label: 'Awaiting confirmation', className: 'bg-[#fdf4e3] text-[#8a6416]', Icon: Hourglass },
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#e8f6ee] text-[#1f6b45]', Icon: BadgeCheck },
  RESCHEDULED: { label: 'Rescheduled', className: 'bg-[#edf2fc] text-[#2c4f8f]', Icon: CalendarDays },
  COMPLETED: { label: 'Completed', className: 'bg-gray-100 text-gray-700', Icon: CheckCheck },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-50 text-red-700', Icon: CalendarX2 },
  NO_SHOW: { label: 'Missed', className: 'bg-red-50 text-red-700', Icon: CalendarX2 },
};

type Filter = 'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

const FILTERS: { id: Filter; label: string; statuses: AppointmentStatus[] | null }[] = [
  { id: 'ALL', label: 'All', statuses: null },
  { id: 'PENDING', label: 'Pending', statuses: ['PENDING', 'RESCHEDULED'] },
  { id: 'CONFIRMED', label: 'Confirmed', statuses: ['CONFIRMED'] },
  { id: 'COMPLETED', label: 'Completed', statuses: ['COMPLETED'] },
  { id: 'CANCELLED', label: 'Cancelled', statuses: ['CANCELLED', 'NO_SHOW'] },
];

const FILTER_EMPTY: Record<Filter, string> = {
  ALL: 'No appointments yet.',
  PENDING: 'No appointments are waiting for the doctor.',
  CONFIRMED: 'No confirmed appointments.',
  COMPLETED: 'No completed consultations yet.',
  CANCELLED: 'No cancelled appointments.',
};

export default function MyAppointments() {
  const [user, setUser] = useState<PatientSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    const sync = () => {
      setUser(readPatientSession());
      setAuthChecked(true);
    };
    sync();
    window.addEventListener('auth_state_change', sync);
    return () => window.removeEventListener('auth_state_change', sync);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setError(null);
    setItems(null);
    getMyAppointmentsApi(user.id)
      .then((list) => !cancelled && setItems(list))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user, reload]);

  if (!authChecked) return null;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">Log in to see your appointments</h1>
        <button
          type="button"
          onClick={openPatientLogin}
          className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]"
        >
          Log in to continue
        </button>
      </div>
    );
  }

  const today = toIsoDate(new Date());
  const upcoming = (items ?? [])
    .filter((a) => a.appointmentDate.slice(0, 10) >= today && ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status))
    .sort((a, b) => (a.appointmentDate + a.startTime).localeCompare(b.appointmentDate + b.startTime));
  const past = (items ?? []).filter((a) => !upcoming.includes(a));
  const countFor = (f: (typeof FILTERS)[number]) => (f.statuses ? (items ?? []).filter((a) => f.statuses!.includes(a.status)).length : (items ?? []).length);
  const activeFilter = FILTERS.find((f) => f.id === filter)!;
  const filtered = activeFilter.statuses
    ? (items ?? [])
        .filter((a) => activeFilter.statuses!.includes(a.status))
        .sort((a, b) =>
          filter === 'PENDING' || filter === 'CONFIRMED'
            ? (a.appointmentDate + a.startTime).localeCompare(b.appointmentDate + b.startTime)
            : (b.appointmentDate + b.startTime).localeCompare(a.appointmentDate + a.startTime),
        )
    : [];

  return (
    <div className="mx-auto w-full max-w-[880px] px-4 py-6 sm:px-6 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">Consult doctors</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-800">My appointments</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">My appointments</h1>
        <Link
          href="/consult-doctors/intake"
          className="rounded-xl bg-[#ff6f61] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e8453b]"
        >
          Book a new consultation
        </Link>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4" /> {error}
          </span>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="inline-flex items-center gap-1 font-semibold">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : !items ? (
        <p className="flex items-center gap-2 py-16 text-sm text-gray-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading your appointments…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
          <p className="text-base font-semibold text-gray-900">No appointments yet</p>
          <p className="mt-1 text-sm text-gray-500">Appointments you book will appear here.</p>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Filter by status" className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white p-1">
            {FILTERS.map((f) => {
              const active = f.id === filter;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                    active ? 'bg-[#ff6f61] text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>{countFor(f)}</span>
                </button>
              );
            })}
          </div>
          {filter === 'ALL' ? (
            <div className="space-y-8">
              <Group title="Upcoming" items={upcoming} empty="No upcoming appointments." />
              {past.length > 0 && <Group title="Past and cancelled" items={past} />}
            </div>
          ) : (
            <Group title={activeFilter.label} items={filtered} empty={FILTER_EMPTY[filter]} />
          )}
        </>
      )}
    </div>
  );
}

function Group({ title, items, empty }: { title: string; items: Appointment[]; empty?: string }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <AppointmentCard key={a.id} a={a} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AppointmentCard({ a }: { a: Appointment }) {
  const status = STATUS_UI[a.status] ?? STATUS_UI.PENDING;
  const ModeIcon = a.serviceMode === 'VIDEO' ? Video : a.serviceMode === 'TEXT' ? MessageSquareText : MapPin;
  // Online consultations always show the room button; before approval it opens a screen explaining why the room is locked
  const online =
    (a.serviceMode === 'VIDEO' || a.serviceMode === 'TEXT') && ['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(a.status);
  const waiting = a.status === 'PENDING' || a.status === 'RESCHEDULED';
  const patient =
    a.patientType === 'FAMILY_MEMBER' && a.familyMember
      ? a.familyMember.fullName
      : [a.user.firstName, a.user.lastName].filter(Boolean).join(' ') || 'You';

  return (
    <li className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900">{a.doctor.fullName}</p>
          <p className="text-xs text-gray-500">{a.doctor.specialisations[0] ?? a.doctor.title}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
          <status.Icon className="h-3.5 w-3.5" /> {status.label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2 text-gray-800">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          {displayDate(a.appointmentDate.slice(0, 10))} · {displayTime(a.startTime)}
        </p>
        <p className="flex items-start gap-2 text-gray-800">
          <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <span className="min-w-0">{a.clinic ? `${a.clinic.name} · ${a.clinic.address}` : MODE_LABELS[a.serviceMode]}</span>
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>
          {a.appointmentNum} · For {patient}
        </span>
        <span className="font-semibold text-gray-900">
          {formatPkr(a.fee)} <span className="font-normal text-gray-500">· {a.paymentStatus === 'PAID' ? 'Paid' : 'Not paid yet'}</span>
        </span>
      </div>
      {a.status === 'COMPLETED' ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500">
            {a.prescriptionUrl
              ? 'Your prescription is ready to view or download.'
              : 'The doctor has not issued a prescription yet. You will be notified when it is ready.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {a.prescriptionUrl && (
              <a
                href={fileUrl(a.prescriptionUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ff6f61] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e85b4d]"
              >
                <FileText className="h-4 w-4" /> View Prescription
              </a>
            )}
            {a.serviceMode === 'TEXT' && (
              <Link
                href={`/consultations/${encodeURIComponent(a.id)}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
              >
                <MessageSquareText className="h-4 w-4" /> View Chat Summary
              </Link>
            )}
            {a.serviceMode === 'VIDEO' && (
              <Link
                href={`/consultations/${encodeURIComponent(a.id)}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-50"
              >
                <Video className="h-4 w-4" /> View Summary
              </Link>
            )}
          </div>
        </div>
      ) : (
        online && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              {waiting ? 'The room unlocks once the doctor confirms your appointment.' : 'The room opens 10 minutes before your appointment.'}
            </p>
            <Link
              href={`/consultations/${encodeURIComponent(a.id)}`}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                waiting ? 'border border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-[#ff6f61] text-white hover:bg-[#e85b4d]'
              }`}
            >
              <ModeIcon className="h-4 w-4" />
              {a.serviceMode === 'VIDEO' ? 'Join Video Call' : 'Open Chat Room'}
            </Link>
          </div>
        )
      )}
    </li>
  );
}
