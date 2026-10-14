'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, CircleAlert, LoaderCircle, X, XCircle } from 'lucide-react';
import { ApiError } from '@/app/lib/api/doctors';
import { getRescheduleSlotsApi, type RescheduleSlots } from '@/app/lib/api/doctor-dashboard';
import { displayTime, formatDay, toDateInput, type DashboardAppointment } from './dashboard-data';
import { modeLabel } from './AppointmentTable';

function ModalShell({
  title,
  subtitle,
  Icon,
  onClose,
  busy,
  children,
}: {
  title: string;
  subtitle?: string;
  Icon: typeof X;
  onClose: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>('input, textarea, button[type="submit"]')?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#141b34]/50" onClick={() => !busy && onClose()} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#efece5] px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#f7f1e4] text-[#7b5d22]">
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[#141b34]">{title}</h2>
              {subtitle && <p className="mt-0.5 text-sm text-[#6b6f80]">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#8a8d99] hover:bg-[#f3f1ec] hover:text-[#141b34] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer({
  onClose,
  submitLabel,
  busy,
  danger = false,
  disabled = false,
}: {
  onClose: () => void;
  submitLabel: string;
  busy: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#efece5] px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] hover:border-[#141b34] disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy || disabled}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
          danger ? 'bg-[#b23a3a] hover:bg-[#962f2f]' : 'bg-[#141b34] hover:bg-[#232c4f]'
        }`}
      >
        {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </div>
  );
}

const subtitleFor = (a: DashboardAppointment) =>
  `${a.patientName} · ${modeLabel(a.serviceMode, a.clinic?.name)} · now ${formatDay(a.appointmentDate)}, ${displayTime(a.startTime)}`;

// ---------------------------------------------------------------------------
// Reschedule: pick a date, then one of the doctor's free slots
// ---------------------------------------------------------------------------

export function RescheduleModal({
  token,
  appointment,
  today,
  onClose,
  onSave,
}: {
  token: string;
  appointment: DashboardAppointment;
  today: string;
  onClose: () => void;
  onSave: (date: string, startTime: string) => Promise<void>;
}) {
  const current = appointment.appointmentDate.slice(0, 10);
  const [date, setDate] = useState(current < today ? today : current);
  const [data, setData] = useState<RescheduleSlots | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSlot(null);
    getRescheduleSlotsApi(token, appointment.id, date)
      .then((d) => !cancelled && setData(d))
      .catch((e) => {
        if (cancelled) return;
        setData(null);
        setError(e instanceof ApiError ? e.messages[0] : 'Could not load free times.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, appointment.id, date]);

  // Latest bookable day (the API allows 60 days ahead)
  const max = new Date(`${today}T00:00:00`);
  max.setDate(max.getDate() + 60);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot) {
      setSaveError('Choose a new time.');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(date, slot);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.messages[0] : 'Could not reschedule. Please try again.');
      setSaving(false);
    }
  };

  const isCurrent = (s: string) => date === current && s === appointment.startTime;

  return (
    <ModalShell title="Reschedule consultation" subtitle={subtitleFor(appointment)} Icon={CalendarClock} onClose={onClose} busy={saving}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-4 px-6 py-5">
          <label className="block text-xs font-semibold text-[#3a3f52]">
            New date
            <input
              type="date"
              value={date}
              min={today}
              max={toDateInput(max)}
              onChange={(e) => {
                setDate(e.target.value);
                setSaveError(null);
              }}
              className="mt-1.5 w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm text-[#141b34] outline-none transition focus:border-[#b38a3a] focus:ring-2 focus:ring-[#b38a3a]/20"
            />
          </label>

          <div>
            <p className="text-xs font-semibold text-[#3a3f52]">Free times</p>
            {loading ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-[#6b6f80]">
                <LoaderCircle className="h-4 w-4 animate-spin" /> Checking your schedule…
              </p>
            ) : error ? (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-[#b23a3a]">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </p>
            ) : !data || data.slots.length === 0 ? (
              <p className="mt-2 rounded-lg bg-[#faf8f3] px-3 py-3 text-sm text-[#6b6f80]">
                No free times on {formatDay(date)}.
                {data && data.workingDays.length > 0 && <> You work on {data.workingDays.join(', ')}.</>}
              </p>
            ) : (
              <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Free times">
                {data.slots.map((s) => {
                  const active = slot === s.startTime;
                  return (
                    <button
                      key={s.startTime}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      disabled={isCurrent(s.startTime)}
                      onClick={() => {
                        setSlot(s.startTime);
                        setSaveError(null);
                      }}
                      className={`rounded-lg border px-2 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        active
                          ? 'border-[#141b34] bg-[#141b34] text-white'
                          : 'border-[#e2ddd2] bg-white text-[#141b34] hover:border-[#b38a3a]'
                      }`}
                      title={isCurrent(s.startTime) ? 'Current time' : undefined}
                    >
                      {displayTime(s.startTime)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {saveError ? (
            <p className="text-sm text-[#b23a3a]" role="alert">{saveError}</p>
          ) : (
            <p className="text-xs text-[#6b6f80]">The appointment moves to the new time and is marked as rescheduled.</p>
          )}
        </div>
        <Footer onClose={onClose} submitLabel="Reschedule" busy={saving} disabled={!slot} />
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Decline (cannot be undone, so it asks first)
// ---------------------------------------------------------------------------

export function DeclineModal({
  appointment,
  onClose,
  onConfirm,
}: {
  appointment: DashboardAppointment;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.messages[0] : 'Could not decline. Please try again.');
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Decline this consultation?" subtitle={subtitleFor(appointment)} Icon={XCircle} onClose={onClose} busy={saving}>
      <form onSubmit={submit} noValidate>
        <div className="space-y-3 px-6 py-5">
          <label className="block text-xs font-semibold text-[#3a3f52]">
            Reason <span className="font-normal text-[#8a8d99]">(optional, saved with the appointment)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. I'm not available at this time. Please book another slot."
              className="mt-1.5 w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm text-[#141b34] outline-none transition focus:border-[#b38a3a] focus:ring-2 focus:ring-[#b38a3a]/20"
            />
          </label>
          {error ? (
            <p className="text-sm text-[#b23a3a]" role="alert">{error}</p>
          ) : (
            <p className="text-xs text-[#6b6f80]">The appointment is cancelled and the time becomes free again.</p>
          )}
        </div>
        <Footer onClose={onClose} submitLabel="Decline appointment" busy={saving} danger />
      </form>
    </ModalShell>
  );
}
