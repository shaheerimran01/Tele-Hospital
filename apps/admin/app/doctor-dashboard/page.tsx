'use client';

import Link from 'next/link';
import { CalendarDays, Hourglass, Stethoscope, Users } from 'lucide-react';
import { fetchOverview } from '@/lib/api/doctorPortal';
import { usePortalData } from './_components/portal-context';
import AppointmentsTable from './_components/AppointmentsTable';
import { notificationHref, notificationTypeUi } from './_components/NotificationItem';
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, Table, timeAgo } from './_components/ui';

const viewAll = 'inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline';

export default function DoctorAdminOverviewPage() {
  const { data, error, loading, reload } = usePortalData(fetchOverview, []);

  if (!data) {
    return (
      <>
        <PageHeader title="Doctor Admin Dashboard" subtitle="Patients, doctors and appointments at a glance." />
        <Card padded={false}>{error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading dashboard…" />}</Card>
      </>
    );
  }

  const m = data.metrics;
  const cards = [
    { label: 'Total Patients', value: m.totalPatients, note: 'Registered user accounts', Icon: Users, tone: 'bg-blue-50 text-blue-600', href: '/doctor-dashboard/patients' },
    {
      label: 'Total Doctors',
      value: m.totalDoctors,
      note: m.pendingDoctors ? `${m.pendingDoctors} awaiting approval` : 'All profiles reviewed',
      Icon: Stethoscope,
      tone: 'bg-teal-50 text-teal-600',
      href: '/doctor-dashboard/doctors',
    },
    { label: 'Total Appointments', value: m.totalAppointments, note: 'All bookings', Icon: CalendarDays, tone: 'bg-violet-50 text-violet-600', href: '/doctor-dashboard/appointments' },
    {
      label: 'Pending Appointments',
      value: m.pendingAppointments,
      note: 'Waiting for confirmation',
      Icon: Hourglass,
      tone: 'bg-amber-50 text-amber-600',
      href: '/doctor-dashboard/appointments?status=PENDING',
    },
  ];

  return (
    <>
      <PageHeader
        title="Doctor Admin Dashboard"
        subtitle="Patients, doctors and appointments at a glance."
        action={loading ? <span className="text-xs text-slate-400">Updating…</span> : null}
      />

      <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">{c.label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.tone}`}>
                <c.Icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{c.value.toLocaleString('en-PK')}</p>
            <p className="mt-1 text-xs text-slate-500">{c.note}</p>
          </Link>
        ))}
      </section>

      <div className="mt-6 space-y-6">
        <Card
          title="Recent Appointments"
          subtitle="Latest bookings across all doctors"
          action={<Link href="/doctor-dashboard/appointments" className={viewAll}>View All Appointments ➔</Link>}
          padded={false}
        >
          <AppointmentsTable rows={data.recentAppointments} />
        </Card>

        <Card
          title="Recent Notifications"
          subtitle="Doctor registrations and appointment activity"
          action={<Link href="/doctor-dashboard/notifications" className={viewAll}>View All Notifications ➔</Link>}
          padded={false}
        >
          {data.recentNotifications.length === 0 ? (
            <EmptyState title="No activity yet" text="Doctor registrations and new bookings will show up here." />
          ) : (
            <Table head={['Title', 'Message', 'Type', 'Time Ago']}>
              {data.recentNotifications.map((n) => {
                const ui = notificationTypeUi(n.type);
                const href = notificationHref(n);
                return (
                  <tr key={n.id} className="align-middle hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 font-medium text-slate-900">
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="Unread" />}
                        {href ? (
                          <Link href={href} className="hover:text-blue-700">
                            {n.title}
                          </Link>
                        ) : (
                          n.title
                        )}
                      </span>
                    </td>
                    <td className="max-w-[420px] px-5 py-3.5 text-slate-600">
                      <span className="line-clamp-2">{n.message}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${ui.tone}`}>
                        <ui.Icon className="h-3.5 w-3.5" /> {ui.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">{timeAgo(n.createdAt)}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
