'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Building2,
  CalendarClock,
  CircleAlert,
  Clock,
  Languages,
  LoaderCircle,
  LogOut,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Stethoscope,
  Video,
} from 'lucide-react';
import {
  ApiError,
  apiFileUrl,
  getDoctorMeApi,
  type DoctorProfile,
  type TimeSlot,
} from '@/app/lib/api/doctors';
import { DOCTOR_ROUTES, useDoctorAuth } from '@/app/consult-doctors/context/DoctorAuthContext';

const STATUS_UI: Record<string, { label: string; text: string; box: string; Icon: typeof Clock }> = {
  PENDING: {
    label: 'Under review',
    text: 'Our team is verifying your PMDC details. Your profile is not visible to patients until it is approved.',
    box: 'border-[#efe1bf] bg-[#fdf6e7] text-[#7a5d1a]',
    Icon: Clock,
  },
  APPROVED: {
    label: 'Approved and live',
    text: 'Patients can now find your profile and book consultations.',
    box: 'border-[#cfe6d6] bg-[#f0f8f2] text-[#2f5e41]',
    Icon: BadgeCheck,
  },
  REJECTED: {
    label: 'Not approved',
    text: 'We could not approve your profile. Please contact Tabibistan support so we can help you fix the details.',
    box: 'border-[#f2cccc] bg-[#fdf2f2] text-[#8f2d2d]',
    Icon: CircleAlert,
  },
};

const pkr = (n?: number | null) => (n == null ? '—' : `PKR ${n.toLocaleString('en-PK')}`);

function SlotList({ slots }: { slots: TimeSlot[] }) {
  if (slots.length === 0) return <p className="text-xs text-[#8a8d99]">No timings added.</p>;
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {slots.map((s) => (
        <li key={s.id} className="flex justify-between gap-3 text-[#3a3f52]">
          <span className="font-medium">{s.dayOfWeek}</span>
          <span className="text-[#6b6f80]">
            {s.startTime} – {s.endTime}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof Clock; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#e7e2d8] bg-white px-5 py-5 sm:px-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#141b34]">
        <Icon className="h-4 w-4 text-[#8a8d99]" /> {title}
      </h2>
      {children}
    </section>
  );
}

export default function DoctorDashboard() {
  const router = useRouter();
  const { token, doctor: session, updateDoctor, logout } = useDoctorAuth();
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const me = await getDoctorMeApi(token);
      updateDoctor({ ...me.doctorRegistration, isFormFilled: me.isFormFilled });
      if (!me.isFormFilled || !me.doctor) {
        router.replace(DOCTOR_ROUTES.form);
        return;
      }
      setProfile(me.doctor);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        logout(); // guard returns the doctor to the OTP screen
        return;
      }
      setError(err instanceof ApiError ? err.messages[0] : 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [token, updateDoctor, logout, router]);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = () => {
    logout();
    router.replace(DOCTOR_ROUTES.auth);
  };

  if (loading && !profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-32 text-sm text-[#6b6f80]">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] hover:border-[#141b34]"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const status = STATUS_UI[profile.status] ?? STATUS_UI.PENDING;

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#ece9e2]">
            {profile.profilePhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apiFileUrl(profile.profilePhotoUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[#a9a59a]">
                <Stethoscope className="h-6 w-6" />
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a8873a]">Doctor dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#141b34]">{profile.fullName}</h1>
            <p className="text-sm text-[#6b6f80]">
              {profile.title} · {profile.degrees}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34]"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Status */}
      <div className={`mt-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${status.box}`}>
        <status.Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{status.label}</p>
          <p className="mt-0.5 text-sm opacity-90">{status.text}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card title="Profile" icon={Stethoscope}>
          <dl className="space-y-2.5 text-sm">
            {[
              ['PMDC number', profile.pmdcNumber],
              ['Experience', `${profile.experienceYears} ${profile.experienceYears === 1 ? 'year' : 'years'}`],
              ['Phone', session?.phone ?? profile.phone],
              ['Email', profile.email || '—'],
              ['Education', profile.education || '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-[#8a8d99]">{k}</dt>
                <dd className="text-right text-[#141b34]">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {profile.specialisations.map((s) => (
              <span key={s} className="rounded-full bg-[#f3f1ec] px-2.5 py-1 text-xs text-[#3a3f52]">
                {s}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-[#6b6f80]">
            <Languages className="h-3.5 w-3.5" /> {profile.languages.join(', ')}
          </p>
        </Card>

        <Card title="Online consultations" icon={CalendarClock}>
          <div className="space-y-2 text-sm">
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#3a3f52]">
                <Video className="h-4 w-4 text-[#8a8d99]" /> Video call
              </span>
              <span className={profile.isVideoCallEnabled ? 'text-[#141b34]' : 'text-[#a9a59a]'}>
                {profile.isVideoCallEnabled ? pkr(profile.videoCallFee) : 'Off'}
              </span>
            </p>
            <p className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[#3a3f52]">
                <MessageSquareText className="h-4 w-4 text-[#8a8d99]" /> Text appointment
              </span>
              <span className={profile.isTextConsultEnabled ? 'text-[#141b34]' : 'text-[#a9a59a]'}>
                {profile.isTextConsultEnabled ? pkr(profile.textConsultFee) : 'Off'}
              </span>
            </p>
          </div>
          {(profile.isVideoCallEnabled || profile.isTextConsultEnabled) && (
            <div className="mt-4 border-t border-[#efece5] pt-4">
              <p className="mb-2 text-xs font-medium text-[#6b6f80]">Weekly hours</p>
              <SlotList slots={profile.onlineAvailabilities} />
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5">
        <Card title={`Clinics (${profile.clinics.length})`} icon={Building2}>
          {profile.clinics.length === 0 ? (
            <p className="text-sm text-[#8a8d99]">You consult online only.</p>
          ) : (
            <div className="space-y-4">
              {profile.clinics.map((c) => (
                <div key={c.id} className="rounded-xl border border-[#efece5] bg-[#faf8f3] px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[#141b34]">{c.name}</p>
                    <p className="text-sm text-[#141b34]">{pkr(c.inPersonFee)}</p>
                  </div>
                  <p className="mt-1 flex items-start gap-1.5 text-xs text-[#6b6f80]">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {c.address}
                  </p>
                  <div className="mt-3">
                    <SlotList slots={c.schedules} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="mt-6 text-center text-xs text-[#8a8d99]">
        Need to change your profile? Contact Tabibistan support. Editing from the dashboard is coming soon.
      </p>
    </div>
  );
}
