'use client';

// Admin follow-up after a doctor reschedules or declines a booking:
// "Notify Patient of Proposed Slot" and "Find Alternative Doctor". The admin picks a
// doctor and a free time and sends "Request Appointment with Dr. X": that doctor
// approves or declines it first, and the patient is notified only after approval.

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CalendarClock,
  Check,
  Hourglass,
  LoaderCircle,
  Undo2,
  Quote,
  Search,
  Send,
  SlidersHorizontal,
  Stethoscope,
  UserRoundSearch,
  X,
} from 'lucide-react';
import {
  fetchAlternativeDoctors,
  fetchResolution,
  forwardRescheduleToPatient,
  requestAlternativeAppointment,
  withdrawAlternativeRequest,
  type AlternativeDoctorsResponse,
  type ResolutionStage,
  type ResolutionSummary,
} from '@/lib/api/doctorPortal';
import { appointmentDay, displayTime, MODE_LABELS, pkr, timeAgo } from './ui';

const btn =
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50';

const NOTE_MAX = 500;

// ---------------------------------------------------------------------------
// Buttons + status chip for one appointment
// ---------------------------------------------------------------------------

export function ResolutionActions({
  appointmentId,
  stage,
  forwardedAt,
  recommendedAt,
  recommendedDoctorName,
  requestedAt,
  requestedAppointmentNum,
  requestedDoctorName,
  onDone,
  layout = 'row',
}: {
  appointmentId: string;
  stage: ResolutionStage | undefined;
  forwardedAt?: string | null;
  recommendedAt?: string | null;
  recommendedDoctorName?: string | null;
  /** the latest "Request Appointment with Dr. X" */
  requestedAt?: string | null;
  requestedAppointmentNum?: string | null;
  requestedDoctorName?: string | null;
  /** called with a success message after an action */
  onDone: (message: string) => void;
  layout?: 'row' | 'column';
}) {
  const [open, setOpen] = useState<'notify' | 'recommend' | null>(null);
  const [withdrawing, setWithdrawing] = useState<'confirm' | 'busy' | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  if (!stage) return null;

  const withdraw = async () => {
    setWithdrawing('busy');
    setWithdrawError(null);
    try {
      await withdrawAlternativeRequest(appointmentId);
      setWithdrawing(null);
      onDone(`The request to ${requestedDoctorName ?? 'the doctor'} was withdrawn. You can now choose another doctor.`);
    } catch (e) {
      setWithdrawing('confirm');
      setWithdrawError(e instanceof Error ? e.message : 'Could not withdraw the request.');
    }
  };

  const wrap = layout === 'column' ? 'flex flex-col gap-2' : 'flex flex-wrap items-center gap-2';
  const chip = (tone: string, Icon: typeof Check, text: string) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" /> {text}
    </span>
  );

  return (
    <>
      <div className={wrap}>
        {stage === 'AWAITING_FORWARD' && (
          <button type="button" onClick={() => setOpen('notify')} className={`${btn} bg-violet-700 text-white hover:bg-violet-800`}>
            <Send className="h-4 w-4" /> Notify Patient of Proposed Slot
          </button>
        )}
        {stage === 'RESCHEDULE_PROPOSED' && (
          <>
            {chip('bg-amber-50 text-amber-800 ring-amber-200', Hourglass, `Sent to patient${forwardedAt ? ` ${timeAgo(forwardedAt)}` : ''} · waiting for reply`)}
            <button type="button" onClick={() => setOpen('notify')} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
              <Send className="h-4 w-4" /> Send Again
            </button>
          </>
        )}
        {stage === 'AWAITING_DOCTOR' &&
          chip('bg-sky-50 text-sky-800 ring-sky-200', CalendarClock, 'Patient picked another time · waiting for the doctor to accept')}
        {stage === 'AWAITING_RECOMMENDATION' && (
          <button type="button" onClick={() => setOpen('recommend')} className={`${btn} bg-teal-700 text-white hover:bg-teal-800`}>
            <UserRoundSearch className="h-4 w-4" /> Find Alternative Doctor
          </button>
        )}
        {stage === 'ALTERNATIVE_RECOMMENDED' && (
          <>
            {chip(
              'bg-emerald-50 text-emerald-800 ring-emerald-200',
              Check,
              `Recommended ${recommendedDoctorName ?? 'a doctor'}${recommendedAt ? ` ${timeAgo(recommendedAt)}` : ''}`,
            )}
            <button type="button" onClick={() => setOpen('recommend')} className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}>
              <UserRoundSearch className="h-4 w-4" /> Find Another Doctor
            </button>
          </>
        )}
        {stage === 'AWAITING_DOCTOR_APPROVAL' && (
          <>
            {chip(
              'bg-sky-50 text-sky-800 ring-sky-200',
              Hourglass,
              `Requested ${requestedDoctorName ?? 'a doctor'}${requestedAt ? ` ${timeAgo(requestedAt)}` : ''} · waiting for the doctor's approval`,
            )}
            {withdrawing === null ? (
              <button
                type="button"
                onClick={() => setWithdrawing('confirm')}
                className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`}
              >
                <Undo2 className="h-4 w-4" /> Withdraw Request
              </button>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-700 ring-1 ring-slate-200">
                Withdraw the request{requestedAppointmentNum ? ` ${requestedAppointmentNum}` : ''}?
                <button type="button" onClick={withdraw} disabled={withdrawing === 'busy'} className={`${btn} bg-rose-600 px-2.5 py-1 text-white hover:bg-rose-700`}>
                  {withdrawing === 'busy' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />} Yes, Withdraw
                </button>
                <button type="button" onClick={() => setWithdrawing(null)} disabled={withdrawing === 'busy'} className="font-semibold text-slate-600 hover:underline">
                  Keep Waiting
                </button>
              </span>
            )}
          </>
        )}
        {stage === 'REASSIGNED' &&
          chip(
            'bg-emerald-50 text-emerald-800 ring-emerald-200',
            CalendarCheck2,
            `${requestedDoctorName ?? 'The new doctor'} approved${requestedAppointmentNum ? ` · new appointment ${requestedAppointmentNum}` : ''} · patient notified`,
          )}
        {withdrawError && (
          <span className="text-xs font-medium text-rose-700" role="alert">
            {withdrawError}
          </span>
        )}
      </div>

      {open === 'notify' && (
        <NotifyPatientModal
          appointmentId={appointmentId}
          onClose={() => setOpen(null)}
          onDone={(m) => {
            setOpen(null);
            onDone(m);
          }}
        />
      )}
      {open === 'recommend' && (
        <RecommendDoctorModal
          appointmentId={appointmentId}
          onClose={() => setOpen(null)}
          onDone={(m) => {
            setOpen(null);
            onDone(m);
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal frame
// ---------------------------------------------------------------------------

function ModalShell({
  title,
  subtitle,
  label,
  onClose,
  busy,
  footer,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  label: string;
  onClose: () => void;
  busy: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !busy && onClose()} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        <div className="border-t border-slate-100 px-6 py-4">{footer}</div>
      </div>
    </div>
  );
}

function NoteField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
        <span>
          {label} <span className="font-normal text-slate-400">(optional)</span>
        </span>
        <span className="font-normal text-slate-400">
          {value.length}/{NOTE_MAX}
        </span>
      </label>
      <textarea
        id={id}
        rows={2}
        maxLength={NOTE_MAX}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>
  );
}

function Footer({ onClose, busy, error, disabled, onSubmit, label }: { onClose: () => void; busy: boolean; error: string | null; disabled: boolean; onSubmit: () => void; label: string }) {
  return (
    <>
      {error && (
        <p className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || busy}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {label}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Notify Patient of Proposed Slot
// ---------------------------------------------------------------------------

function NotifyPatientModal({ appointmentId, onClose, onDone }: { appointmentId: string; onClose: () => void; onDone: (m: string) => void }) {
  const [info, setInfo] = useState<ResolutionSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchResolution(appointmentId)
      .then((d) => !cancelled && setInfo(d))
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Could not load the appointment.'));
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await forwardRescheduleToPatient(appointmentId, note.trim() || undefined);
      onDone(`The proposed time was sent to ${info?.patientName ?? 'the patient'}. You'll be notified when they reply.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not notify the patient.');
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Notify Patient of Proposed Slot"
      subtitle={info ? `${info.appointmentNum} · ${info.patientName}` : undefined}
      label="Notify patient of proposed slot"
      onClose={onClose}
      busy={busy}
      footer={<Footer onClose={onClose} busy={busy} error={error} disabled={!info || info.stage === 'AWAITING_DOCTOR'} onSubmit={submit} label="Notify Patient" />}
    >
      {loadError ? (
        <p className="text-sm text-rose-700">{loadError}</p>
      ) : !info ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading the doctor&apos;s proposal…
        </p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Doctor</dt>
              <dd className="text-slate-900">{info.doctorName}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Patient</dt>
              <dd className="text-slate-900">{info.patientName}</dd>
            </div>
            <div className="col-span-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Proposed new time</dt>
              <dd className="mt-0.5 text-base font-semibold text-violet-950">
                {appointmentDay(info.appointmentDate, true)}, {displayTime(info.startTime)}
              </dd>
              <dd className="text-xs text-violet-800">{MODE_LABELS[info.serviceMode]}</dd>
            </div>
          </dl>
          {info.reason && (
            <blockquote className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-semibold text-slate-900">Doctor&apos;s reason: </span>
                {info.reason}
              </span>
            </blockquote>
          )}
          {info.stage === 'AWAITING_DOCTOR' && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              The patient has already picked another time. Wait for the doctor to accept it.
            </p>
          )}
          <NoteField
            id="forward-note"
            label="Message to the patient"
            value={note}
            onChange={setNote}
            placeholder="e.g. We're sorry for the change. Reply here if you need help choosing."
          />
          <p className="text-xs text-slate-500">
            The patient will see the doctor&apos;s name, reason and the new time, and can approve it, pick another time with the same doctor, or ask for a different doctor.
          </p>
        </div>
      )}
    </ModalShell>
  );
}

