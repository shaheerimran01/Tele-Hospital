'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleX, Hourglass, LoaderCircle, Menu, RefreshCw, Stethoscope, X } from 'lucide-react';
import { ApiError, getDoctorMeApi, type DoctorProfile } from '@/app/lib/api/doctors';
import {
  acceptPatientSlotApi,
  getDoctorDashboardApi,
  markAllDoctorNotificationsReadApi,
  markDoctorNotificationReadApi,
  rescheduleDoctorAppointmentApi,
  updateDoctorAppointmentStatusApi,
  type DoctorDashboardData,
} from '@/app/lib/api/doctor-dashboard';
import { DOCTOR_ROUTES, useDoctorAuth } from '@/app/consult-doctors/context/DoctorAuthContext';
import Sidebar, { LOCKED_VIEWS, type DashboardView } from './Sidebar';
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

/** Shown on every page of the dashboard while the account is not approved */
function AccountStatusBanner({ status }: { status: string }) {
  const rejected = status === 'REJECTED';
  return (
    <div
      role="status"
      className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 ${
        rejected ? 'border-[#f2cccc] bg-[#fdf2f2] text-[#8f2d2d]' : 'border-[#efe1bf] bg-[#fdf6e7] text-[#7a5d1a]'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          rejected ? 'bg-[#f8dede] text-[#8f2d2d]' : 'bg-[#f8e9c6] text-[#8a6416]'
        }`}
      >
        {rejected ? <CircleX className="h-5 w-5" /> : <Hourglass className="h-5 w-5" />}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">
          {rejected ? 'Account Application Rejected' : 'Account Verification Pending'}
        </p>
        <p className="mt-1 text-sm leading-relaxed opacity-90">
          {rejected
            ? 'Please contact Tabibistan Support to update your PMDC credentials. Dashboard controls and consultation features remain locked.'
            : 'Your medical profile and PMDC credentials are currently being reviewed by the Tabibistan Admin team. All dashboard controls and consultation features are temporarily locked until verification is complete.'}
        </p>
      </div>
    </div>
  );
}

/** How often a locked dashboard re-checks whether the admin has approved the account */
const STATUS_RECHECK_MS = 60_000;

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

  const locked = !!profile && profile.status !== 'APPROVED';

  useEffect(() => {
    if (!profile || locked) return;
    loadData();
    // New bookings show up when the doctor comes back to the tab, and every 2 minutes
    const onFocus = () => document.visibilityState === 'visible' && loadData();
    document.addEventListener('visibilitychange', onFocus);
    const t = window.setInterval(loadData, 120_000);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(t);
    };
  }, [profile, locked, loadData]);

  // While locked, keep checking the account status so the dashboard unlocks on its own once approved
  useEffect(() => {
    if (!locked) return;
    const onFocus = () => document.visibilityState === 'visible' && loadProfile();
    document.addEventListener('visibilitychange', onFocus);
    const t = window.setInterval(loadProfile, STATUS_RECHECK_MS);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.clearInterval(t);
    };
  }, [locked, loadProfile]);

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

  // Tell the doctor when the account has just been approved
  const previousStatus = useRef<string | null>(null);
  useEffect(() => {
    if (!profile) return;
    if (previousStatus.current && previousStatus.current !== 'APPROVED' && profile.status === 'APPROVED') {
      showToast('Your account has been verified. All dashboard features are now unlocked.');
    }
    previousStatus.current = profile.status;
  }, [profile, showToast]);

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
        // 403: the account is no longer approved; re-check so the dashboard locks
        if (err instanceof ApiError && err.status === 403) loadProfile();
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
    [loadData, loadProfile, showToast, handleAuthError],
  );

  const handleAction = useCallback(
    (action: AppointmentAction, a: DashboardAppointment) => {
      if (!token || locked) return;
      const first = a.patientName.split(' ')[0];
      const when = `${formatDay(a.appointmentDate)}, ${displayTime(a.startTime)}`;
      if (action === 'accept-slot') {
        runAction(
          a,
          action,
          () => acceptPatientSlotApi(token, a.id),
          `Time accepted. ${first}'s consultation on ${when} is confirmed and the patient has been notified.`,
        ).catch(() => undefined);
      } else if (action === 'approve') {
        runAction(a, action, () => updateDoctorAppointmentStatusApi(token, a.id, 'CONFIRMED'), `Approved. ${first}'s consultation on ${when} is confirmed and the patient has been notified.`).catch(
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
    [token, locked, runAction],
  );

  const markNotificationRead = useCallback(
    async (id: string) => {
      if (!token) return;
      setData((d) =>
        d?.notifications
          ? {
              ...d,
              notifications: {
                items: d.notifications.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
                unread: Math.max(0, d.notifications.unread - 1),
              },
            }
          : d,
      );
      try {
        await markDoctorNotificationReadApi(token, id);
      } catch (err) {
        if (!handleAuthError(err)) loadData();
      }
    },
    [token, handleAuthError, loadData],
  );

  const markAllNotificationsRead = useCallback(async () => {
    if (!token) return;
    try {
      await markAllDoctorNotificationsReadApi(token);
    } catch (err) {
      if (handleAuthError(err)) return;
      showToast(err instanceof ApiError ? err.messages[0] : 'Could not update notifications.', 'error');
    }
    loadData();
  }, [token, handleAuthError, loadData, showToast]);

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

  // A locked account can only open the dashboard home and its profile pages
  const currentView: DashboardView = locked && LOCKED_VIEWS.has(view) ? 'dashboard' : view;

  let content: React.ReactNode;
  switch (currentView) {
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
          locked={locked}
          {...dataProps}
          onMarkNotificationRead={markNotificationRead}
          onMarkAllNotificationsRead={markAllNotificationsRead}
          onAction={handleAction}
          busy={busy}
          onNavigate={navigate}
        />
      );
  }

  return (
    <div className="flex min-h-screen bg-[#f6f4ef] text-[#141b34]">
      <Sidebar
        active={currentView}
        onNavigate={navigate}
        locked={locked}
        pendingCount={locked ? 0 : data?.metrics.pendingRequests ?? 0}
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
          <p className="text-sm font-semibold text-[#141b34]">{VIEW_TITLES[currentView]}</p>
          {locked && (
            <span
              className={`hidden rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${
                profile.status === 'REJECTED' ? 'bg-[#fdf2f2] text-[#8f2d2d]' : 'bg-[#fdf6e7] text-[#8a6416]'
              }`}
            >
              {profile.status === 'REJECTED' ? 'Application rejected' : 'Verification pending'}
            </span>
          )}
          {locked ? (
            <button
              type="button"
              onClick={loadProfile}
              disabled={profileLoading}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#d9d3c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#141b34] transition hover:border-[#141b34] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${profileLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{profileLoading ? 'Checking…' : 'Check status'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[#d9d3c6] bg-white px-3 py-1.5 text-xs font-semibold text-[#141b34] transition hover:border-[#141b34] disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {locked && <AccountStatusBanner status={profile.status} />}
          {content}
        </main>
      </div>

      {rescheduling && data && !locked && (
        <RescheduleModal
          token={token}
          appointment={rescheduling}
          today={data.today}
          onClose={() => setRescheduling(null)}
          onSave={async (date, startTime, reason) => {
            const a = rescheduling;
            await runAction(
              a,
              'reschedule',
              () => rescheduleDoctorAppointmentApi(token, a.id, date, startTime, reason),
              `${a.patientName.split(' ')[0]}'s consultation moved to ${formatDay(date)}, ${displayTime(startTime)}. The Tabibistan team has been notified.`,
              false,
            );
            setRescheduling(null);
          }}
        />
      )}

      {declining && !locked && (
        <DeclineModal
          appointment={declining}
          onClose={() => setDeclining(null)}
          onConfirm={async (reason) => {
            const a = declining;
            await runAction(
              a,
              'decline',
              () => updateDoctorAppointmentStatusApi(token, a.id, 'CANCELLED', reason),
              `Declined ${a.patientName.split(' ')[0]}'s consultation. The Tabibistan team has been notified.`,
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
