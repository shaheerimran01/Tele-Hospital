'use client';

// Admin follow-up after a doctor reschedules or declines a booking:
// "Notify Patient of Proposed Slot" and "Find Alternative Doctor" (recommend a doctor to the patient).

import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Hourglass,
  LoaderCircle,
  Quote,
  Search,
  Send,
  Stethoscope,
  UserRoundSearch,
  X,
} from 'lucide-react';
import {
  fetchAlternativeDoctors,
  fetchResolution,
  forwardRescheduleToPatient,
  recommendAlternativeDoctor,
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
  onDone,
  layout = 'row',
}: {
  appointmentId: string;
  stage: ResolutionStage | undefined;
  forwardedAt?: string | null;
  recommendedAt?: string | null;
  recommendedDoctorName?: string | null;
  /** called with a success message after an action */
  onDone: (message: string) => void;
  layout?: 'row' | 'column';
}) {
  const [open, setOpen] = useState<'notify' | 'recommend' | null>(null);
  if (!stage) return null;

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
              <UserRoundSearch className="h-4 w-4" /> Recommend Another Doctor
            </button>
          </>
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

function RecommendDoctorModal({ appointmentId, onClose, onDone }: { appointmentId: string; onClose: () => void; onDone: (m: string) => void }) {
  const [data, setData] = useState<AlternativeDoctorsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sameSpeciality, setSameSpeciality] = useState(true);
  const [inFeeRange, setInFeeRange] = useState(true);
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAlternativeDoctors(appointmentId)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        // Nothing matches both filters: start with the wider list
        if (!d.doctors.some((x) => x.matchesSpeciality && x.withinFeeRange)) {
          setSameSpeciality(d.doctors.some((x) => x.matchesSpeciality));
          setInFeeRange(false);
        }
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : 'Could not load doctors.'));
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  const list = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.doctors.filter(
      (d) =>
        (!sameSpeciality || d.matchesSpeciality) &&
        (!inFeeRange || d.withinFeeRange) &&
        (!q || d.fullName.toLowerCase().includes(q) || d.specialisations.some((s) => s.toLowerCase().includes(q))),
    );
  }, [data, sameSpeciality, inFeeRange, search]);

  // Keep the choice only while it is visible
  useEffect(() => {
    if (choice && !list.some((d) => d.doctorId === choice)) setChoice(null);
  }, [list, choice]);

  const a = data?.appointment;
  const patientAsked = !!a?.alternativeRequestedAt;
  const submitLabel = patientAsked ? 'Recommend Alternative Doctor' : 'Send Recommendation to Patient';

  const submit = async () => {
    if (!choice) return;
    setBusy(true);
    setError(null);
    try {
      await recommendAlternativeDoctor(appointmentId, choice, note.trim() || undefined);
      const d = data?.doctors.find((x) => x.doctorId === choice);
      onDone(`${d?.fullName ?? 'The doctor'} was recommended to ${a?.patientName ?? 'the patient'}. They can now book directly.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the recommendation.');
      setBusy(false);
    }
  };

  const toggle = (checked: boolean, set: (v: boolean) => void, label: string, hint: string) => (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300" />
      {label} <span className="text-slate-400">{hint}</span>
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
      footer={<Footer onClose={onClose} busy={busy} error={error} disabled={!choice} onSubmit={submit} label={submitLabel} />}
    >
      {loadError ? (
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

          <div className="flex flex-wrap items-center gap-2">
            {toggle(sameSpeciality, setSameSpeciality, 'Same speciality', data.speciality.length ? `(${data.speciality.slice(0, 2).join(', ')})` : '')}
            {toggle(inFeeRange, setInFeeRange, 'Similar fee', `(${pkr(data.feeRange.min)} – ${pkr(data.feeRange.max)})`)}
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or speciality"
                aria-label="Search doctors"
                className="w-full rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {MODE_LABELS[data.serviceMode]} · original fee {pkr(data.originalFee)} · {list.length} of {data.doctors.length} approved doctors shown
          </p>

          {list.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-600">
              {data.doctors.length === 0
                ? 'No other approved doctor offers this consultation type.'
                : 'No doctor matches these filters. Untick a filter to see more doctors.'}
            </p>
          ) : (
            <ul className="space-y-2" role="radiogroup" aria-label="Doctors">
              {list.map((d) => {
                const active = choice === d.doctorId;
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
                        </span>
                        <span className="block text-xs text-slate-500">
                          {d.specialisations.slice(0, 2).join(', ') || d.title} · {d.experienceYears} yrs experience
                        </span>
                        {d.fees.length > 1 && (
                          <span className="block truncate text-xs text-slate-500">
                            {d.fees.map((f) => `${f.clinicName}: ${pkr(f.fee)}`).join(' · ')}
                          </span>
                        )}
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

          <NoteField
            id="recommend-note"
            label="Message to the patient"
            value={note}
            onChange={setNote}
            placeholder="e.g. Dr. Sara is highly rated for this condition and has slots this week."
          />
          <p className="text-xs text-slate-500">
            The patient gets the doctor&apos;s name, speciality and fee with a button to book directly. Their symptoms and voice note carry over to the new booking.
          </p>
        </div>
      )}
    </ModalShell>
  );
}
