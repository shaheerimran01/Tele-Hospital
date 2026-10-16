'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Building2,
  CalendarDays,
  ChevronRight,
  LayoutDashboard,
  Menu,
  RefreshCw,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { PortalProvider, usePortal } from './portal-context';

const NAV = [
  { href: '/doctor-dashboard', label: 'Dashboard', Icon: LayoutDashboard, exact: true },
  { href: '/doctor-dashboard/notifications', label: 'Notifications', Icon: Bell, badge: 'notifications' as const },
  { href: '/doctor-dashboard/patients', label: 'Patients', Icon: Users },
  { href: '/doctor-dashboard/appointments', label: 'Appointments', Icon: CalendarDays, badge: 'appointments' as const },
  { href: '/doctor-dashboard/doctors', label: 'Doctors', Icon: Stethoscope, badge: 'doctors' as const },
  { href: '/hospitals', label: 'Hospitals', Icon: Building2 },
];

const SECTION_LABELS: Record<string, string> = {
  notifications: 'Notifications',
  patients: 'Patients',
  appointments: 'Appointments',
  doctors: 'Doctors',
};

function Breadcrumb({ pathname }: { pathname: string }) {
  // The hospitals directory lives at /hospitals but shares this portal's shell
  if (pathname === '/hospitals' || pathname.startsWith('/hospitals/')) {
    return (
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
        <Link href="/doctor-dashboard" className="truncate text-slate-500 hover:text-slate-900">
          Doctor Admin
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="truncate font-semibold text-slate-900">Hospitals</span>
      </nav>
    );
  }
  const parts = pathname.replace(/^\/doctor-dashboard\/?/, '').split('/').filter(Boolean);
  const crumbs = [{ href: '/doctor-dashboard', label: 'Doctor Admin' }];
  if (parts[0]) crumbs.push({ href: `/doctor-dashboard/${parts[0]}`, label: SECTION_LABELS[parts[0]] ?? parts[0] });
  if (parts[1]) {
    const detail = { doctors: 'Doctor Profile', patients: 'Patient Profile', appointments: 'Appointment Details' }[parts[0]] ?? 'Details';
    crumbs.push({ href: pathname, label: detail });
  }
  if (!parts[0]) crumbs.push({ href: '/doctor-dashboard', label: 'Overview' });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.href}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            {last ? (
              <span className="truncate font-semibold text-slate-900">{c.label}</span>
            ) : (
              <Link href={c.href} className="truncate text-slate-500 hover:text-slate-900">
                {c.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function SidebarContent({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const { counts } = usePortal();
  const badgeValue = (b?: 'notifications' | 'appointments' | 'doctors') =>
    !counts || !b
      ? 0
      : b === 'notifications'
        ? counts.unreadNotifications
        : b === 'appointments'
          ? counts.pendingAppointments
          : counts.pendingDoctors;
  const badgeTone = { notifications: 'bg-rose-500', appointments: 'bg-amber-500', doctors: 'bg-amber-500' };
  const badgeTitle = {
    notifications: 'unread notifications',
    appointments: 'pending appointments',
    doctors: 'doctors awaiting approval',
  };

  return (
    <div className="flex h-full flex-col bg-[#0F172A] text-white">
      <div className="px-6 pb-6 pt-6">
        <p className="flex items-center gap-2 text-xl font-bold tracking-wide">
          <span className="text-2xl font-black">+</span> Tabibistan
        </p>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal-400/10 px-2 py-1 text-xs font-semibold text-teal-300 ring-1 ring-inset ring-teal-400/20">
          <Stethoscope className="h-3.5 w-3.5" /> Doctor Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-4" aria-label="Doctor admin">
        {NAV.map(({ href, label, Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          const value = badgeValue(badge);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm transition ${
                active ? 'bg-[#1E293B] font-medium text-white' : 'text-slate-300 hover:bg-[#1E293B]/60 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className={`h-5 w-5 ${active ? 'text-teal-300' : ''}`} />
                {label}
              </span>
              {badge && value > 0 && (
                <span
                  className={`${badgeTone[badge]} rounded-full px-2 py-0.5 text-xs font-semibold text-white`}
                  title={`${value} ${badgeTitle[badge]}`}
                >
                  {value > 99 ? '99+' : value}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-400">Doctor &amp; appointment management</div>
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/doctor-dashboard';
  const { refresh } = usePortal();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => setDrawerOpen(false), [pathname]);

  const onRefresh = () => {
    refresh();
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  };

  return (
    <div className="flex min-h-screen w-full bg-[#F8FAFC] font-sans text-slate-800">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 z-10 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <Breadcrumb pathname={pathname} />
          </div>
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Admin Gateway
          </Link>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </header>

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <PortalProvider>
      <ShellInner>{children}</ShellInner>
    </PortalProvider>
  );
}
