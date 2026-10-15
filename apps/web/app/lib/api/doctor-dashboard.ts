// apps/web/app/lib/api/doctor-dashboard.ts
// Doctor-only dashboard API (/doctors/me/*). Uses the doctor login token, never the patient login.

import { ApiError, type ServiceMode } from './doctors';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type DoctorAction = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

/** One appointment as the doctor sees it. */
export interface DoctorAppointment {
  id: string;
  appointmentNum: string;
  status: AppointmentStatus;
  serviceMode: ServiceMode;
  /** ISO date at UTC midnight, e.g. "2026-10-22T00:00:00.000Z" */
  appointmentDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  cancelReason: string | null;
  patientType: 'SELF' | 'FAMILY_MEMBER';
  patientName: string;
  patientPhone: string | null;
  familyMember: { fullName: string; relation: string; gender: string; age: number | null } | null;
  bookedBy: string | null;
  clinic: { name: string; address: string } | null;
  symptoms: string[];
  symptomDuration: string | null;
  description: string | null;
  /** the patient asked for this time; the doctor can "Accept Slot" */
  patientRequestedSlot?: boolean;
}

/** An update from a patient, shown on the doctor's dashboard */
export interface DoctorNotificationItem {
  id: string;
  /** RESCHEDULE_APPROVED | NEW_SLOT_REQUESTED | RESCHEDULE_DECLINED | ... */
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  appointmentId: string | null;
}

export interface DoctorDashboardData {
  /** today's date in the clinic time zone, "YYYY-MM-DD" */
  today: string;
  metrics: {
    todayAppointments: number;
    pendingRequests: number;
    totalEarned: number;
    patients: number;
  };
  todaySchedule: DoctorAppointment[];
  requests: DoctorAppointment[];
  upcoming: DoctorAppointment[];
  completed: DoctorAppointment[];
  notifications?: { items: DoctorNotificationItem[]; unread: number };
  earnings: { serviceMode: ServiceMode; paymentStatus: PaymentStatus; count: number; total: number }[];
  patients: {
    userId: string;
    name: string;
    phone: string | null;
    appointments: number;
    lastAppointmentDate: string | null;
  }[];
}

export interface RescheduleSlots {
  date: string;
  dayOfWeek: string;
  workingDays: string[];
  slots: { startTime: string; endTime: string }[];
}

async function call<T>(token: string, path: string, init: RequestInit = {}, fallback = 'Something went wrong.'): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/doctors/me${path}`, {
      cache: 'no-store',
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new ApiError(['Could not reach the server. Check your connection and try again.'], 0);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const raw = data?.message;
    throw new ApiError(Array.isArray(raw) ? raw : raw ? [String(raw)] : [fallback], response.status);
  }
  return response.json();
}

export const getDoctorDashboardApi = (token: string) =>
  call<DoctorDashboardData>(token, '/dashboard', {}, 'Could not load your appointments.');

export const updateDoctorAppointmentStatusApi = (token: string, id: string, status: DoctorAction, reason?: string) =>
  call<DoctorAppointment>(
    token,
    `/appointments/${encodeURIComponent(id)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status, ...(reason ? { reason } : {}) }) },
    'Could not update the appointment.',
  );

export const getRescheduleSlotsApi = (token: string, id: string, date: string) =>
  call<RescheduleSlots>(
    token,
    `/appointments/${encodeURIComponent(id)}/slots?date=${encodeURIComponent(date)}`,
    {},
    'Could not load free times.',
  );

export const rescheduleDoctorAppointmentApi = (token: string, id: string, date: string, startTime: string, reason: string) =>
  call<DoctorAppointment>(
    token,
    `/appointments/${encodeURIComponent(id)}/reschedule`,
    { method: 'PATCH', body: JSON.stringify({ date, startTime, reason }) },
    'Could not reschedule the appointment.',
  );

export const acceptPatientSlotApi = (token: string, id: string) =>
  call<DoctorAppointment>(
    token,
    `/appointments/${encodeURIComponent(id)}/accept-slot`,
    { method: 'PATCH' },
    'Could not accept the requested time.',
  );

export const markDoctorNotificationReadApi = (token: string, id: string) =>
  call<{ id: string; isRead: boolean }>(token, `/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });

export const markAllDoctorNotificationsReadApi = (token: string) =>
  call<{ updated: number }>(token, '/notifications/read-all', { method: 'PATCH' });
