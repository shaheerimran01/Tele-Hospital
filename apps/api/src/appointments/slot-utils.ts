// Time helpers for appointment slots.
//
// Doctor schedules are stored as "hh:mm AM/PM" strings (see normalizeTime in
// doctors/dto/register-doctor.dto.ts) and appointments keep the same format.
// Dates are plain calendar days ("YYYY-MM-DD") stored as UTC midnight.

export const SLOT_MINUTES = 30;

/** Bookings can be made up to this many days ahead. */
export const MAX_DAYS_AHEAD = 60;

/** Clinic-local time zone used to decide what "today" and "now" mean. */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Karachi';

export const WEEK_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** "09:30 AM", "9:30am", "9 PM" or "21:30" -> minutes since midnight, or null. */
export function toMinutes(value: string): number | null {
  const v = value.trim().toUpperCase().replace(/\./g, '');

  const twelve = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (twelve) {
    const h = Number(twelve[1]);
    const m = Number(twelve[2] ?? '0');
    if (h < 1 || h > 12 || m > 59) return null;
    return ((h % 12) + (twelve[3] === 'PM' ? 12 : 0)) * 60 + m;
  }

  const twentyFour = v.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const h = Number(twentyFour[1]);
    const m = Number(twentyFour[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }
  return null;
}

/** minutes since midnight -> "hh:mm AM/PM" (same format as the schedules) */
export function fromMinutes(total: number): string {
  const h24 = Math.floor(total / 60) % 24;
  const m = total % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "YYYY-MM-DD" -> Date at UTC midnight (how appointmentDate is stored). */
export function dateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** "Monday" etc. for a "YYYY-MM-DD" calendar day. */
export function dayOfWeek(value: string): (typeof WEEK_DAYS)[number] {
  return WEEK_DAYS[dateOnly(value).getUTCDay()];
}

/** Today's date ("YYYY-MM-DD") and minutes since midnight in APP_TIMEZONE. */
export function nowInAppZone(now = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Whole days from `from` to `to` (both "YYYY-MM-DD"). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dateOnly(to).getTime() - dateOnly(from).getTime()) / 86_400_000);
}

export interface Slot {
  startTime: string;
  endTime: string;
  /** minutes since midnight, used for sorting and comparisons */
  start: number;
}

/**
 * Splits schedule windows into back-to-back slots of SLOT_MINUTES. A slot must
 * fit completely inside a window. Overlapping windows produce each slot once.
 */
export function buildSlots(windows: { startTime: string; endTime: string }[]): Slot[] {
  const seen = new Map<number, Slot>();
  for (const w of windows) {
    const from = toMinutes(w.startTime);
    let to = toMinutes(w.endTime);
    if (from == null || to == null) continue;
    // A window like "06:00 PM - 12:00 AM" ends at midnight
    if (to === 0 && from > 0) to = 24 * 60;
    for (let t = from; t + SLOT_MINUTES <= to; t += SLOT_MINUTES) {
      if (!seen.has(t)) {
        seen.set(t, { start: t, startTime: fromMinutes(t), endTime: fromMinutes(t + SLOT_MINUTES) });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.start - b.start);
}
