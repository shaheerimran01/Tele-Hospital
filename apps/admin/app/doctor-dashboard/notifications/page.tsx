'use client';

import { useState } from 'react';
import { CheckCheck, LoaderCircle } from 'lucide-react';
import {
  fetchPortalNotifications,
  markAllPortalNotificationsRead,
  markPortalNotificationRead,
  type NotificationFilter,
  type PortalNotification,
} from '@/lib/api/doctorPortal';
import { usePortal, usePortalData } from '../_components/portal-context';
import NotificationItem from '../_components/NotificationItem';
import { Card, EmptyState, ErrorState, FilterTabs, LoadingState, PageHeader } from '../_components/ui';

const TABS: { value: NotificationFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNREAD', label: 'Unread' },
  { value: 'READ', label: 'Read' },
  { value: 'DOCTORS', label: 'Doctors' },
  { value: 'APPOINTMENTS', label: 'Appointments' },
];

const EMPTY_TEXT: Record<NotificationFilter, string> = {
  ALL: 'Doctor registrations, status changes and bookings will appear here.',
  UNREAD: "You're all caught up.",
  READ: 'Notifications you have read will appear here.',
  DOCTORS: 'New doctor registrations and approval changes will appear here.',
  APPOINTMENTS: 'New bookings and appointment updates will appear here.',
};

export default function NotificationsPage() {
  const { reloadCounts } = usePortal();
  const [filter, setFilter] = useState<NotificationFilter>('ALL');
  const { data, setData, error, loading, reload } = usePortalData(() => fetchPortalNotifications(filter), [filter]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const markRead = async (n: PortalNotification) => {
    setBusyId(n.id);
    setActionError(null);
    try {
      await markPortalNotificationRead(n.id);
      setData((prev) =>
        prev
          ? {
              notifications:
                filter === 'UNREAD'
                  ? prev.notifications.filter((x) => x.id !== n.id)
                  : prev.notifications.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
              counts: { ...prev.counts, UNREAD: Math.max(0, prev.counts.UNREAD - 1), READ: prev.counts.READ + 1 },
            }
          : prev,
      );
      reloadCounts();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update the notification.');
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllPortalNotificationsRead();
      reload();
      reloadCounts();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not mark notifications as read.');
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = data?.counts.UNREAD ?? 0;

  return (
    <>
      <PageHeader
        title="Notifications"
        subtitle="Manage doctor registrations, appointment updates, and system alerts."
        action={
          <button
            type="button"
            onClick={markAll}
            disabled={markingAll || unread === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
            Mark all as read
          </button>
        }
      />

      <div className="mb-4">
        <FilterTabs
          label="Filter notifications"
          tabs={TABS.map((t) => ({ ...t, count: data?.counts[t.value] }))}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {actionError && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700" role="alert">
          {actionError}
        </p>
      )}

      {!data || (loading && data.notifications.length === 0) ? (
        <Card padded={false}>{error ? <ErrorState message={error} onRetry={reload} /> : <LoadingState text="Loading notifications…" />}</Card>
      ) : error ? (
        <Card padded={false}>
          <ErrorState message={error} onRetry={reload} />
        </Card>
      ) : data.notifications.length === 0 ? (
        <Card padded={false}>
          <EmptyState title="No notifications" text={EMPTY_TEXT[filter]} />
        </Card>
      ) : (
        <ul className={`space-y-3 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {data.notifications.map((n) => (
            <NotificationItem key={n.id} n={n} onMarkRead={markRead} busy={busyId === n.id} />
          ))}
        </ul>
      )}
    </>
  );
}