// ---------------------------------------------------------------------------
// Find / Recommend Alternative Doctor
// ---------------------------------------------------------------------------

type TimeWindow = 'any' | 'original' | 'free' | 'morning' | 'afternoon' | 'evening';

const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: 'any', label: 'Any availability' },
  { value: 'original', label: 'Free at the original time' },
  { value: 'free', label: 'Any free time that day' },
  { value: 'morning', label: 'Morning (before 12 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 5 PM)' },
  { value: 'evening', label: 'Evening (after 5 PM)' },
];

const EXPERIENCE_OPTIONS = [0, 3, 5, 10, 15];

/** "03:30 PM" -> minutes since midnight */
function minutesOf(t: string) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(t.trim());
  if (!m) return -1;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}

function inWindow(slot: string, w: TimeWindow) {
  const min = minutesOf(slot);
  if (w === 'morning') return min >= 0 && min < 12 * 60;
  if (w === 'afternoon') return min >= 12 * 60 && min < 17 * 60;
  if (w === 'evening') return min >= 17 * 60;
  return true;
}

/** "Bilal Shah" -> "Dr. Bilal Shah" (keeps an existing title) */
const drName = (name: string) => (/^(dr|prof|professor)\.?\s/i.test(name.trim()) ? name.trim() : `Dr. ${name.trim()}`);

