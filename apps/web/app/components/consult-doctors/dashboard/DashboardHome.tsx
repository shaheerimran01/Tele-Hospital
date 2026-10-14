'use client';

import {
  ArrowRight,
  Banknote,
  CalendarDays,
  CalendarOff,
  CircleAlert,
  Clock,
  Hourglass,
  Users,
  Wallet,
} from 'lucide-react';
import AppointmentTable, { type AppointmentAction } from './AppointmentTable';
import WeeklyOverviewChart, { type WeekPoint } from './WeeklyOverviewChart';
import { pkr, type DashboardAppointment } from './dashboard-data';
import type { DashboardView } from './Sidebar';

/** How many requests the dashboard lists before "See all" */
const REQUEST_PREVIEW = 4;

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

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
    <section id={id} className="scroll-mt-6 overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white">
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

function MetricCard({
  label,
  value,
  Icon,
  tone,
  onDetails,
}: {
  label: string;
  value: string;
  Icon: typeof Clock;
  tone: string;
  onDetails: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-[#e7e2d8] bg-white px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#6b6f80]">{label}</p>
        <span className={`hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold leading-tight tracking-tight text-[#141b34] tabular-nums sm:text-[28px]">
        {value}
      </p>
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
  doctorName: string;
  profileStatus: string;
  todaySchedule: DashboardAppointment[];
  requests: DashboardAppointment[];
  totalEarned: number;
  patientsCount: number;
  week: WeekPoint[];
  onAction: (action: AppointmentAction, a: DashboardAppointment) => void;
  onNavigate: (view: DashboardView) => void;
  onBlockTime: () => void;
  greeting: string;
}

export default function DashboardHome({
  now,
  doctorName,
  profileStatus,
  todaySchedule,
  requests,
  totalEarned,
  patientsCount,
  week,
  onAction,
  onNavigate,
  onBlockTime,
  greeting,
}: DashboardHomeProps) {
  const statusNote = STATUS_NOTE[profileStatus];
  const todayOpen = todaySchedule.filter((a) => a.status !== 'COMPLETED').length;
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6">
      {statusNote && (
        <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${statusNote.className}`}>
          <statusNote.Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{statusNote.text}</p>
        </div>
      )}

      {/* A. Welcome banner */}
      <section className="relative overflow-hidden rounded-2xl bg-[#141b34] px-6 py-7 text-white sm:px-8">
        <div
          className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-[#b38a3a]/25 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#d8c08c]">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[28px]">
              {greeting}, {doctorName}
            </h1>
            <p className="mt-2 text-sm text-white/75">
              You have {plural(todayOpen, 'appointment', 'appointments')} today and{' '}
              {plural(requests.length, 'request', 'requests')} waiting for your reply.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onBlockTime} className={outlineBtn}>
              <CalendarOff className="h-4 w-4" /> Block time
            </button>
            <button type="button" onClick={() => onNavigate('online')} className={outlineBtn}>
              <Banknote className="h-4 w-4" /> Consultation fees
            </button>
            <button type="button" onClick={() => onNavigate('earnings')} className={outlineBtn}>
              <Wallet className="h-4 w-4" /> Earnings
            </button>
          </div>
        </div>
      </section>

      {/* B. Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard
          label="Today's appointments"
          value={String(todaySchedule.length)}
          Icon={CalendarDays}
          tone="bg-[#edf2fc] text-[#2c4f8f]"
          onDetails={() => scrollTo('todays-schedule')}
        />
        <MetricCard
          label="Pending requests"
          value={String(requests.length)}
          Icon={Hourglass}
          tone="bg-[#fdf4e3] text-[#8a6416]"
          onDetails={() => scrollTo('pending-requests')}
        />
        <MetricCard
          label="Total earned"
          value={pkr(totalEarned)}
          Icon={Wallet}
          tone="bg-[#eaf6ee] text-[#2f6b45]"
          onDetails={() => onNavigate('earnings')}
        />
        <MetricCard
          label="Patients"
          value={String(patientsCount)}
          Icon={Users}
          tone="bg-[#f3eefa] text-[#5b3f8c]"
          onDetails={() => onNavigate('patients')}
        />
      </div>

      {/* C1. Today's schedule */}
      <SectionCard
        id="todays-schedule"
        title="Today's schedule"
        subtitle={`${plural(todaySchedule.length, 'consultation', 'consultations')} scheduled`}
      >
        <AppointmentTable
          rows={todaySchedule}
          now={now}
          onAction={onAction}
          empty={{ title: 'Nothing scheduled today', text: 'Approved consultations for today will appear here.' }}
        />
      </SectionCard>

      {/* C2. Requests */}
      <SectionCard
        id="pending-requests"
        title="Requests waiting for you"
        subtitle="Patients will be notified when you respond"
      >
        <AppointmentTable
          rows={requests.slice(0, REQUEST_PREVIEW)}
          now={now}
          onAction={onAction}
          shortMode
          empty={{ title: "You're all caught up", text: 'New consultation requests will appear here.' }}
        />
        {requests.length > 0 && (
          <div className="border-t border-[#efece5] px-4 py-4 text-center sm:px-6">
            <button
              type="button"
              onClick={() => onNavigate('appointments')}
              className="inline-flex items-center gap-2 rounded-lg border border-[#d9d3c6] bg-white px-4 py-2 text-sm font-semibold text-[#141b34] transition hover:border-[#141b34]"
            >
              See all {plural(requests.length, 'request', 'requests')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </SectionCard>

      {/* D. Analytics */}
      <WeeklyOverviewChart week={week} />
    </div>
  );
}
