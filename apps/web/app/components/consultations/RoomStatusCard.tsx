'use client';

// The screen shown instead of a consultation room when it can't be entered
// (too early, waiting for approval, cancelled, ended...) or after leaving it.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  CalendarX2,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  Hospital,
  Hourglass,
  Lock,
  LogIn,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react';
import {
  fileUrl,
  getRoomMessagesApi,
  type AccessResult,
  type ChatMessage,
  type LockedReason,
  type ParticipantRole,
  type RoomAppointment,
  type Viewer,
} from '@/app/lib/api/consultations';
import { clock, dashboardHref, dashboardLabel, displayTime, MODE_LABEL } from './room-utils';

type Tone = 'amber' | 'slate' | 'rose' | 'emerald' | 'sky';

const REASON_UI: Record<LockedReason, { title: string; Icon: typeof Lock; tone: Tone }> = {
  TOO_EARLY: { title: 'Room Locked', Icon: Lock, tone: 'amber' },
  NOT_APPROVED: { title: 'Waiting for Doctor Approval', Icon: Hourglass, tone: 'amber' },
  RESCHEDULE_PENDING: { title: 'New Time Being Confirmed', Icon: CalendarClock, tone: 'amber' },
  CANCELLED: { title: 'Appointment Cancelled', Icon: CalendarX2, tone: 'rose' },
  COMPLETED: { title: 'Session Ended', Icon: CircleCheck, tone: 'emerald' },
  NO_SHOW: { title: 'Consultation Missed', Icon: ShieldAlert, tone: 'rose' },
  IN_CLINIC: { title: 'In-Clinic Visit', Icon: Hospital, tone: 'sky' },
  EXPIRED: { title: 'Room Closed', Icon: Clock, tone: 'slate' },
};

const TONE: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
};

export function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f4f6fb]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#141b34] text-white">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold text-[#141b34]">Tabibistan</span>
          <span className="text-sm text-slate-400">· Online Consultation</span>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">{children}</main>
    </div>
  );
}

function Brief({ a, role }: { a: RoomAppointment; role: ParticipantRole }) {
  const ModeIcon = a.serviceMode === 'VIDEO' ? Video : a.serviceMode === 'TEXT' ? MessageSquareText : Hospital;
  return (
    <dl className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm sm:grid-cols-2">
      <div className="flex gap-3">
        <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Doctor</dt>
          <dd className="font-semibold text-slate-900">{a.doctor.name}</dd>
          <dd className="text-xs text-slate-500">{a.doctor.speciality}</dd>
        </div>
      </div>
      {role === 'DOCTOR' && (
        <div className="flex gap-3">
          <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patient</dt>
            <dd className="font-semibold text-slate-900">{a.patientName}</dd>
            {a.symptoms.length > 0 && <dd className="text-xs text-slate-500">{a.symptoms.slice(0, 3).join(', ')}</dd>}
          </div>
        </div>
      )}
      <div className="flex gap-3">
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Date &amp; time</dt>
          <dd className="font-semibold text-slate-900">{a.when.split(' at ')[0]}</dd>
          <dd className="text-xs text-slate-500">
            {displayTime(a.startTime)} – {displayTime(a.endTime)}
          </dd>
        </div>
      </div>
      <div className="flex gap-3">
        <ModeIcon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consultation type</dt>
          <dd className="font-semibold text-slate-900">{MODE_LABEL[a.serviceMode]}</dd>
          <dd className="font-mono text-xs text-slate-500">{a.appointmentNum}</dd>
        </div>
      </div>
    </dl>
  );
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const left = (new Date(to).getTime() - now) / 1000;
  if (left <= 0) return <p className="mt-4 text-sm font-semibold text-emerald-700">Opening the room…</p>;
  return (
    <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
      <Clock className="h-4 w-4" /> Opens in <span className="tabular-nums">{clock(left)}</span>
    </p>
  );
}

