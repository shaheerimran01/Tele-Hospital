'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, LoaderCircle, Menu, RefreshCw, Stethoscope, X } from 'lucide-react';
import { ApiError, getDoctorMeApi, type DoctorProfile } from '@/app/lib/api/doctors';
import { DOCTOR_ROUTES, useDoctorAuth } from '@/app/consult-doctors/context/DoctorAuthContext';
import Sidebar, { type DashboardView } from './Sidebar';
import DashboardHome from './DashboardHome';
import {
  AppointmentsView,
  AvailabilityView,
  ClinicsInfoView,
  EarningsView,
  OnlineConsultationsView,
  PatientsView,
  PersonalInfoView,
} from './DashboardViews';
import { BlockTimeModal, RescheduleModal } from './DashboardModals';
import { modeLabel, type AppointmentAction } from './AppointmentTable';
import {
  buildSampleAppointments,
  deriveDashboard,
  doctorDisplayName,
  formatDay,
  formatTime,
  greetingFor,
  pkr,
  relativeDay,
  type AppointmentStatus,
  type BlockedTime,
  type DashboardAppointment,
} from './dashboard-data';

interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

const VIEW_TITLES: Record<DashboardView, string> = {
  dashboard: 'Dashboard',
  patients: 'Patients',
  appointments: 'Appointments',
  availability: 'Availability',
  earnings: 'Earnings',
  personal: 'Personal Info',
  clinics: 'Clinics Info',
  online: 'Online Consultations',
};

