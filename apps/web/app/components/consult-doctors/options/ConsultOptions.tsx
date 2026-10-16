'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Hospital,
  LoaderCircle,
  Lock,
  MapPin,
  Stethoscope,
  User,
  Users,
  Zap,
} from 'lucide-react';
import {
  getIntakeApi,
  intakeLocationLabel,
  relationLabel,
  type ConsultationIntake,
} from '@/app/lib/api/consultation';
import { openPatientLogin, readPatientSession, type PatientSession } from '@/app/lib/patient-session';

export default function ConsultOptions() {
  const intakeId = useSearchParams().get('intakeId');
  const [user, setUser] = useState<PatientSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [intake, setIntake] = useState<ConsultationIntake | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (!user || !intakeId) return;
    let cancelled = false;
    setError(null);
    getIntakeApi(user.id, intakeId)
      .then((data) => !cancelled && setIntake(data))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [user, intakeId]);

  if (!intakeId) {
    return (
      <CenteredMessage
        title="Start with your health details"
        text="We need a few details about the patient and the problem before showing consultation options."
        action={{ href: '/consult-doctors/intake', label: 'Enter patient details' }}
      />
    );
  }

  if (!authChecked) return <Loading />;

  if (!user) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0ed] text-[#ff574d]">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-gray-900">Log in to continue</h1>
        <p className="mt-1 max-w-sm text-sm text-gray-500">Please log in to see your consultation options.</p>
        <button
          type="button"
          onClick={openPatientLogin}
          className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#e8453b]"
        >
          Log in
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <CenteredMessage
        title="We couldn't find this consultation"
        text={error}
        action={{ href: '/consult-doctors/intake', label: 'Start again' }}
      />
    );
  }

  if (!intake) return <Loading />;

  const isSelf = intake.patientType === 'SELF';
  const patientName = isSelf ? user.name : intake.familyMember?.fullName ?? 'Family member';
  const patientMeta = isSelf
    ? 'Self'
    : intake.familyMember
      ? relationLabel(intake.familyMember.relation)
      : 'Family member';
  const location = intakeLocationLabel(intake);
  const listHref = `/consult-doctors/doctors-list?intakeId=${encodeURIComponent(intake.id)}`;
  const hospitalsHref = `/hospitals?intakeId=${encodeURIComponent(intake.id)}`;

  return (
    <div className="mx-auto w-full max-w-[1000px] px-4 py-6 sm:px-6 lg:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1 text-xs text-gray-500">
        <Link href="/consult-doctors" className="hover:text-[#ff6f61]">
          Consult doctors
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/consult-doctors/intake" className="hover:text-[#ff6f61]">
          Patient details
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-gray-800">Consultation options</span>
      </nav>

      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
        How would you like to consult?
      </h1>
      <p className="mt-1 text-sm text-gray-500">Choose how you want to connect with a doctor.</p>

      {/* Intake summary */}
      <div className="mt-6 grid grid-cols-1 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <SummaryItem
          icon={isSelf ? User : Users}
          label="Patient"
          value={patientName}
          meta={patientMeta}
        />
        <SummaryItem
          icon={Stethoscope}
          label="Speciality"
          value={intake.speciality?.name ?? '—'}
          meta={intake.symptoms.slice(0, 3).join(', ')}
        />
        <SummaryItem
          icon={MapPin}
          label="Location"
          value={location ?? 'No saved address'}
          meta={location ? 'Used to find doctors and hospitals near you' : 'Doctors and hospitals will be listed without distance'}
        />
      </div>

      {/* Options */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Instant consultation: switched off for now */}
        <section
          aria-disabled="true"
          className="relative flex flex-col rounded-2xl border border-gray-200 bg-gray-50 p-6 opacity-75"
        >
          <span className="absolute right-4 top-4 rounded-full bg-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            Temporarily Unavailable
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-200 text-gray-500">
            <Zap className="h-5 w-5" />
          </span>
          <h2 className="mt-4 pr-28 text-lg font-bold text-gray-500">
            Instant Consultation (Connect in 5-10 Mins)
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">
            Quick 1-on-1 video call with the next available specialist.
          </p>
          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled
              className="w-full rounded-xl bg-gray-300 px-4 py-3 text-sm font-bold text-gray-500"
            >
              Instant Call Offline
            </button>
          </div>
        </section>

        {/* Browse doctors: recommended */}
        <section className="relative flex flex-col rounded-2xl border-2 border-[#ff6f61] bg-white p-6 shadow-[0_8px_24px_-12px_rgba(255,111,97,0.45)]">
          <span className="absolute right-4 top-4 rounded-full bg-[#ff6f61] px-2.5 py-1 text-[11px] font-semibold text-white">
            Recommended
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ed] text-[#ff574d]">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <h2 className="mt-4 pr-28 text-lg font-bold text-gray-900">Browse &amp; Choose Doctor</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Select from top verified specialists sorted by distance to your location.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
            <li>• PMDC-verified doctors only</li>
            <li>• In-clinic, video or text consultations</li>
            <li>• See fees before you book</li>
          </ul>
          <div className="mt-auto pt-6">
            <Link
              href={listHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff6f61] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#e8453b]"
            >
              View Nearby Doctors <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Browse hospitals */}
        <section className="relative flex flex-col rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-[#ff6f61]/60 hover:shadow-[0_8px_24px_-16px_rgba(255,111,97,0.45)]">
          <span className="absolute right-4 top-4 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
            Emergency info
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0ed] text-[#ff574d]">
            <Hospital className="h-5 w-5" />
          </span>
          <h2 className="mt-4 pr-28 text-lg font-bold text-gray-900">Browse Hospitals Near You</h2>
          <p className="mt-1.5 text-sm text-gray-600">
            Hospitals sorted by distance, with emergency services and directions.
          </p>
          <ul className="mt-4 space-y-1.5 text-xs text-gray-600">
            <li>• 24/7 emergency availability</li>
            <li>• Book Tabibistan doctors who practise there</li>
            <li>• One-tap directions on the map</li>
          </ul>
          <div className="mt-auto pt-6">
            <Link
              href={hospitalsHref}
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#ff6f61] bg-white px-4 py-2.5 text-sm font-bold text-[#e8453b] transition hover:bg-[#fff7f6]"
            >
              View Nearby Hospitals <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  meta,
}: {
  icon: typeof User;
  label: string;
  value: string;
  meta?: string;
}) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        <p className="truncate text-sm font-semibold text-gray-900">{value}</p>
        {meta && <p className="truncate text-xs text-gray-500">{meta}</p>}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-gray-500">
      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

function CenteredMessage({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action: { href: string; label: string };
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-lg font-bold text-gray-900">{title}</h1>
      <p className="mt-1 max-w-sm text-sm text-gray-500">{text}</p>
      <Link
        href={action.href}
        className="mt-5 rounded-xl bg-[#ff6f61] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#e8453b]"
      >
        {action.label}
      </Link>
    </div>
  );
}