/** Read-only conversation shown on the summary after the session */
function Transcript({ appointmentId, viewer }: { appointmentId: string; viewer: Viewer }) {
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    getRoomMessagesApi(appointmentId, viewer)
      .then((r) => setMessages(r.messages))
      .catch(() => setMessages([]));
  }, [appointmentId, viewer]);
  if (!messages || messages.length === 0) return null;
  const mine = viewer.role;
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#141b34] hover:underline">
        <MessageSquareText className="h-4 w-4" /> {open ? 'Hide' : 'Show'} conversation ({messages.length})
      </button>
      {open && (
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm">
          {messages.map((m) => (
            <li key={m.id} className={m.senderType === 'SYSTEM' ? 'text-center text-xs text-slate-400' : m.senderType === mine ? 'text-right' : ''}>
              {m.senderType !== 'SYSTEM' && (
                <span className="block text-[11px] font-semibold text-slate-400">{m.senderType === 'DOCTOR' ? 'Doctor' : 'Patient'}</span>
              )}
              {m.message && <span className="whitespace-pre-wrap text-slate-800">{m.message}</span>}
              {m.attachments.map((u) => (
                <a key={u} href={fileUrl(u)} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                  <FileText className="h-3.5 w-3.5" /> Attachment
                </a>
              ))}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type StatusView =
  | { kind: 'locked'; access: Extract<AccessResult, { canJoin: false }>; viewer: Viewer }
  | { kind: 'left'; access: AccessResult; viewer: Viewer; onRejoin: () => void }
  | { kind: 'no-session'; asDoctor: boolean }
  | { kind: 'error'; message: string; onRetry: () => void; asDoctor: boolean };

export default function RoomStatusCard({ view, appointmentId }: { view: StatusView; appointmentId: string }) {
  const card = 'w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8';
  const back = (role: ParticipantRole) => (
    <Link
      href={dashboardHref(role)}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#141b34] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#232c4f]"
    >
      <ArrowLeft className="h-4 w-4" /> {dashboardLabel(role)}
    </Link>
  );

  if (view.kind === 'no-session') {
    return (
      <div className={card}>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${TONE.amber}`}>
          <LogIn className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Please sign in to join</h1>
        <p className="mt-2 text-sm text-slate-600">
          {view.asDoctor
            ? 'Your doctor session has ended in this tab. Sign in to the Doctor Portal, then open the consultation from your dashboard.'
            : 'Log in with the account that booked this appointment, then open it from My Appointments.'}
        </p>
        <div className="mt-6">{back(view.asDoctor ? 'DOCTOR' : 'USER')}</div>
      </div>
    );
  }

  if (view.kind === 'error') {
    return (
      <div className={card}>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-inset ${TONE.rose}`}>
          <ShieldAlert className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Can&apos;t open this room</h1>
        <p className="mt-2 text-sm text-slate-600" role="alert">
          {view.message}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {back(view.asDoctor ? 'DOCTOR' : 'USER')}
          <button type="button" onClick={view.onRetry} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const { access, viewer } = view;
  const left = view.kind === 'left';
  const ui = left
    ? { title: 'You Left the Consultation', Icon: LogIn, tone: 'slate' as Tone }
    : REASON_UI[view.access.reason] ?? REASON_UI.EXPIRED;
  const message = left
    ? access.canJoin
      ? `The room stays open until ${new Date(access.closesAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}. You can rejoin any time before then.`
      : access.message
    : view.access.message;

  return (
    <div className={card}>
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${TONE[ui.tone]}`}>
        <ui.Icon className="h-3.5 w-3.5" /> {ui.title}
      </span>
      <h1 className="mt-4 text-xl font-bold text-slate-900">
        {left ? 'You left the room' : access.appointment.serviceMode === 'IN_CLINIC' ? 'No online room for this visit' : ui.title}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600" role="status">
        {message}
      </p>
      {!left && view.access.reason === 'TOO_EARLY' && <Countdown to={view.access.opensAt} />}

      <Brief a={access.appointment} role={viewer.role} />

      {access.appointment.status === 'COMPLETED' && (
        <>
          {access.appointment.doctorNotes && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
                <ClipboardList className="h-4 w-4" /> Doctor&apos;s notes
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">{access.appointment.doctorNotes}</p>
            </div>
          )}
          <Transcript appointmentId={appointmentId} viewer={viewer} />
        </>
      )}

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        {back(viewer.role)}
        {left && access.canJoin && (
          <button
            type="button"
            onClick={view.onRejoin}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff6f61] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85b4d]"
          >
            <LogIn className="h-4 w-4" /> Rejoin Consultation
          </button>
        )}
      </div>
    </div>
  );
}