export default function DoctorDashboard() {
  const router = useRouter();
  const { token, doctor: session, updateDoctor, logout } = useDoctorAuth();

  // --- Profile (real API) ---
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
        logout(); // the route guard sends the doctor back to the OTP screen
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

  // --- Clock (greeting + "today" stay correct if the tab stays open) ---
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // --- Sample appointments (no booking table yet) ---
  const [appointments, setAppointments] = useState<DashboardAppointment[] | null>(null);
  useEffect(() => {
    if (!profile || appointments) return;
    setAppointments(
      buildSampleAppointments(new Date(), {
        clinics: profile.clinics.map((c) => ({ name: c.name, inPersonFee: c.inPersonFee })),
        videoCallFee: profile.isVideoCallEnabled ? profile.videoCallFee ?? null : null,
        textConsultFee: profile.isTextConsultEnabled ? profile.textConsultFee ?? null : null,
      }),
    );
  }, [profile, appointments]);

  const data = useMemo(() => deriveDashboard(appointments ?? [], now), [appointments, now]);

  // --- UI state ---
  const [view, setView] = useState<DashboardView>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<DashboardAppointment | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocked, setBlocked] = useState<BlockedTime[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), 6000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

  const navigate = useCallback((next: DashboardView) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const patch = useCallback((id: string, changes: Partial<DashboardAppointment>) => {
    setAppointments((prev) => prev?.map((a) => (a.id === id ? { ...a, ...changes } : a)) ?? prev);
  }, []);

  const handleAction = useCallback(
    (action: AppointmentAction, a: DashboardAppointment) => {
      const first = a.patientName.split(' ')[0];
      if (action === 'approve') {
        patch(a.id, { status: 'CONFIRMED', rescheduled: false });
        const day = relativeDay(a.scheduledAt, now);
        const when = day === 'Today' || day === 'Tomorrow' ? day.toLowerCase() : day;
        showToast(
          `Approved. ${first}'s ${modeLabel(a.serviceMode, a.clinicName, true).toLowerCase()} is confirmed for ${when}, ${formatTime(a.scheduledAt)}.`,
        );
      } else if (action === 'complete') {
        patch(a.id, { status: 'COMPLETED', completedAt: new Date().toISOString() });
        showToast(`Consultation with ${first} completed. ${pkr(a.fee)} added to your earnings.`, () =>
          patch(a.id, { status: 'CONFIRMED', completedAt: undefined }),
        );
      } else if (action === 'decline') {
        const previous: AppointmentStatus = a.status;
        patch(a.id, { status: 'DECLINED' });
        showToast(`Declined ${first}'s request.`, () => patch(a.id, { status: previous }));
      } else {
        setRescheduling(a);
      }
    },
    [patch, showToast, now],
  );

  const saveReschedule = (iso: string) => {
    if (!rescheduling) return;
    patch(rescheduling.id, { scheduledAt: iso, rescheduled: true });
    showToast(`New time proposed to ${rescheduling.patientName.split(' ')[0]}: ${formatDay(iso)}, ${formatTime(iso)}.`);
    setRescheduling(null);
  };

  const saveBlock = (block: Omit<BlockedTime, 'id'>) => {
    setBlocked((prev) =>
      [...prev, { ...block, id: `block-${Date.now()}` }].sort((x, y) =>
        `${x.date}${x.from}`.localeCompare(`${y.date}${y.from}`),
      ),
    );
    setBlockOpen(false);
    showToast(`Blocked ${formatDay(`${block.date}T00:00`)}, ${block.from} – ${block.to}.`);
  };

  const signOut = () => {
    logout();
    router.replace(DOCTOR_ROUTES.auth);
  };

  // --- Loading / error ---
  if (loading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#6b6f80]">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
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

  if (!profile || !appointments) return null;

  const displayName = doctorDisplayName(profile.fullName);
  const subtitle = profile.specialisations[0] ?? profile.title;

  let content: React.ReactNode;
  switch (view) {
    case 'appointments':
      content = (
        <AppointmentsView
          now={now}
          todaySchedule={data.todaySchedule}
          requests={data.requests}
          upcoming={data.upcoming}
          onAction={handleAction}
        />
      );
      break;
    case 'patients':
      content = <PatientsView patients={data.patients} />;
      break;
    case 'availability':
      content = (
        <AvailabilityView
          profile={profile}
          blocked={blocked}
          onBlockTime={() => setBlockOpen(true)}
          onRemoveBlock={(id) => setBlocked((prev) => prev.filter((b) => b.id !== id))}
        />
      );
      break;
    case 'earnings':
      content = <EarningsView totalEarned={data.totalEarned} completed={data.completed} week={data.week} />;
      break;
    case 'personal':
      content = <PersonalInfoView profile={profile} phone={session?.phone ?? profile.phone} />;
      break;
    case 'clinics':
      content = <ClinicsInfoView profile={profile} />;
      break;
    case 'online':
      content = <OnlineConsultationsView profile={profile} />;
      break;
    default:
      content = (
        <DashboardHome
          now={now}
          greeting={greetingFor(now)}
          doctorName={displayName}
          profileStatus={profile.status}
          todaySchedule={data.todaySchedule}
          requests={data.requests}
          totalEarned={data.totalEarned}
          patientsCount={data.patients.length}
          week={data.week}
          onAction={handleAction}
          onNavigate={navigate}
          onBlockTime={() => setBlockOpen(true)}
        />
      );
  }

  return (
    <div className="flex min-h-screen bg-[#f6f4ef] text-[#141b34]">
      <Sidebar
        active={view}
        onNavigate={navigate}
        pendingCount={data.requests.length}
        doctorName={displayName}
        doctorSubtitle={subtitle}
        onSignOut={signOut}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#e7e2d8] bg-[#f6f4ef]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-[#141b34] hover:bg-[#ece8de] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#b38a3a] text-white">
              <Stethoscope className="h-4 w-4" />
            </span>
          </span>
          <p className="text-sm font-semibold text-[#141b34]">{VIEW_TITLES[view]}</p>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[#e2d6b8] bg-[#fbf6ea] px-3 py-1 text-xs font-medium text-[#7b5d22]"
            title="Online booking isn't live yet, so appointments, requests and earnings show sample data. Your profile, clinics and fees are real."
          >
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sample appointments</span>
            <span className="sm:hidden">Sample data</span>
          </span>
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{content}</main>
      </div>

      {rescheduling && (
        <RescheduleModal
          appointment={rescheduling}
          now={now}
          onClose={() => setRescheduling(null)}
          onSave={saveReschedule}
        />
      )}
      {blockOpen && <BlockTimeModal now={now} onClose={() => setBlockOpen(false)} onSave={saveBlock} />}

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" aria-live="polite">
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl bg-[#141b34] px-4 py-3 text-sm text-white shadow-2xl"
          >
            <span className="flex-1">{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="font-semibold text-[#d8b25e] hover:text-white"
              >
                Undo
              </button>
            )}
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Dismiss"
              className="rounded p-0.5 text-white/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
