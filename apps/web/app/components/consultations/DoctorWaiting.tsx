'use client';

// Doctor waiting for the patient (video and text rooms):
//  - "Notify Patient I'm Waiting" button with a 60-second cooldown
//  - "Waiting for Patient... Time elapsed: MM:SS / 10:00" banner
//  - after 10 minutes: "Mark Patient No-Show & Exit Room"
// The server keeps the waiting clock and enforces the limits; this only shows them.

import { useCallback, useEffect, useState } from 'react';
import { BellRing, CircleAlert, LoaderCircle, LogOut, Timer, UserX } from 'lucide-react';
import { markNoShowApi, type Viewer } from '@/app/lib/api/consultations';
import type { JoinedAccess } from './RoomGuard';
import { displayTime } from './room-utils';
import type { ConsultationRoom } from './useConsultationRoom';

const JUST_SENT_SECONDS = 3;

/** 125 -> "02:05" */
function mmss(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** "in 1:05" style countdown without the leading zero on minutes */
function mss(totalSeconds: number) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function useDoctorWaiting({ room, access, viewer }: { room: ConsultationRoom; access: JoinedAccess; viewer: Viewer }) {
  const doctorView = viewer.role === 'DOCTOR';
  const w = room.waiting;
  const [tick, setTick] = useState(() => Date.now());
  /** set when our own notification was accepted (before the server's update arrives) */
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const live = doctorView && !!w && !room.ended && room.status === 'connected';
  useEffect(() => {
    if (!doctorView) return;
    const t = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [doctorView]);
  // Recalculate as soon as the server sends news (not on the next tick)
  useEffect(() => setTick(Date.now()), [w, sentAt]);

  // Server time = local time + offset (the countdowns follow the server's clock)
  const offset = w ? new Date(w.serverTime).getTime() - w.receivedAt : 0;
  const now = tick + offset;
  const cooldownMs = (w?.cooldownSeconds ?? 60) * 1000;
  const waitMs = (w?.waitMinutes ?? 10) * 60_000;

  const lastAlert = Math.max(w?.lastAlertAt ? new Date(w.lastAlertAt).getTime() : 0, sentAt ?? 0);
  const retryIn = lastAlert ? Math.min(cooldownMs / 1000, Math.max(0, Math.ceil((lastAlert + cooldownMs - now) / 1000))) : 0;

  const patientAbsent = live && !w!.patientPresent;
  const doctorSince = w?.doctorSince ? new Date(w.doctorSince).getTime() : null;
  const startsAt = new Date(access.startsAt).getTime();
  const windowStart = doctorSince === null ? null : Math.max(doctorSince, startsAt);
  /** the 10-minute clock applies until the patient first joins */
  const timerActive = patientAbsent && !w!.patientJoined && windowStart !== null;
  const beforeStart = timerActive && now < windowStart!;
  const elapsedMs = timerActive && !beforeStart ? now - windowStart! : 0;
  const expired = timerActive && !beforeStart && elapsedMs >= waitMs;

  // Errors from an earlier attempt don't stay once the button can be used again
  useEffect(() => {
    if (!patientAbsent) setNotifyError(null);
  }, [patientAbsent]);
  useEffect(() => {
    if (!notifyError) return;
    const t = window.setTimeout(() => setNotifyError(null), 6000);
    return () => window.clearTimeout(t);
  }, [notifyError]);

  const notify = useCallback(async () => {
    if (sending || retryIn > 0) return;
    setSending(true);
    setNotifyError(null);
    const res = await room.notifyPatientWaiting();
    setSending(false);
    if (res.ok) {
      setSentAt(Date.now() + offset);
    } else {
      setNotifyError(res.error);
      if (res.retryAfter) setSentAt(Date.now() + offset - (cooldownMs - res.retryAfter * 1000));
    }
  }, [sending, retryIn, room, offset, cooldownMs]);

  return {
    doctorView,
    /** show the Notify button */
    canNotify: patientAbsent,
    retryIn,
    justSent: retryIn > 0 && retryIn > (cooldownMs / 1000) - JUST_SENT_SECONDS,
    sending,
    notifyError,
    notify,
    /** show the waiting banner */
    timerActive,
    beforeStart,
    startsIn: beforeStart ? (windowStart! - now) / 1000 : 0,
    elapsedSeconds: Math.min(elapsedMs, waitMs) / 1000,
    waitSeconds: waitMs / 1000,
    expired,
    startTime: displayTime(access.appointment.startTime),
    patientLeft: patientAbsent && !!w?.patientJoined,
  };
}

export type DoctorWaiting = ReturnType<typeof useDoctorWaiting>;

// ---------------------------------------------------------------------------

export function NotifyPatientButton({ waiting, tone, compact = false }: { waiting: DoctorWaiting; tone: 'dark' | 'light'; compact?: boolean }) {
  if (!waiting.doctorView || !waiting.canNotify) return null;
  const cooling = waiting.retryIn > 0;
  const label = cooling
    ? waiting.justSent
      ? `Notification sent. Retry in ${waiting.retryIn}s...`
      : `Retry in ${waiting.retryIn}s...`
    : waiting.sending
      ? 'Sending…'
      : "Notify Patient I'm Waiting";
  const base =
    tone === 'dark'
      ? cooling
        ? 'bg-white/15 text-white/80'
        : 'bg-amber-400 text-slate-900 hover:bg-amber-300 shadow-lg shadow-amber-500/20'
      : cooling
        ? 'border border-slate-200 bg-slate-100 text-slate-500'
        : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm';
  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={waiting.notify}
        disabled={cooling || waiting.sending}
        aria-live="polite"
        title={cooling ? 'You can notify the patient once a minute' : 'Send the patient a notification that you are waiting in the room'}
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tabular-nums transition disabled:cursor-not-allowed sm:text-sm ${base}`}
      >
        {waiting.sending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
        {compact && !cooling && !waiting.sending ? (
          <>
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">Notify Patient</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
      {waiting.notifyError && (
        <span
          role="alert"
          className={`absolute top-full z-10 mt-1.5 w-64 rounded-lg px-3 py-2 text-center text-xs font-medium shadow-lg ${tone === 'dark' ? 'bg-rose-600 text-white' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}
        >
          {waiting.notifyError}
        </span>
      )}
    </span>
  );
}

