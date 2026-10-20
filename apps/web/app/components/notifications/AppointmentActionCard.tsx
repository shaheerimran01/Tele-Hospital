'use client';

// Shown inside a patient's notification when the doctor proposed a new time
// or the Tabibistan team recommended another doctor.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  CalendarSearch,
  CircleCheck,
  Headset,
  ListFilter,
  Hourglass,
  LoaderCircle,
  Stethoscope,
  UserRoundSearch,
  X,
} from 'lucide-react';
import {
  browseDoctorsHref,
  getAvailableSlotsApi,
  recommendedBookingHref,
  respondToRescheduleApi,
  type PendingAppointmentAction,
} from '@/app/lib/api/appointments';

const MODE_LABEL: Record<string, string> = {
  IN_CLINIC: 'In-clinic visit',
  VIDEO: 'Video call',
  TEXT: 'Text consultation',
};
const NOTE_MAX = 500;
const MAX_DAYS_AHEAD = 60;

/** "Thu, 22 Oct 2026" (dates are stored at UTC midnight) */
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const displayTime = (t: string) => t.replace(/^0(\d)/, '$1');
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString('en-PK')}`;
const doctorName = (n: string) => (/^(dr|prof)\.?\s/i.test(n.trim()) ? n.trim() : `Dr. ${n.trim()}`);

function localIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const primaryBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#ff6f61] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#e85b4d] disabled:cursor-not-allowed disabled:opacity-50';
const outlineBtn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50';

type Step = 'main' | 'choose' | 'pick' | 'other-doctor';

export default function AppointmentActionCard({
  userId,
  action,
  onChanged,
}: {
  userId: string;
  action: PendingAppointmentAction;
  /** reload the list after the patient replied */
  onChanged: () => void;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('main');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const dr = doctorName(action.doctor.fullName);
  const when = `${formatDay(action.appointmentDate)} · ${displayTime(action.startTime)}`;

  const reply = async (body: Parameters<typeof respondToRescheduleApi>[2]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await respondToRescheduleApi(userId, action.appointmentId, body);
      // "Choose Doctor by Yourself": straight to the doctor list with the same speciality and consultation type
      if (res.browse) {
        setDone(`${res.message} Opening the doctor list…`);
        router.push(browseDoctorsHref(res.browse));
        return;
      }
      setDone(res.message);
      setStep('main');
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send your reply. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const frame = (children: React.ReactNode) => (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4" data-appointment-action={action.appointmentNum}>
      {children}
    </div>
  );

  if (done) {
    return frame(
      <p className="flex items-start gap-2 text-xs font-semibold text-emerald-700" role="status">
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {done}
      </p>,
    );
  }

  // --- Waiting states ------------------------------------------------------
  if (action.stage === 'AWAITING_DOCTOR') {
    return frame(
      <p className="flex items-start gap-2 text-xs text-gray-700">
        <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <span>
          You asked for <span className="font-bold text-gray-900">{when}</span>. Waiting for {dr} to confirm this time.
        </span>
      </p>,
    );
  }

  if (action.stage === 'AWAITING_RECOMMENDATION') {
    return frame(
      <p className="flex items-start gap-2 text-xs text-gray-700">
        <UserRoundSearch className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <span>Our team is finding another doctor for you. We will notify you as soon as a doctor confirms your appointment.</span>
      </p>,
    );
  }

  // --- Recommended doctor ---------------------------------------------------
  if (action.stage === 'ALTERNATIVE_RECOMMENDED') {
    const r = action.recommendation;
    if (!r) return null;
    const name = doctorName(r.doctor.fullName);
    return frame(
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff1ef] text-[#ff6f61]">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Recommended doctor</p>
            <p className="text-sm font-bold text-gray-900">{name}</p>
            <p className="text-xs text-gray-600">
              {r.doctor.specialisations.slice(0, 2).join(', ') || r.doctor.title} · {r.doctor.experienceYears} yrs experience
            </p>
            <p className="text-xs text-gray-600">
              {MODE_LABEL[r.serviceMode] ?? 'Consultation'}
              {r.fee != null && ` · ${r.feeVaries ? 'from ' : ''}${pkr(r.fee)}`}
            </p>
          </div>
        </div>
        {r.bookedAppointment ? (
          <Link href="/consult-doctors/my-appointments" className={`${outlineBtn} shrink-0`}>
            <CalendarCheck className="h-4 w-4 text-emerald-600" /> Booked ({r.bookedAppointment.appointmentNum})
          </Link>
        ) : r.available ? (
          <Link href={recommendedBookingHref(r.booking)} className={`${primaryBtn} shrink-0`}>
            Book Appointment with Recommended Doctor <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <p className="text-xs text-gray-500">This doctor is not taking bookings right now. Our team will contact you.</p>
        )}
      </div>,
    );
  }

  // --- RESCHEDULE_PROPOSED ------------------------------------------------
  return frame(
    <>
      {step === 'main' && (
        <>
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Proposed new time</p>
              <p className="text-sm font-bold text-gray-900">{when}</p>
              <p className="text-xs text-gray-600">
                {dr} · {MODE_LABEL[action.serviceMode] ?? 'Consultation'}
                {action.clinicName ? ` · ${action.clinicName}` : ''}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button type="button" disabled={busy} onClick={() => reply({ action: 'ACCEPT' })} className={primaryBtn}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />} Approve Proposed Slot
            </button>
            <button type="button" disabled={busy} onClick={() => setStep('choose')} className={outlineBtn}>
              <X className="h-4 w-4" /> Decline Proposed Slot
            </button>
          </div>
        </>
      )}

      {(step === 'choose' || step === 'other-doctor') && (
        <>
          <p className="text-xs font-bold text-gray-900">What would you like to do instead?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setStep('pick')}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:border-[#ff6f61] hover:bg-[#fff7f6]"
            >
              <CalendarSearch className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6f61]" />
              <span>
                <span className="block text-xs font-bold text-gray-900">Pick Another Slot with Same Doctor</span>
                <span className="block text-[11px] text-gray-500">Choose a time that suits you. {dr} will confirm it.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStep('other-doctor')}
              className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 text-left transition hover:border-[#ff6f61] hover:bg-[#fff7f6]"
            >
              <UserRoundSearch className="mt-0.5 h-5 w-5 shrink-0 text-[#ff6f61]" />
              <span>
                <span className="block text-xs font-bold text-gray-900">Request Different Doctor</span>
                <span className="block text-[11px] text-gray-500">Let our team choose, or pick another doctor yourself.</span>
              </span>
            </button>
          </div>
          <button type="button" onClick={() => setStep('main')} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
        </>
      )}

      {step === 'pick' && (
        <SlotPickerStep
          action={action}
          busy={busy}
          onBack={() => setStep('choose')}
          onSubmit={(date, startTime, note) => reply({ action: 'PROPOSE_SLOT', date, startTime, note: note || undefined })}
        />
      )}

      {step === 'other-doctor' && (
        <DifferentDoctorModal
          busy={busy}
          error={error}
          doctor={dr}
          appointmentNum={action.appointmentNum}
          modeLabel={MODE_LABEL[action.serviceMode] ?? 'consultation'}
          onClose={() => {
            setError(null);
            setStep('choose');
          }}
          onAdminChoose={(note) => reply({ action: 'REQUEST_NEW_DOCTOR', note: note || undefined })}
          onChooseMyself={() => reply({ action: 'CHOOSE_OWN_DOCTOR' })}
        />
      )}

      {error && step !== 'other-doctor' && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </>,
  );
}

function NoteBox({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="mt-3">
      <label htmlFor={id} className="mb-1 flex justify-between text-[11px] font-semibold text-gray-600">
        <span>
          Note <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <span className="font-normal text-gray-400">
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
        className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-[#ff6f61] focus:ring-2 focus:ring-[#ff6f61]/15"
      />
    </div>
  );
}

function SlotPickerStep({
  action,
  busy,
  onBack,
  onSubmit,
}: {
  action: PendingAppointmentAction;
  busy: boolean;
  onBack: () => void;
  onSubmit: (date: string, startTime: string, note: string) => void;
}) {
  const { min, max } = useMemo(() => {
    const today = new Date();
    const last = new Date();
    last.setDate(today.getDate() + MAX_DAYS_AHEAD);
    return { min: localIso(today), max: localIso(last) };
  }, []);
  const [date, setDate] = useState(min);
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[] | null>(null);
  const [workingDays, setWorkingDays] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    setSlots(null);
    setTime(null);
    setLoadError(null);
    getAvailableSlotsApi(
      { doctorId: action.doctor.id, serviceMode: action.serviceMode, clinicId: action.clinicId, date },
      controller.signal,
    )
      .then((r) => {
        setSlots(r.slots);
        setWorkingDays(r.workingDays);
      })
      .catch((e) => {
        if ((e as Error).name !== 'AbortError') setLoadError(e instanceof Error ? e.message : 'Could not load free times.');
      });
    return () => controller.abort();
  }, [date, action.doctor.id, action.serviceMode, action.clinicId]);

  return (
    <>
      <p className="text-xs font-bold text-gray-900">Pick another time with {doctorName(action.doctor.fullName)}</p>
      <label htmlFor={`date-${action.appointmentId}`} className="mt-3 block text-[11px] font-semibold text-gray-600">
        Date
      </label>
      <input
        id={`date-${action.appointmentId}`}
        type="date"
        value={date}
        min={min}
        max={max}
        onChange={(e) => setDate(e.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-[#ff6f61] sm:w-56"
      />

      <div className="mt-3" role="radiogroup" aria-label="Available times">
        {loadError ? (
          <p className="text-xs text-red-600">{loadError}</p>
        ) : slots === null ? (
          <p className="flex items-center gap-2 text-xs text-gray-500">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading free times…
          </p>
        ) : slots.length === 0 ? (
          <p className="text-xs text-gray-500">
            No free times on this day.{workingDays.length ? ` The doctor works on ${workingDays.join(', ')}.` : ''}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => {
              const active = time === s.startTime;
              return (
                <button
                  key={s.startTime}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTime(s.startTime)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active ? 'border-[#ff6f61] bg-[#ff6f61] text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-[#ff6f61]'
                  }`}
                >
                  {displayTime(s.startTime)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <NoteBox id={`note-${action.appointmentId}`} value={note} onChange={setNote} placeholder="e.g. Evenings work best for me." />

      <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={onBack} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          type="button"
          disabled={!time || busy}
          onClick={() => time && onSubmit(date, time, note.trim())}
          className={`${primaryBtn} sm:ml-auto`}
        >
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Send Request to Doctor
        </button>
      </div>
    </>
  );
}

