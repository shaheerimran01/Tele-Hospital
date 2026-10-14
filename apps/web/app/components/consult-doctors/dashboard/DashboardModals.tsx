'use client';

import { useEffect, useRef, useState } from 'react';
import { CalendarClock, CalendarOff, X } from 'lucide-react';
import {
  toDateInput,
  toTimeInput,
  type BlockedTime,
  type DashboardAppointment,
} from './dashboard-data';
import { modeLabel } from './AppointmentTable';

function ModalShell({
  title,
  subtitle,
  Icon,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  Icon: typeof X;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    panelRef.current?.querySelector<HTMLElement>('input, textarea, button[type="submit"]')?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-[#141b34]/50" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
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
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#8a8d99] hover:bg-[#f3f1ec] hover:text-[#141b34]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputClass =
  'mt-1.5 w-full rounded-lg border border-[#d9d3c6] bg-white px-3 py-2.5 text-sm text-[#141b34] outline-none transition focus:border-[#b38a3a] focus:ring-2 focus:ring-[#b38a3a]/20';
const labelClass = 'block text-xs font-semibold text-[#3a3f52]';

function Footer({ onClose, submitLabel }: { onClose: () => void; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 border-t border-[#efece5] px-6 py-4">
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] hover:border-[#141b34]"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-lg bg-[#141b34] px-4 py-2 text-sm font-semibold text-white hover:bg-[#232c4f]"
      >
        {submitLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------------

export function RescheduleModal({
  appointment,
  now,
  onClose,
  onSave,
}: {
  appointment: DashboardAppointment;
  now: Date;
  onClose: () => void;
  onSave: (iso: string) => void;
}) {
  const current = new Date(appointment.scheduledAt);
  const [date, setDate] = useState(toDateInput(current < now ? now : current));
  const [time, setTime] = useState(toTimeInput(current));
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      setError('Choose a date and a time.');
      return;
    }
    const next = new Date(`${date}T${time}`);
    if (Number.isNaN(next.getTime())) {
      setError('That date or time is not valid.');
      return;
    }
    if (next.getTime() < now.getTime()) {
      setError('Choose a time later than now.');
      return;
    }
    if (next.getTime() === current.getTime()) {
      setError('This is the current time. Pick a different slot.');
      return;
    }
    onSave(next.toISOString());
  };

  return (
    <ModalShell
      title="Reschedule consultation"
      subtitle={`${appointment.patientName} · ${modeLabel(appointment.serviceMode, appointment.clinicName)}`}
      Icon={CalendarClock}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          <label className={labelClass}>
            New date
            <input
              type="date"
              value={date}
              min={toDateInput(now)}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            New time
            <input
              type="time"
              value={time}
              step={900}
              onChange={(e) => {
                setTime(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </label>
          {error ? (
            <p className="col-span-2 text-sm text-[#b23a3a]" role="alert">{error}</p>
          ) : (
            <p className="col-span-2 text-xs text-[#6b6f80]">
              The patient will see the new time as a proposal and can accept it or choose another doctor.
            </p>
          )}
        </div>
        <Footer onClose={onClose} submitLabel="Propose new time" />
      </form>
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Block time
// ---------------------------------------------------------------------------

export function BlockTimeModal({
  now,
  onClose,
  onSave,
}: {
  now: Date;
  onClose: () => void;
  onSave: (block: Omit<BlockedTime, 'id'>) => void;
}) {
  const [date, setDate] = useState(toDateInput(now));
  const [from, setFrom] = useState('13:00');
  const [to, setTo] = useState('14:00');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !from || !to) {
      setError('Choose a date and the start and end time.');
      return;
    }
    if (to <= from) {
      setError('The end time must be after the start time.');
      return;
    }
    onSave({ date, from, to, reason: reason.trim() || 'Unavailable' });
  };

  return (
    <ModalShell
      title="Block time"
      subtitle="Patients won't be able to book you during this time."
      Icon={CalendarOff}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          <label className={`${labelClass} col-span-2`}>
            Date
            <input
              type="date"
              value={date}
              min={toDateInput(now)}
              onChange={(e) => {
                setDate(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            From
            <input
              type="time"
              value={from}
              step={900}
              onChange={(e) => {
                setFrom(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            To
            <input
              type="time"
              value={to}
              step={900}
              onChange={(e) => {
                setTo(e.target.value);
                setError(null);
              }}
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} col-span-2`}>
            Reason <span className="font-normal text-[#8a8d99]">(optional, only you see this)</span>
            <input
              type="text"
              value={reason}
              maxLength={80}
              placeholder="e.g. Surgery, personal leave"
              onChange={(e) => setReason(e.target.value)}
              className={inputClass}
            />
          </label>
          {error && (
            <p className="col-span-2 text-sm text-[#b23a3a]" role="alert">{error}</p>
          )}
        </div>
        <Footer onClose={onClose} submitLabel="Block time" />
      </form>
    </ModalShell>
  );
}
