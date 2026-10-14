'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, CircleAlert, LoaderCircle, Lock, RefreshCw } from 'lucide-react';
import { readPatientSession, openPatientLogin, type PatientSession } from '@/app/lib/patient-session';
import type { DoctorProfile } from '@/app/lib/api/doctors';
import {
  getFamilyMembersApi,
  getIntakeApi,
  relationLabel,
  type ConsultationIntake,
  type FamilyMember,
  type PatientType,
} from '@/app/lib/api/consultation';
import {
  AppointmentApiError,
  createAppointmentApi,
  getAvailableSlotsApi,
  getDoctorForBookingApi,
  type Appointment,
} from '@/app/lib/api/appointments';
import SlotPicker, { type SlotsState } from './SlotPicker';
import PatientSelector from './PatientSelector';
import BookingSummaryCard from './BookingSummaryCard';
import BookingSuccessModal from './BookingSuccessModal';
import {
  initialOption,
  serviceOptions,
  toPaymentMethod,
  upcomingDates,
  type PaymentChoice,
  type ServiceOption,
} from './booking-model';

const EMPTY_SLOTS: SlotsState = { loading: false, error: null, slots: [] };

export default function BookingFlow() {
  const params = useSearchParams();
  const doctorId = params.get('doctorId');
  const intakeId = params.get('intakeId') || null;
  const modeParam = params.get('mode');
  const clinicParam = params.get('clinicId');

  // --- Patient session (same storage as the rest of the site) ---
  const [user, setUser] = useState<PatientSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  useEffect(() => {
    const sync = () => {
      const next = readPatientSession();
      setUser((prev) => (prev && next && prev.id === next.id && prev.name === next.name ? prev : next));
      setAuthChecked(true);
    };
    sync();
    window.addEventListener('auth_state_change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('auth_state_change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  // --- Doctor ---
  const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [doctorReload, setDoctorReload] = useState(0);
  useEffect(() => {
    if (!doctorId) return;
    const controller = new AbortController();
    setDoctorError(null);
    getDoctorForBookingApi(doctorId, controller.signal)
      .then(setDoctor)
      .catch((err) => {
        if (err.name !== 'AbortError') setDoctorError(err.message);
      });
    return () => controller.abort();
  }, [doctorId, doctorReload]);

  const options = useMemo(() => (doctor ? serviceOptions(doctor) : []), [doctor]);
  const [option, setOption] = useState<ServiceOption | null>(null);
  useEffect(() => {
    if (options.length && !option) setOption(initialOption(options, modeParam, clinicParam));
  }, [options, option, modeParam, clinicParam]);

  // --- Dates & slots ---
  const dates = useMemo(() => upcomingDates(), []);
  const [date, setDate] = useState<string | null>(null);
  const [slotsState, setSlotsState] = useState<SlotsState>(EMPTY_SLOTS);
  const [slot, setSlot] = useState<string | null>(null);
  const [slotsReload, setSlotsReload] = useState(0);

  // First working day whenever the consultation type changes
  useEffect(() => {
    if (!option) return;
    setDate(dates.find((d) => option.workingDays.includes(d.dayName))?.iso ?? null);
    setSlot(null);
  }, [option, dates]);

  useEffect(() => {
    if (!doctorId || !option || !date) {
      setSlotsState(EMPTY_SLOTS);
      return;
    }
    const controller = new AbortController();
    setSlotsState({ loading: true, error: null, slots: [] });
    getAvailableSlotsApi(
      { doctorId, serviceMode: option.mode, clinicId: option.clinicId, date },
      controller.signal,
    )
      .then((res) => {
        setSlotsState({ loading: false, error: null, slots: res.slots });
        // Keep the chosen time only if it's still free
        setSlot((current) => (current && res.slots.some((s) => s.startTime === current) ? current : null));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setSlotsState({ loading: false, error: err.message, slots: [] });
      });
    return () => controller.abort();
  }, [doctorId, option, date, slotsReload]);

  const nextWorkingDay = useMemo(() => {
    if (!option || !date) return null;
    const idx = dates.findIndex((d) => d.iso === date);
    return dates.slice(idx + 1).find((d) => option.workingDays.includes(d.dayName)) ?? null;
  }, [option, date, dates]);

  // --- Intake (symptoms) and patient ---
  const [intake, setIntake] = useState<ConsultationIntake | null>(null);
  const [patientType, setPatientType] = useState<PatientType>('SELF');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setMembersLoading(true);
    setMembersError(null);
    getFamilyMembersApi(user.id)
      .then((list) => !cancelled && setMembers(list))
      .catch((err) => !cancelled && setMembersError(err.message))
      .finally(() => !cancelled && setMembersLoading(false));

    if (intakeId) {
      getIntakeApi(user.id, intakeId)
        .then((data) => {
          if (cancelled) return;
          setIntake(data);
          // Book for the same person the symptoms were entered for
          setPatientType(data.patientType);
          if (data.patientType === 'FAMILY_MEMBER' && data.familyMemberId) setMemberId(data.familyMemberId);
        })
        .catch(() => !cancelled && setIntake(null));
    }
    return () => {
      cancelled = true;
    };
  }, [user, intakeId]);

  // --- Payment ---
  const [payment, setPayment] = useState<PaymentChoice>('COD');
  const [wallet, setWallet] = useState<'JAZZCASH' | 'EASYPAISA'>('JAZZCASH');
  useEffect(() => {
    if (!option) return;
    setPayment((p) => (option.mode !== 'IN_CLINIC' && p === 'COD' ? 'WALLET' : option.mode === 'IN_CLINIC' ? 'COD' : p));
  }, [option]);

  // --- Submit ---
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const selectedSlot = slotsState.slots.find((s) => s.startTime === slot) ?? null;
  const missing = [
    ...(!selectedSlot ? ['a date and time'] : []),
    ...(patientType === 'FAMILY_MEMBER' && !memberId ? ['a family member'] : []),
  ];

  const selectedMember = members.find((m) => m.id === memberId) ?? null;
  const patientLabel =
    patientType === 'SELF'
      ? user
        ? `${user.name} (you)`
        : null
      : selectedMember
        ? `${selectedMember.fullName} · ${relationLabel(selectedMember.relation)}`
        : null;

  const confirm = useCallback(async () => {
    if (!user || !doctor || !option || !date || submitting) return;
    if (missing.length > 0 || !selectedSlot) {
      setShowErrors(true);
      setSubmitError(null);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const appointment = await createAppointmentApi(user.id, {
        doctorId: doctor.id,
        clinicId: option.clinicId ?? undefined,
        intakeId: intakeId ?? undefined,
        patientType,
        familyMemberId: patientType === 'FAMILY_MEMBER' ? memberId ?? undefined : undefined,
        serviceMode: option.mode,
        appointmentDate: date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        paymentMethod: toPaymentMethod(payment, wallet),
      });
      setBooked(appointment);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setSubmitError(message);
      // Someone else took the slot: refresh the times so the patient can pick again
      if (err instanceof AppointmentApiError && err.status === 409 && /slot|time/i.test(message)) {
        setSlot(null);
        setShowErrors(false);
        setSlotsReload((n) => n + 1);
      }
    } finally {
      setSubmitting(false);
    }
  }, [user, doctor, option, date, submitting, missing.length, selectedSlot, intakeId, patientType, memberId, payment, wallet]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!doctorId) {
    return (
      <Message
        title="Choose a doctor first"
        text="Open the doctors list and press “Book Consultation” on the doctor you want to see."
        action={<Link href="/consult-doctors/intake" className={primaryBtn}>Start a consultation</Link>}
      />
    );
  }

  if (!authChecked) return <Loading text="Loading…" />;

  if (!user) {
    return (
      <Message
        icon={<Lock className="h-6 w-6" />}
        title="Log in to book an appointment"
        text="We need your account to save the booking and send you updates."
        action={
          <button type="button" onClick={openPatientLogin} className={primaryBtn}>
            Log in to continue
          </button>
        }
      />
    );
  }

  if (doctorError) {
    return (
      <Message
        icon={<CircleAlert className="h-6 w-6" />}
        title="We couldn't load this doctor"
        text={doctorError}
        action={
          <button type="button" onClick={() => setDoctorReload((n) => n + 1)} className={primaryBtn}>
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        }
      />
    );
  }

  if (!doctor || (options.length > 0 && !option)) return <Loading text="Loading the doctor's schedule…" />;

  const backToList = intakeId ? `/consult-doctors/doctors-list?intakeId=${encodeURIComponent(intakeId)}` : '/consult-doctors';

  if (doctor.status !== 'APPROVED' || options.length === 0 || !option) {
    return (
      <Message
        icon={<CircleAlert className="h-6 w-6" />}
        title="This doctor isn't taking bookings right now"
        text={
          doctor.status !== 'APPROVED'
            ? `${doctor.fullName}'s profile is still being verified. Please choose another doctor.`
            : `${doctor.fullName} hasn't set up any consultation types yet.`
        }
        action={<Link href={backToList} className={primaryBtn}>Choose another doctor</Link>}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">Consult doctors</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={backToList} className="hover:text-[#ff6f61]">Choose a doctor</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-800">Book appointment</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Book an appointment</h1>
        <p className="mt-1 text-sm text-gray-500">
          With {doctor.fullName} · {doctor.specialisations[0] ?? doctor.title}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-7 xl:col-span-8">
          <SlotPicker
            options={options}
            option={option}
            onOptionChange={(o) => {
              setOption(o);
              setSubmitError(null);
            }}
            dates={dates}
            date={date}
            onDateChange={(iso) => {
              setDate(iso);
              setSlot(null);
            }}
            state={slotsState}
            slot={slot}
            onSlotChange={(s) => {
              setSlot(s);
              setSubmitError(null);
            }}
            onRetry={() => setSlotsReload((n) => n + 1)}
            nextWorkingDay={nextWorkingDay}
            showError={showErrors}
          />

          <PatientSelector
            userId={user.id}
            userName={user.name}
            userPhone={user.phone ?? null}
            patientType={patientType}
            onPatientTypeChange={setPatientType}
            members={members}
            membersLoading={membersLoading}
            membersError={membersError}
            selectedMemberId={memberId}
            onSelectMember={setMemberId}
            onMemberCreated={(m) => {
              setMembers((prev) => [...prev, m]);
              setMemberId(m.id);
            }}
            showError={showErrors}
            lockedHint={
              intake
                ? `Your symptoms were entered for ${
                    intake.patientType === 'SELF'
                      ? 'yourself'
                      : members.find((m) => m.id === intake.familyMemberId)?.fullName ?? 'a family member'
                  }.`
                : null
            }
          />
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <BookingSummaryCard
            doctor={doctor}
            option={option}
            date={date}
            slot={selectedSlot}
            patientLabel={patientLabel}
            reason={intake?.symptoms ?? []}
            payment={payment}
            onPaymentChange={setPayment}
            wallet={wallet}
            onWalletChange={setWallet}
            missing={missing}
            showErrors={showErrors}
            submitting={submitting}
            error={submitError}
            onConfirm={confirm}
          />
        </div>
      </div>

      {booked && <BookingSuccessModal appointment={booked} />}
    </div>
  );
}

const primaryBtn =
  'mt-5 inline-flex items-center gap-2 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#e8453b]';

function Loading({ text }: { text: string }) {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> {text}
    </div>
  );
}

function Message({
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">{icon}</span>
      )}
      <h1 className="mt-4 text-lg font-bold text-gray-900">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{text}</p>
      {action}
    </div>
  );
}