export function WaitingBanner({ waiting, tone, patientName }: { waiting: DoctorWaiting; tone: 'dark' | 'light'; patientName: string }) {
  if (!waiting.doctorView) return null;
  if (!waiting.timerActive) {
    if (!waiting.patientLeft) return null;
    return (
      <div
        className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold ${tone === 'dark' ? 'rounded-full bg-black/60 text-white' : 'border-b border-amber-200 bg-amber-50 text-amber-800'}`}
        role="status"
      >
        <CircleAlert className="h-4 w-4" /> {patientName} left the room. You can notify them that you are still waiting.
      </div>
    );
  }
  const pct = Math.min(100, (waiting.elapsedSeconds / waiting.waitSeconds) * 100);
  const text = waiting.beforeStart
    ? `Waiting for Patient... The appointment starts at ${waiting.startTime} (in ${mss(waiting.startsIn)}). The 10-minute waiting time begins then.`
    : `Waiting for Patient... Time elapsed: ${mmss(waiting.elapsedSeconds)} / ${mmss(waiting.waitSeconds)}`;
  return (
    <div
      className={
        tone === 'dark'
          ? 'w-full max-w-md overflow-hidden rounded-2xl bg-black/60 text-white shadow-lg backdrop-blur'
          : 'border-b border-amber-200 bg-amber-50 text-amber-900'
      }
      role="timer"
      aria-label={text}
    >
      <div className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold tabular-nums sm:text-sm ${tone === 'light' ? 'mx-auto max-w-3xl' : ''}`}>
        <Timer className={`h-4 w-4 shrink-0 ${waiting.expired ? 'text-rose-400' : tone === 'dark' ? 'text-amber-300' : 'text-amber-600'}`} />
        <span className="min-w-0 flex-1">{text}</span>
      </div>
      {!waiting.beforeStart && (
        <div className={`h-1 ${tone === 'dark' ? 'bg-white/10' : 'bg-amber-100'}`}>
          <div
            className={`h-full transition-[width] duration-1000 ease-linear ${waiting.expired ? 'bg-rose-500' : 'bg-amber-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/** After the 10-minute window: mark the patient as a no-show and leave, or keep waiting. */
export function NoShowCard({
  waiting,
  tone,
  appointmentId,
  viewer,
  appointmentNum,
  onExit,
}: {
  waiting: DoctorWaiting;
  tone: 'dark' | 'light';
  appointmentId: string;
  viewer: Viewer;
  appointmentNum: string;
  /** leave the room after the appointment was marked (stop camera, go to the dashboard) */
  onExit: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!waiting.doctorView || !waiting.expired || viewer.role !== 'DOCTOR') return null;

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHidden(false)}
        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold ${tone === 'dark' ? 'bg-rose-600 text-white hover:bg-rose-700' : 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'}`}
      >
        <UserX className="h-3.5 w-3.5" /> Patient has not joined. Mark No-Show…
      </button>
    );
  }

  const mark = async () => {
    setBusy(true);
    setError(null);
    try {
      await markNoShowApi(appointmentId, viewer.token);
      onExit();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not mark the patient as a no-show.');
      setBusy(false);
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby="no-show-title"
      aria-describedby="no-show-text"
      className={`w-full max-w-md rounded-2xl p-5 text-left shadow-2xl ${tone === 'dark' ? 'bg-white text-slate-900' : 'border border-rose-200 bg-white text-slate-900'}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <UserX className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p id="no-show-title" className="text-sm font-bold">
            Patient has not joined within the 10-minute window.
          </p>
          <p id="no-show-text" className="mt-1 text-xs leading-relaxed text-slate-600">
            {confirming
              ? `Appointment ${appointmentNum} will be marked as a no-show and the room will close. The patient and the Tabibistan admin team are notified. This can't be undone from here.`
              : 'You can mark the appointment as a no-show and leave the room, or keep waiting a little longer.'}
          </p>
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => (confirming ? setConfirming(false) : setHidden(true))}
          disabled={busy}
          className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {confirming ? 'Cancel' : 'Keep Waiting'}
        </button>
        <button
          type="button"
          onClick={() => (confirming ? mark() : setConfirming(true))}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {confirming ? 'Confirm No-Show & Exit' : 'Mark Patient No-Show & Exit Room'}
        </button>
      </div>
    </div>
  );
}

/** Where the doctor goes after marking a no-show */
export const NO_SHOW_EXIT_HREF = '/consult-doctors/doctor-dashboard?view=appointments&tab=cancelled';
