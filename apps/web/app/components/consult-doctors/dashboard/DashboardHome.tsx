'use client';

import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CircleAlert,
  Clock,
  Hourglass,
  RefreshCw,
  Users,
  Wallet,
} from 'lucide-react';
import AppointmentTable, { type AppointmentAction } from './AppointmentTable';
import { plural, pkr, type DashboardAppointment, type DoctorDashboardData } from './dashboard-data';
import type { DashboardView } from './Sidebar';

/** How many requests the dashboard lists before "See all" */
const REQUEST_PREVIEW = 5;

const STATUS_NOTE: Record<string, { text: string; className: string; Icon: typeof Clock } | undefined> = {
  PENDING: {
    text: 'Your profile is under review. Patients can book you once our team has verified your PMDC details.',
    className: 'border-[#efe1bf] bg-[#fdf6e7] text-[#7a5d1a]',
    Icon: Clock,
  },
  REJECTED: {
    text: 'Your profile was not approved. Please contact Tabibistan support so we can help you fix the details.',
    className: 'border-[#f2cccc] bg-[#fdf2f2] text-[#8f2d2d]',
    Icon: CircleAlert,
  },
};

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

function MetricCard({
  label,
  value,
  Icon,
  tone,
  onDetails,
  loading,
}: {
  label: string;
  value: string;
  Icon: typeof Clock;
  tone: string;
  onDetails: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-[#e7e2d8] bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#6b6f80]">{label}</p>
        <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      {loading ? (
        <span className="mt-3 block h-7 w-20 animate-pulse rounded bg-[#efece5]" aria-label="Loading" />
      ) : (
        <p className="mt-2 truncate text-2xl font-semibold leading-tight tracking-tight text-[#141b34] tabular-nums sm:text-[28px]">
          {value}
        </p>
      )}
      <button
        type="button"
        onClick={onDetails}
        className="group mt-3 inline-flex items-center gap-1 self-start text-sm font-semibold text-[#9a7630] hover:text-[#141b34]"
      >
        View details <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

const outlineBtn =
  'inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10';

interface DashboardHomeProps {
  now: Date;
  greeting: string;
  doctorName: string;
  profileStatus: string;
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
  profileStatus,
  data,
  error,
  onRetry,
  onAction,
  busy,
  onNavigate,
}: DashboardHomeProps) {
  const statusNote = STATUS_NOTE[profileStatus];
  const loading = !data && !error;
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const m = data?.metrics;

  return (
    <div className="space-y-6">
      {statusNote && (
        <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${statusNote.className}`}>
          <statusNote.Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{statusNote.text}</p>
        </div>
      )}

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
              {m ? (
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
            <button type="button" onClick={() => onNavigate('online')} className={outlineBtn}>
              <Banknote className="h-4 w-4" /> Consultation fees
            </button>
            <button type="button" onClick={() => onNavigate('earnings')} className={outlineBtn}>
              <Wallet className="h-4 w-4" /> Earnings
            </button>
          </div>
        </div>
      </section>

      {error && (
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
        />
        <MetricCard
          label="Pending requests"
          value={String(m?.pendingRequests ?? 0)}
          Icon={Hourglass}
          tone="bg-[#fdf4e3] text-[#8a6416]"
          onDetails={() => scrollTo('pending-requests')}
          loading={loading}
        />
        <MetricCard
          label="Total earned"
          value={pkr(m?.totalEarned ?? 0)}
          Icon={Wallet}
          tone="bg-[#eaf6ee] text-[#2f6b45]"
          onDetails={() => onNavigate('earnings')}
          loading={loading}
        />
        <MetricCard
          label="Patients"
          value={String(m?.patients ?? 0)}
          Icon={Users}
          tone="bg-[#f3eefa] text-[#5b3f8c]"
          onDetails={() => onNavigate('patients')}
          loading={loading}
        />
      </div>

      {/* Today's schedule */}
      <SectionCard
        id="todays-schedule"
        title="Today's schedule"
        subtitle={data ? `${plural(data.todaySchedule.length, 'consultation', 'consultations')} scheduled` : 'Loading…'}
      >
        {!data ? (
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
      <SectionCard id="pending-requests" title="Requests waiting for you" subtitle="Patients see your reply in their My Appointments page">
        {!data ? (
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
