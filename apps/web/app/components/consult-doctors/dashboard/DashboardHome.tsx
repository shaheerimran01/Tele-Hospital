'use client';

import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleAlert,
  Clock,
  Hourglass,
  Lock,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import AppointmentTable, { type AppointmentAction } from './AppointmentTable';
import { plural, pkr, type DashboardAppointment, type DoctorDashboardData } from './dashboard-data';
import type { DashboardView } from './Sidebar';

/** How many requests the dashboard lists before "See all" */
const REQUEST_PREVIEW = 5;

export function SectionCard({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#efece5] px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-[#141b34]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-[#6b6f80]">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Grey placeholder rows while appointments load */
export function TableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#f1eee7]" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-6 py-5">
          <span className="h-10 w-10 shrink-0 rounded-full bg-[#efece5]" />
          <div className="flex-1 space-y-2">
            <span className="block h-3 w-1/3 rounded bg-[#efece5]" />
            <span className="block h-3 w-1/5 rounded bg-[#f4f2ec]" />
          </div>
          <span className="hidden h-6 w-24 rounded-full bg-[#f4f2ec] sm:block" />
          <span className="hidden h-8 w-40 rounded-lg bg-[#f4f2ec] md:block" />
        </div>
      ))}
    </div>
  );
}

/** Placeholder rows behind a lock message while the account is not verified */
export function LockedTable({ rows = 3 }: { rows?: number }) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none divide-y divide-[#f1eee7] opacity-60 blur-[1.5px]" aria-hidden>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-5">
            <span className="h-10 w-10 shrink-0 rounded-full bg-[#efece5]" />
            <div className="flex-1 space-y-2">
              <span className="block h-3 w-1/3 rounded bg-[#efece5]" />
              <span className="block h-3 w-1/5 rounded bg-[#f4f2ec]" />
            </div>
            <span className="hidden h-6 w-24 rounded-full bg-[#f4f2ec] sm:block" />
            <span className="hidden h-8 w-40 rounded-lg bg-[#f4f2ec] md:block" />
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/60 px-4">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#e7e2d8] bg-white px-4 py-2 text-sm font-semibold text-[#3a3f52] shadow-sm">
          <Lock className="h-4 w-4 text-[#8a6416]" /> Verification required to manage appointments.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  Icon,
  tone,
  onDetails,
  loading,
  locked,
}: {
  label: string;
  value: string;
  Icon: typeof Clock;
  tone: string;
  onDetails: () => void;
  loading: boolean;
  locked: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col rounded-2xl border border-[#e7e2d8] bg-white px-4 py-4 sm:px-5 sm:py-5 ${locked ? 'opacity-70' : ''}`}
      aria-disabled={locked || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#6b6f80]">{label}</p>
        <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading && !locked ? (
        <span className="mt-3 block h-7 w-20 animate-pulse rounded bg-[#efece5]" aria-label="Loading" />
      ) : (
        <p className="mt-2 truncate text-2xl font-semibold leading-tight tracking-tight text-[#141b34] tabular-nums sm:text-[28px]">
          {value}
        </p>
      )}
      {locked ? (
        <span className="mt-3 inline-flex cursor-not-allowed items-center gap-1 self-start text-sm font-semibold text-[#8a8d99]">
          <Lock className="h-3.5 w-3.5" /> Locked
        </span>
      ) : (
        <button
          type="button"
          onClick={onDetails}
          className="group mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-[#9a7630] hover:text-[#141b34]"
        >
          View details <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

const outlineBtn =
  'inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/25 disabled:hover:bg-white/5';

interface DashboardHomeProps {
  now: Date;
  greeting: string;
  doctorName: string;
  /** account not approved yet: everything is shown locked */
  locked: boolean;
  data: DoctorDashboardData | null;
  error: string | null;
  onRetry: () => void;
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  busy: Record<string, AppointmentAction | undefined>;
  onNavigate: (view: DashboardView) => void;
}

export default function DashboardHome({
  now,
  greeting,
  doctorName,
  locked,
  data,
  error,
  onRetry,
  onAction,
  busy,
  onNavigate,
}: DashboardHomeProps) {
  const loading = !data && !error;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  // Nothing is loaded or shown while the account is locked
  const m = locked ? undefined : data?.metrics;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#141b34] px-6 py-7 text-white sm:px-8">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#b38a3a]/25 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8c08c]">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
              {greeting}, {doctorName}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              {locked ? (
                'Dashboard features are locked until the Tabibistan Admin team approves your account.'
              ) : m ? (
                <>
                  You have {plural(m.todayAppointments, 'appointment', 'appointments')} today and{' '}
                  {plural(m.pendingRequests, 'request', 'requests')} waiting for your reply.
                </>
              ) : error ? (
                'Your appointment summary could not be loaded.'
              ) : (
                'Loading your appointments…'
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate('online')} disabled={locked} className={outlineBtn}>
              <Banknote className="h-4 w-4" /> Consultation fees
            </button>
            <button type="button" onClick={() => onNavigate('earnings')} disabled={locked} className={outlineBtn}>
              <Wallet className="h-4 w-4" /> Earnings
            </button>
          </div>
        </div>
      </section>

      {error && !locked && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f2cccc] bg-[#fdf2f2] px-5 py-4 text-sm text-[#8f2d2d]" role="alert">
          <span className="flex items-center gap-2">
            <CircleAlert className="h-4 w-4 shrink-0" /> {error}
          </span>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Today's appointments"
          value={String(m?.todayAppointments ?? 0)}
          Icon={CalendarDays}
          tone="bg-[#edf2fc] text-[#2c4f8f]"
          onDetails={() => scrollTo('todays-schedule')}
          loading={loading}
          locked={locked}
        />
        <MetricCard
          label="Pending requests"
          value={String(m?.pendingRequests ?? 0)}
          Icon={Hourglass}
          tone="bg-[#fdf4e3] text-[#8a6416]"
          onDetails={() => scrollTo('pending-requests')}
          loading={loading}
          locked={locked}
        />
        <MetricCard
          label="Total earned"
          value={pkr(m?.totalEarned ?? 0)}
          Icon={Wallet}
          tone="bg-[#eaf6ee] text-[#2f6b45]"
          onDetails={() => onNavigate('earnings')}
          loading={loading}
          locked={locked}
        />
        <MetricCard
          label="Patients"
          value={String(m?.patients ?? 0)}
          Icon={Users}
          tone="bg-[#f3eefa] text-[#5b3f8c]"
          onDetails={() => onNavigate('patients')}
          loading={loading}
          locked={locked}
        />
      </div>

      {/* Today's schedule */}
      <SectionCard
        id="todays-schedule"
        title="Today's schedule"
        subtitle={
          locked
            ? 'Locked until your account is approved'
            : data
              ? `${plural(data.todaySchedule.length, 'consultation', 'consultations')} scheduled`
              : 'Loading…'
        }
      >
        {locked ? (
          <LockedTable rows={2} />
        ) : !data ? (
          error ? null : <TableSkeleton rows={2} />
        ) : (
          <AppointmentTable
            rows={data.todaySchedule}
            today={data.today}
            onAction={onAction}
            busy={busy}
            empty={{ title: 'No consultations scheduled for today', text: 'Approved and pending bookings for today will appear here.' }}
          />
        )}
      </SectionCard>

      {/* Requests */}
      <SectionCard
        id="pending-requests"
        title="Requests waiting for you"
        subtitle={locked ? 'Locked until your account is approved' : 'Patients see your reply in their My Appointments page'}
      >
        {locked ? (
          <LockedTable rows={3} />
        ) : !data ? (
          error ? null : <TableSkeleton rows={3} />
        ) : (
          <>
            <AppointmentTable
              rows={data.requests.slice(0, REQUEST_PREVIEW)}
              today={data.today}
              onAction={onAction}
              busy={busy}
              shortMode
              empty={{ title: "You're all caught up", text: 'New consultation requests will appear here.' }}
            />
            {data.requests.length > REQUEST_PREVIEW && (
              <div className="border-t border-[#efece5] px-4 py-4 text-center sm:px-6">
                <button
                  type="button"
                  onClick={() => onNavigate('appointments')}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34]"
                >
                  See all {plural(data.requests.length, 'request', 'requests')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
