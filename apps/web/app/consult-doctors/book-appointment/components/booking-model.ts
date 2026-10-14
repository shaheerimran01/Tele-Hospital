// Shared helpers for the booking flow.

import type { DoctorProfile, ServiceMode } from '@/app/lib/api/doctors';
import type { PaymentMethod } from '@/app/lib/api/appointments';

/** How many days the date strip shows. */
export const BOOKING_DAYS = 14;

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** One bookable service: a clinic, video call or text appointment. */
export interface ServiceOption {
  key: string;
  mode: ServiceMode;
  clinicId: string | null;
  label: string;
  detail: string | null;
  fee: number;
  workingDays: string[];
}

export function serviceOptions(doctor: DoctorProfile): ServiceOption[] {
  const days = (slots: { dayOfWeek: string }[]) =>
    WEEK_DAYS.filter((d) => slots.some((s) => s.dayOfWeek === d));

  const options: ServiceOption[] = doctor.clinics.map((c) => ({
    key: `IN_CLINIC:${c.id}`,
    mode: 'IN_CLINIC' as const,
    clinicId: c.id,
    label: doctor.clinics.length > 1 ? c.name : 'Clinic visit',
    detail: doctor.clinics.length > 1 ? c.address : `${c.name} · ${c.address}`,
    fee: c.inPersonFee,
    workingDays: days(c.schedules),
  }));
  if (doctor.isVideoCallEnabled && doctor.videoCallFee != null) {
    options.push({
      key: 'VIDEO',
      mode: 'VIDEO',
      clinicId: null,
      label: 'Video call',
      detail: 'Consult from home on a video call',
      fee: doctor.videoCallFee,
      workingDays: days(doctor.onlineAvailabilities),
    });
  }
  if (doctor.isTextConsultEnabled && doctor.textConsultFee != null) {
    options.push({
      key: 'TEXT',
      mode: 'TEXT',
      clinicId: null,
      label: 'Text appointment',
      detail: 'Chat with the doctor in writing',
      fee: doctor.textConsultFee,
      workingDays: days(doctor.onlineAvailabilities),
    });
  }
  return options;
}

/** Picks the option from the URL (?mode=&clinicId=), else the first one. */
export function initialOption(
  options: ServiceOption[],
  mode: string | null,
  clinicId: string | null,
): ServiceOption | null {
  if (options.length === 0) return null;
  const m = mode?.toUpperCase();
  return (
    (clinicId && options.find((o) => o.clinicId === clinicId)) ||
    (m && options.find((o) => o.mode === m)) ||
    options[0]
  );
}

// ---------------------------------------------------------------------------
// Dates & times
// ---------------------------------------------------------------------------

/** Local "YYYY-MM-DD" */
export const toIsoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "YYYY-MM-DD" -> local Date at midnight */
export const fromIsoDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export interface DateOption {
  iso: string;
  weekday: string;
  dayName: string;
  day: number;
  month: string;
  isToday: boolean;
}

export function upcomingDates(count = BOOKING_DAYS, from = new Date()): DateOption[] {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      iso: toIsoDate(d),
      weekday: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short' }),
      dayName: WEEK_DAYS[d.getDay()],
      day: d.getDate(),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      isToday: i === 0,
    };
  });
}

/** "09:30 AM" -> "9:30 AM" */
export const displayTime = (t: string) => t.replace(/^0(\d)/, '$1');

/** "Thu, 22 Oct" from "YYYY-MM-DD" (or an ISO date-time at UTC midnight) */
export const displayDate = (iso: string, withYear = false) =>
  fromIsoDate(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });

/** "09:30 AM" -> minutes since midnight */
export function timeToMinutes(t: string): number {
  const m = t.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3] === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
}

export type DayPart = 'Morning' | 'Afternoon' | 'Evening';

export function groupSlots(slots: { startTime: string; endTime: string }[]) {
  const groups: Record<DayPart, { startTime: string; endTime: string }[]> = {
    Morning: [],
    Afternoon: [],
    Evening: [],
  };
  for (const s of slots) {
    const m = timeToMinutes(s.startTime);
    groups[m < 12 * 60 ? 'Morning' : m < 17 * 60 ? 'Afternoon' : 'Evening'].push(s);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Money & payment
// ---------------------------------------------------------------------------

export const formatPkr = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

export type PaymentChoice = 'COD' | 'WALLET' | 'CARD';

export const PAYMENT_CHOICES: { value: PaymentChoice; label: string; hint: string }[] = [
  { value: 'COD', label: 'Pay at Clinic / Cash', hint: 'Pay the doctor at your visit' },
  { value: 'WALLET', label: 'JazzCash / Easypaisa', hint: 'Mobile wallet' },
  { value: 'CARD', label: 'Debit / Credit Card', hint: 'Visa, Mastercard, UnionPay' },
];

export function toPaymentMethod(choice: PaymentChoice, wallet: 'JAZZCASH' | 'EASYPAISA'): PaymentMethod {
  return choice === 'COD' ? 'COD' : choice === 'CARD' ? 'CARD' : wallet;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  COD: 'Pay at clinic / cash',
  JAZZCASH: 'JazzCash',
  EASYPAISA: 'Easypaisa',
  CARD: 'Debit / credit card',
};

export const MODE_LABELS: Record<ServiceMode, string> = {
  IN_CLINIC: 'In-clinic visit',
  VIDEO: 'Online video consultation',
  TEXT: 'Online text consultation',
};
