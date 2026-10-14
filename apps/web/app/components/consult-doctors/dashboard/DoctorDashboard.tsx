'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, Menu, RefreshCw, Stethoscope, X } from 'lucide-react';
import { ApiError, getDoctorMeApi, type DoctorProfile } from '@/app/lib/api/doctors';
import {
  getDoctorDashboardApi,
  rescheduleDoctorAppointmentApi,
  updateDoctorAppointmentStatusApi,
  type DoctorDashboardData,
} from '@/app/lib/api/doctor-dashboard';
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
import { DeclineModal, RescheduleModal } from './DashboardModals';
import type { AppointmentAction } from './AppointmentTable';
import {
  displayTime,
  doctorDisplayName,
  formatDay,
  greetingFor,
  pkr,
  type DashboardAppointment,
} from './dashboard-data';

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

  // --- Profile ---
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleAuthError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        logout(); // the route guard sends the doctor back to the OTP screen
        return true;
      }
      return false;
    },
    [logout],
  );

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setProfileLoading(true);
    setProfileError(null);
    try {
      const me = await getDoctorMeApi(token);
      updateDoctor({ ...me.doctorRegistration, isFormFilled: me.isFormFilled });
      if (!me.isFormFilled || !me.doctor) {
        router.replace(DOCTOR_ROUTES.form);
        return;
      }
      setProfile(me.doctor);
    } catch (err) {
      if (handleAuthError(err)) return;
      setProfileError(err instanceof ApiError ? err.messages[0] : 'Could not reach the server.');
    } finally {
      setProfileLoading(false);
    }
  }, [token, updateDoctor, router, handleAuthError]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // --- Appointments, counts and earnings (live) ---
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const d = await getDoctorDashboardApi(token);
      setData(d);
      setDataError(null);
    } catch (err) {
      if (handleAuthError(err)) return;
      setDataError(err instanceof ApiError ? err.messages[0] : 'Could not load your appointments.');
    } finally {
      setRefreshing(false);
    }
  }, [token, handleAuthError]);

  useEffect(() => {
    if (!profile) return;
    loadData();
    // New bookings show up when the doctor comes back to the tab, and every 2 minutes
    const onFocus = () => document.visibilityState === 'visible' && loadData();
    document.addEventListener('visibilitychange', onFocus);
    const t = window.setInterval(loadData, 120_000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(t);
    };
  }, [profile, loadData]);

  // --- Clock (greeting) ---
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // --- UI state ---
  const [view, setView] = useState<DashboardView>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState<DashboardAppointment | null>(null);
  const [declining, setDeclining] = useState<DashboardAppointment | null>(null);
  const [busy, setBusy] = useState<Record<string, AppointmentAction | undefined>>({});
  const [toast, setToast] = useState<{ id: number; message: string; tone: 'ok' | 'error' } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((message: string, tone: 'ok' | 'error' = 'ok') => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
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

  /** Runs an action for one row, then reloads the dashboard. */
  const runAction = useCallback(
    async (
      a: DashboardAppointment,
      action: AppointmentAction,
      task: () => Promise<unknown>,
      success: string,
      /** modals show their own error message */
      toastErrors = true,
    ) => {
      setBusy((b) => ({ ...b, [a.id]: action }));
      try {
        await task();
        showToast(success);
        await loadData();
      } catch (err) {
        if (handleAuthError(err)) return;
        if (toastErrors) showToast(err instanceof ApiError ? err.messages[0] : 'Something went wrong. Please try again.', 'error');
        // The appointment may have changed elsewhere; show its real state
        loadData();
        throw err;
      } finally {
        setBusy((b) => {
          const next = { ...b };
          delete next[a.id];
          return next;
        });
      }
    },
    [loadData, showToast, handleAuthError],
  );

  const handleAction = useCallback(
    (action: AppointmentAction, a: DashboardAppointment) => {
      if (!token) return;
      const first = a.patientName.split(' ')[0];
      const when = `${formatDay(a.appointmentDate)}, ${displayTime(a.startTime)}`;
      if (action === 'approve') {
        runAction(a, action, () => updateDoctorAppointmentStatusApi(token, a.id, 'CONFIRMED'), `Approved. ${first}'s consultation on ${when} is confirmed.`).catch(
          () => undefined,
        );
      } else if (action === 'complete') {
        runAction(
          a,
          action,
          () => updateDoctorAppointmentStatusApi(token, a.id, 'COMPLETED'),
          `Consultation with ${first} marked completed${a.paymentStatus === 'PAID' ? ` · ${pkr(a.fee)} added to earnings` : ''}.`,
        ).catch(() => undefined);
      } else if (action === 'decline') {
        setDeclining(a);
      } else {
        setRescheduling(a);
      }
    },
    [token, runAction],
  );

  const signOut = () => {
    logout();
    router.replace(DOCTOR_ROUTES.auth);
  };

  // --- Loading / error (profile) ---
  if (profileLoading && !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[#6b6f80]">
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  if (profileError && !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="text-sm text-red-600">{profileError}</p>
        <button
          type="button"
          onClick={loadProfile}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] hover:border-[#141b34]"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  if (!profile || !token) return null;

  const displayName = doctorDisplayName(profile.fullName);
  const subtitle = profile.specialisations[0] ?? profile.title;
  const dataProps = { data, error: data ? null : dataError, onRetry: loadData };

  let content: React.ReactNode;
  switch (view) {
    case 'appointments':
      content = <AppointmentsView {...dataProps} onAction={handleAction} busy={busy} />;
      break;
    case 'patients':
      content = <PatientsView {...dataProps} />;
      break;
    case 'availability':
      content = <AvailabilityView profile={profile} />;
      break;
    case 'earnings':
      content = <EarningsView {...dataProps} />;
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
          {...dataProps}
          onAction={handleAction}
          busy={busy}
          onNavigate={navigate}
        />
      );
  }

  return (
    <div className="flex min-h-screen bg-[#f6f4ef] text-[#141b34]">
      <Sidebar
        active={view}
        onNavigate={navigate}
        pendingCount={data?.metrics.pendingRequests ?? 0}
        doctorName={displayName}
        doctorSubtitle={subtitle}
        onSignOut={signOut}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
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
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#d9d3c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#141b34] transition hover:border-[#141b34] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{content}</main>
      </div>

      {rescheduling && data && (
        <RescheduleModal
          token={token}
          appointment={rescheduling}
          today={data.today}
          onClose={() => setRescheduling(null)}
          onSave={async (date, startTime) => {
            const a = rescheduling;
            await runAction(
              a,
              'reschedule',
              () => rescheduleDoctorAppointmentApi(token, a.id, date, startTime),
              `${a.patientName.split(' ')[0]}'s consultation moved to ${formatDay(date)}, ${displayTime(startTime)}.`,
              false,
            );
            setRescheduling(null);
          }}
        />
      )}

      {declining && (
        <DeclineModal
          appointment={declining}
          onClose={() => setDeclining(null)}
          onConfirm={async (reason) => {
            const a = declining;
            await runAction(
              a,
              'decline',
              () => updateDoctorAppointmentStatusApi(token, a.id, 'CANCELLED', reason || undefined),
              `Declined ${a.patientName.split(' ')[0]}'s consultation.`,
              false,
            );
            setDeclining(null);
          }}
        />
      )}

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4" aria-live="polite">
        {toast && (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-lg items-center gap-4 rounded-xl px-4 py-3 text-sm text-white shadow-2xl ${
              toast.tone === 'error' ? 'bg-[#8f2d2d]' : 'bg-[#141b34]'
            }`}
          >
            <span className="flex-1">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="Dismiss" className="rounded p-0.5 text-white/60 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