/**
 * "Request Different Doctor": the patient chooses who picks the new doctor.
 * - Let Admin Choose the Doctor: optional note, then the Tabibistan team recommends one
 * - Choose Doctor by Yourself: the booking is cancelled and the doctor list opens with
 *   the same speciality and consultation type
 */
function DifferentDoctorModal({
  busy,
  error,
  doctor,
  appointmentNum,
  modeLabel,
  onClose,
  onAdminChoose,
  onChooseMyself,
}: {
  busy: boolean;
  error: string | null;
  doctor: string;
  appointmentNum: string;
  modeLabel: string;
  onClose: () => void;
  onAdminChoose: (note: string) => void;
  onChooseMyself: () => void;
}) {
  const [view, setView] = useState<'choose' | 'admin' | 'self'>('choose');
  const [note, setNote] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const title =
    view === 'admin' ? 'Let Admin Choose the Doctor' : view === 'self' ? 'Choose Doctor by Yourself' : 'Request a Different Doctor';
  const back = () => (view === 'choose' ? onClose() : setView('choose'));

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`different-doctor-${appointmentNum}`}
      onClick={() => !busy && onClose()}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={`different-doctor-${appointmentNum}`} className="text-base font-bold text-gray-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Instead of {doctor} · <span className="font-mono">{appointmentNum}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {view === 'choose' && (
          <>
            <p className="mt-4 text-xs text-gray-600">How would you like to find your new doctor?</p>
            <div className="mt-3 grid gap-3">
              <button
                type="button"
                onClick={() => setView('admin')}
                className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition hover:border-[#ff6f61] hover:bg-[#fff7f6]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Headset className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">Let Admin Choose the Doctor</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Our team picks a doctor with the same speciality and a similar fee, and sends you the recommendation here.
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setView('self')}
                className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 text-left transition hover:border-[#ff6f61] hover:bg-[#fff7f6]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff1ef] text-[#ff6f61]">
                  <ListFilter className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-gray-900">Choose Doctor by Yourself</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Browse doctors yourself. The list opens with the same speciality and {modeLabel.toLowerCase()} already selected.
                  </span>
                </span>
              </button>
            </div>
          </>
        )}

        {view === 'admin' && (
          <>
            <p className="mt-4 text-xs text-gray-600">
              This appointment will be cancelled and our team will recommend another doctor with the same speciality and a similar fee. Your symptoms
              and voice note will be kept.
            </p>
            <NoteBox
              id={`admin-choose-note-${appointmentNum}`}
              value={note}
              onChange={setNote}
              placeholder="Any preferences? e.g. a female doctor, someone available this week, or a lower fee."
            />
          </>
        )}

        {view === 'self' && (
          <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            This appointment will be cancelled and the doctor list will open with the same speciality and {modeLabel.toLowerCase()} selected. Your
            symptoms and voice note will be kept for the new booking.
          </p>
        )}

        {error && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <button type="button" onClick={back} disabled={busy} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          {view === 'admin' && (
            <button type="button" disabled={busy} onClick={() => onAdminChoose(note.trim())} className={`${primaryBtn} sm:ml-auto`}>
              {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Send Request to Tabibistan Team
            </button>
          )}
          {view === 'self' && (
            <button type="button" disabled={busy} onClick={onChooseMyself} className={`${primaryBtn} sm:ml-auto`}>
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Cancel Appointment & Browse Doctors
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
