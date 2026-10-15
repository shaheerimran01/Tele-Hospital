'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppointmentActionCard from '@/app/components/notifications/AppointmentActionCard';
import {
  getPendingAppointmentActionsApi,
  type PendingAppointmentAction,
} from '@/app/lib/api/appointments';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const APPOINTMENT_NUMBER = /\bAPT-\d{6}-\d{4,6}\b/;
/** Notifications that can carry the patient's choices for an appointment */
const ACTIONABLE_TYPES = new Set(['APPOINTMENT_RESCHEDULE_PROPOSED', 'APPOINTMENT_ALTERNATIVE_DOCTOR']);

interface UserNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  orderId?: string;
  createdAt: string;
}

export default function UserNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [actions, setActions] = useState<PendingAppointmentAction[]>([]);
  /** cards the patient has just answered stay visible (with their confirmation) after the refresh */
  const [answered, setAnswered] = useState<Record<string, PendingAppointmentAction>>({});

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem('tabibistan_user') ||
        localStorage.getItem('user') ||
        localStorage.getItem('userData');
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed.user || parsed.data?.user || parsed);
      } else {
        router.push('/');
      }
    } catch {
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [res, pending] = await Promise.all([
        fetch(`${API_BASE}/user-notifications?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' }),
        getPendingAppointmentActionsApi(user.id).catch(() => [] as PendingAppointmentAction[]),
      ]);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
      setActions(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /** After the patient replies: refresh choices and mark that notification read */
  const afterReply = async (notificationId: string, action: PendingAppointmentAction) => {
    setAnswered((a) => ({ ...a, [notificationId]: action }));
    try {
      await fetch(`${API_BASE}/user-notifications/${encodeURIComponent(notificationId)}/read`, { method: 'PATCH' });
    } catch {
      // not critical
    }
    try {
      setActions(await getPendingAppointmentActionsApi(user.id));
      setNotifications((list) => list.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
    } catch {
      // the card already shows the result
    }
  };

  // Each appointment's choices go on its newest related notification only
  const actionByNotification = new Map<string, PendingAppointmentAction>();
  const placed = new Set<string>();
  for (const n of notifications) {
    if (!ACTIONABLE_TYPES.has(n.type)) continue;
    const num = n.message.match(APPOINTMENT_NUMBER)?.[0];
    if (!num || placed.has(num)) continue;
    const action = actions.find((a) => a.appointmentNum === num) ?? answered[n.id];
    if (!action) continue;
    placed.add(num);
    actionByNotification.set(n.id, action);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-500 mt-1">
              Updates about your orders and doctor appointments.
            </p>
          </div>
          <button
            onClick={loadNotifications}
            className="px-3.5 py-1.5 text-xs font-bold text-[#ff6f61] border border-[#ff6f61] rounded-lg hover:bg-red-50 transition cursor-pointer"
          >
            Refresh
          </button>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm">
            Notifications are loading...
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400 text-sm">
            There is no notification for you yet. You will be notified when there is a new notification.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition shadow-xs flex items-start justify-between gap-4 ${
                  !item.isRead ? 'bg-red-50/30 border-red-200' : 'bg-white border-gray-100'
                }`}
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🔔</span>
                    <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                    {!item.isRead && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
                        New
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed pl-6">{item.message}</p>
                  <p className="text-[10px] text-gray-400 pl-6 pt-1">
                    {new Date(item.createdAt).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {actionByNotification.has(item.id) && user?.id && (
                    <div className="pl-6">
                      <AppointmentActionCard
                        userId={user.id}
                        action={actionByNotification.get(item.id)!}
                        onChanged={() => afterReply(item.id, actionByNotification.get(item.id)!)}
                      />
                    </div>
                  )}
                </div>

                {item.orderId && (
                  <Link
                    href={`/orders/${item.orderId}`}
                    className="shrink-0 px-3 py-1.5 bg-[#ff6f61] text-white text-xs font-bold rounded-lg hover:bg-[#e85b4d] transition shadow-2xs"
                  >
                    View Order
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}