const dayLabel = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const fieldLabel = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500';
const fieldInput =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

function RecommendDoctorModal({ appointmentId, onClose, onDone }: { appointmentId: string; onClose: () => void; onDone: (m: string) => void }) {
  const [data, setData] = useState<AlternativeDoctorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters (date and consultation type are answered by the API, the rest here)
  const [date, setDate] = useState<string | null>(null);
  const [sameMode, setSameMode] = useState(true);
  const [sameSpeciality, setSameSpeciality] = useState(true);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('any');
  const [feeMin, setFeeMin] = useState('');
  const [feeMax, setFeeMax] = useState('');
  const [minExperience, setMinExperience] = useState(0);
  const [search, setSearch] = useState('');
  const [initialised, setInitialised] = useState(false);

  const [choice, setChoice] = useState<string | null>(null);
  /** start time picked for the chosen doctor, and the clinic (in-clinic visits with more than one) */
  const [time, setTime] = useState<string | null>(null);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchAlternativeDoctors(appointmentId, { date: date ?? undefined, modes: sameMode ? 'same' : 'all' })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        if (!initialised) {
          // First load: the fee range starts at the original fee ±20%
          setInitialised(true);
          setDate(d.date);
          setFeeMin(String(d.feeRange.min));
          setFeeMax(String(d.feeRange.max));
          // Nothing of the same speciality: start with every speciality
          if (!d.doctors.some((x) => x.matchesSpeciality)) setSameSpeciality(false);
        }
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Could not load doctors.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // `initialised` only guards the first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, date, sameMode]);

  const list = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const min = feeMin.trim() === '' ? null : Number(feeMin);
    const max = feeMax.trim() === '' ? null : Number(feeMax);
    return data.doctors.filter((d) => {
      if (sameMode && !d.offersSameMode) return false;
      if (sameSpeciality && !d.matchesSpeciality) return false;
      if (d.experienceYears < minExperience) return false;
      if ((min != null && Number.isFinite(min)) || (max != null && Number.isFinite(max))) {
        const ok = d.fees.some((f) => (min == null || f.fee >= min) && (max == null || f.fee <= max));
        if (!ok) return false;
      }
      if (timeWindow === 'original' && !d.freeSlots.includes(data.originalTime)) return false;
      if (timeWindow === 'free' && d.freeSlots.length === 0) return false;
      if ((timeWindow === 'morning' || timeWindow === 'afternoon' || timeWindow === 'evening') && !d.freeSlots.some((t) => inWindow(t, timeWindow))) {
        return false;
      }
      if (q && !d.fullName.toLowerCase().includes(q) && !d.pmdcNumber.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, sameMode, sameSpeciality, minExperience, feeMin, feeMax, timeWindow, search]);

  // Keep the choice only while it is visible
  useEffect(() => {
    if (choice && !list.some((d) => d.doctorId === choice)) setChoice(null);
  }, [list, choice]);

  const a = data?.appointment;
  const patientAsked = !!a?.alternativeRequestedAt;
  const chosen = data?.doctors.find((x) => x.doctorId === choice) ?? null;

  // Times the chosen doctor is free (inside the time filter); the original time first when free
  const chosenTimes = useMemo(() => {
    if (!chosen) return [];
    const inFilter = timeWindow === 'morning' || timeWindow === 'afternoon' || timeWindow === 'evening'
      ? chosen.freeSlots.filter((t) => inWindow(t, timeWindow))
      : timeWindow === 'original' && data
        ? chosen.freeSlots.filter((t) => t === data.originalTime)
        : chosen.freeSlots;
    return inFilter;
  }, [chosen, timeWindow, data]);
  const clinicsAtTime = chosen && time ? chosen.freeTimes.filter((f) => f.startTime === time && f.clinicId) : [];

  // A new doctor or day: pick the original time if it is free, otherwise the first free time
  useEffect(() => {
    if (!chosen || !data) {
      setTime(null);
      return;
    }
    setTime((t) => (t && chosenTimes.includes(t) ? t : chosenTimes.includes(data.originalTime) ? data.originalTime : chosenTimes[0] ?? null));
  }, [chosen, chosenTimes, data]);
  useEffect(() => {
    setClinicId((c) => (c && clinicsAtTime.some((x) => x.clinicId === c) ? c : clinicsAtTime[0]?.clinicId ?? null));
    // clinicsAtTime is derived from chosen + time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chosen, time]);

  const resetFilters = () => {
    if (!data) return;
    setSameSpeciality(true);
    setTimeWindow('any');
    setFeeMin(String(data.feeRange.min));
    setFeeMax(String(data.feeRange.max));
    setMinExperience(0);
    setSearch('');
  };

  const submit = async () => {
    if (!chosen || !data || !time) return;
    setBusy(true);
    setError(null);
    try {
      await requestAlternativeAppointment(appointmentId, {
        doctorId: chosen.doctorId,
        date: data.date,
        startTime: time,
        ...(chosen.serviceMode !== data.serviceMode ? { serviceMode: chosen.serviceMode } : {}),
        ...(clinicId ? { clinicId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onDone(
        `Request sent to ${drName(chosen.fullName)} for ${dayLabel(data.date)}, ${displayTime(time)}. ` +
          `${a?.patientName ?? 'The patient'} will be notified once the doctor approves it.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the request.');
      setBusy(false);
    }
  };

  const checkbox = (checked: boolean, set: (v: boolean) => void, label: string, hint?: string) => (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300" />
      {label} {hint && <span className="text-slate-400">{hint}</span>}
    </label>
  );

  return (
    <ModalShell
      title="Find Alternative Doctor"
      subtitle={a ? `${a.appointmentNum} · ${a.patientName} · was with ${a.doctorName}` : undefined}
      label="Find alternative doctor"
      onClose={onClose}
      busy={busy}
      wide
      footer={
        <Footer
          onClose={onClose}
          busy={busy}
          error={error}
          disabled={!chosen || !time}
          onSubmit={submit}
          label={chosen ? `Request Appointment with ${drName(chosen.fullName)}` : 'Request Appointment'}
        />
      }
    >
      {loadError && !data ? (
        <p className="text-sm text-rose-700">{loadError}</p>
      ) : !data || !a ? (
        <p className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Finding matching doctors…
        </p>
      ) : (
        <div className="space-y-4">
          {a.reason && (
            <blockquote className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span>
                <span className="font-semibold text-slate-900">{patientAsked ? 'Patient' : 'Doctor'}&apos;s reason: </span>
                {a.reason}
              </span>
            </blockquote>
          )}

          {/* Filters */}
          <section aria-label="Filters" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
              </p>
              <button type="button" onClick={resetFilters} className="text-xs font-semibold text-blue-700 hover:underline">
                Reset filters
              </button>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by doctor name or PMDC number"
                aria-label="Search by doctor name or PMDC number"
                className={`${fieldInput} pl-8`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="alt-date" className={fieldLabel}>
                  Availability date
                </label>
                <input
                  id="alt-date"
                  type="date"
                  value={date ?? data.date}
                  min={data.today}
                  max={data.maxDate}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className={fieldInput}
                />
              </div>
              <div>
                <label htmlFor="alt-time" className={fieldLabel}>
                  Available time slot
                </label>
                <select id="alt-time" value={timeWindow} onChange={(e) => setTimeWindow(e.target.value as TimeWindow)} className={fieldInput}>
                  {TIME_WINDOWS.map((w) => (
                    <option key={w.value} value={w.value}>
                      {w.value === 'original' ? `Free at the original time (${displayTime(data.originalTime)})` : w.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className={fieldLabel}>Fee range (PKR)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={feeMin}
                    onChange={(e) => setFeeMin(e.target.value)}
                    placeholder="Min"
                    aria-label="Minimum fee"
                    className={fieldInput}
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={feeMax}
                    onChange={(e) => setFeeMax(e.target.value)}
                    placeholder="Max"
                    aria-label="Maximum fee"
                    className={fieldInput}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="alt-exp" className={fieldLabel}>
                  Experience
                </label>
                <select id="alt-exp" value={minExperience} onChange={(e) => setMinExperience(Number(e.target.value))} className={fieldInput}>
                  {EXPERIENCE_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y === 0 ? 'Any experience' : `${y}+ years`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {checkbox(sameMode, setSameMode, 'Same consultation type only', `(${MODE_LABELS[data.serviceMode]})`)}
              {checkbox(sameSpeciality, setSameSpeciality, 'Same speciality', data.speciality.length ? `(${data.speciality.slice(0, 2).join(', ')})` : undefined)}
              <span className="text-[11px] text-slate-500">
                Original: {pkr(data.originalFee)} · {dayLabel(data.originalDate)}, {displayTime(data.originalTime)} · suggested fee {pkr(data.feeRange.min)} –{' '}
                {pkr(data.feeRange.max)} (±20%)
              </span>
            </div>
          </section>

          <p className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
            {loading && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
            {list.length} of {data.doctors.length} approved doctors shown · free times for {dayLabel(data.date)}
          </p>

          {list.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
              {data.doctors.length === 0
                ? sameMode
                  ? 'No other approved doctor offers this consultation type. Untick "Same consultation type only" to see other doctors.'
                  : 'No other approved doctor is available.'
                : 'No doctor matches these filters. Widen the fee range, lower the experience or choose another time to see more doctors.'}
            </p>
          ) : (
            <ul className={`space-y-2 ${loading ? 'opacity-60' : ''}`} role="radiogroup" aria-label="Doctors">
              {list.map((d) => {
                const active = choice === d.doctorId;
                const shown = timeWindow === 'morning' || timeWindow === 'afternoon' || timeWindow === 'evening'
                  ? d.freeSlots.filter((t) => inWindow(t, timeWindow))
                  : d.freeSlots;
                return (
                  <li key={d.doctorId}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setChoice(d.doctorId)}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                        active ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                          {d.fullName}
                          {d.matchesSpeciality && (
                            <span className="rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">Same speciality</span>
                          )}
                          {d.withinFeeRange && (
                            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">Similar fee</span>
                          )}
                          {!d.offersSameMode && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              {MODE_LABELS[d.serviceMode]}
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {d.specialisations.slice(0, 2).join(', ') || d.title} · {d.experienceYears} yrs experience · PMDC {d.pmdcNumber}
                        </span>
                        {d.fees.length > 1 && (
                          <span className="block truncate text-xs text-slate-500">
                            {d.fees.map((f) => `${f.clinicName}: ${pkr(f.fee)}`).join(' · ')}
                          </span>
                        )}
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                          {d.availableAtOriginalTime ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                              <CalendarCheck2 className="h-3 w-3" /> Free at {displayTime(data.originalTime)}
                            </span>
                          ) : null}
                          {shown.length > 0 ? (
                            <span className="text-slate-500">
                              {shown.length} free time{shown.length === 1 ? '' : 's'} on {dayLabel(data.date)}: {shown.slice(0, 4).map(displayTime).join(', ')}
                              {shown.length > 4 ? '…' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">No free times on {dayLabel(data.date)}</span>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-sm font-semibold text-slate-900">
                        {d.fees.length > 1 && <span className="block text-[10px] font-medium text-slate-400">from</span>}
                        {pkr(d.fee)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {chosen && (
            <section aria-label="Appointment time" className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Time with {drName(chosen.fullName)} on {dayLabel(data.date)}
              </p>
              {chosenTimes.length === 0 ? (
                <p className="text-xs text-amber-800">
                  {drName(chosen.fullName)} has no free time {timeWindow === 'any' || timeWindow === 'free' ? '' : 'in the selected time slot '}on {dayLabel(data.date)}. Choose another
                  availability date or time slot.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Free times">
                  {chosenTimes.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={time === t}
                      onClick={() => setTime(t)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                        time === t ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {displayTime(t)}
                      {t === data.originalTime && <span className={`ml-1 font-normal ${time === t ? 'text-white/70' : 'text-slate-400'}`}>(original)</span>}
                    </button>
                  ))}
                </div>
              )}
              {clinicsAtTime.length > 1 && (
                <div>
                  <label htmlFor="alt-clinic" className={fieldLabel}>
                    Clinic
                  </label>
                  <select id="alt-clinic" value={clinicId ?? ''} onChange={(e) => setClinicId(e.target.value)} className={fieldInput}>
                    {clinicsAtTime.map((c) => {
                      const fee = chosen.fees.find((f) => f.clinicId === c.clinicId);
                      return (
                        <option key={c.clinicId!} value={c.clinicId!}>
                          {fee?.clinicName ?? 'Clinic'}
                          {fee ? ` · ${pkr(fee.fee)}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </section>
          )}

          <NoteField
            id="recommend-note"
            label="Note for the doctor"
            value={note}
            onChange={setNote}
            placeholder="e.g. The patient's first doctor was unavailable. The patient prefers a morning time."
          />
          <p className="text-xs text-slate-500">
            {chosen ? drName(chosen.fullName) : 'The doctor'} gets this as a new request under Requests Waiting for Approval, with the patient&apos;s symptoms and voice note. The
            patient is notified only after the doctor approves it. If the doctor declines, you&apos;ll get an alert to choose another doctor.
            {chosen && !chosen.offersSameMode && ` ${chosen.fullName} does not offer ${MODE_LABELS[data.serviceMode]}, so this will be a ${MODE_LABELS[chosen.serviceMode]}.`}
          </p>
        </div>
      )}
    </ModalShell>
  );
}
